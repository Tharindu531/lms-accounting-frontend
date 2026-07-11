import { useState, useEffect, useRef, useCallback } from 'react';
import { lessonAPI, fileAPI } from '../services/api';
import { BookOpen, Play, CheckCircle, AlertTriangle, FileText, Video, Paperclip, Image, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import FileViewer from '../components/FileViewer';

const Lessons = () => {
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [expandedUnits, setExpandedUnits] = useState({});
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const selectedLessonRef = useRef(null);

  // Keep ref in sync with selectedLesson for use in YouTube callback
  useEffect(() => {
    selectedLessonRef.current = selectedLesson;
  }, [selectedLesson]);

  useEffect(() => {
    fetchLessons();
    loadYouTubeAPI();
  }, []);

  const fetchLessons = async () => {
    try {
      const response = await lessonAPI.getAll();
      const data = response.data.data || [];
      setLessons(data);
      // Expand all units by default
      const units = {};
      data.forEach(l => {
        const key = l.unitName || '__general__';
        units[key] = true;
      });
      setExpandedUnits(units);
    } catch (err) {
      setError('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const loadYouTubeAPI = () => {
    if (window.YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?/\s]{11})/);
    return match ? match[1] : null;
  };

  const handleLessonComplete = useCallback(async (lessonId) => {
    try {
      await lessonAPI.updateProgress(lessonId, { completed: true, watchedSeconds: 0 });
      setLessons(prev => prev.map(l =>
        l.id === lessonId ? { ...l, completed: true } : l
      ));
      setSelectedLesson(prev => prev?.id === lessonId ? { ...prev, completed: true } : prev);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  }, []);

  // Initialize or update YouTube player when selected lesson changes
  useEffect(() => {
    if (!selectedLesson?.youtubeLink) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      return;
    }

    const videoId = getYouTubeVideoId(selectedLesson.youtubeLink);
    if (!videoId) return;

    const createPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
        },
        events: {
          // Pings the backend once the player has actually loaded, so it has a real
          // "started watching" timestamp to compare against when the video ends.
          // Without this, the completion ping below would be the first progress
          // record ever created for the lesson, and the backend now treats a
          // completion claim with no prior progress record as suspicious.
          onReady: () => {
            const lesson = selectedLessonRef.current;
            if (lesson && !lesson.completed && lesson.youtubeLink) {
              lessonAPI.updateProgress(lesson.id, { completed: false, watchedSeconds: 0 }).catch(() => {});
            }
          },
          onStateChange: (event) => {
            // YT.PlayerState.ENDED === 0
            if (event.data === 0) {
              const lesson = selectedLessonRef.current;
              if (lesson && !lesson.completed && lesson.youtubeLink) {
                handleLessonComplete(lesson.id);
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [selectedLesson?.id, selectedLesson?.youtubeLink, handleLessonComplete]);

  const selectLesson = async (lesson) => {
    if (lesson.locked) {
      setSelectedLesson(lesson);
      setAttachments([]);
      return;
    }
    setSelectedLesson(lesson);
    try {
      const response = await fileAPI.getLessonAttachments(lesson.id);
      setAttachments(response.data.data || []);
    } catch {
      setAttachments([]);
    }
  };

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const getLessonTypeIcon = (lesson) => {
    if (lesson.lessonType === 'VIDEO') return <Video size={16} className="text-red-500" />;
    if (lesson.lessonType === 'TEXT') return <FileText size={16} className="text-blue-500" />;
    return <BookOpen size={16} className="text-purple-500" />;
  };

  const toggleUnit = (unitKey) => {
    setExpandedUnits(prev => ({ ...prev, [unitKey]: !prev[unitKey] }));
  };

  // Group lessons by unit
  const groupedLessons = lessons.reduce((groups, lesson) => {
    const key = lesson.unitName || '__general__';
    if (!groups[key]) {
      groups[key] = { unitId: lesson.unitId, lessons: [] };
    }
    groups[key].lessons.push(lesson);
    return groups;
  }, {});

  // Sort unit groups: units with IDs first (by unitId), "General" last
  const sortedUnitKeys = Object.keys(groupedLessons).sort((a, b) => {
    if (a === '__general__') return 1;
    if (b === '__general__') return -1;
    return (groupedLessons[a].unitId || 0) - (groupedLessons[b].unitId || 0);
  });

  const hasVideoContent = selectedLesson?.youtubeLink;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center gap-4">
        <AlertTriangle className="text-amber-600 flex-shrink-0" size={32} />
        <div>
          <h2 className="text-lg font-semibold text-amber-800">Access Restricted</h2>
          <p className="text-amber-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Lessons</h1>

      {lessons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Lessons Available</h2>
          <p className="text-gray-500">Check back later for new content.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lessons List - Grouped by Unit */}
          <div className="lg:col-span-1 space-y-2">
            {sortedUnitKeys.map((unitKey) => {
              const group = groupedLessons[unitKey];
              const isExpanded = expandedUnits[unitKey] !== false;
              const displayName = unitKey === '__general__' ? 'General' : unitKey;
              const completedCount = group.lessons.filter(l => l.completed).length;

              return (
                <div key={unitKey} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Unit Header */}
                  <button
                    onClick={() => toggleUnit(unitKey)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-500" />
                      )}
                      <span className="font-semibold text-gray-800 text-sm">{displayName}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {completedCount}/{group.lessons.length}
                    </span>
                  </button>

                  {/* Lessons in this Unit */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {group.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          onClick={() => selectLesson(lesson)}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition hover:bg-gray-50 border-b border-gray-50 last:border-b-0 ${
                            selectedLesson?.id === lesson.id ? 'bg-indigo-50 border-l-3 border-l-indigo-500' : ''
                          } ${lesson.locked ? 'opacity-60' : ''}`}
                        >
                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                            lesson.locked ? 'bg-amber-100' : lesson.completed ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {lesson.locked ? (
                              <Lock className="text-amber-600" size={16} />
                            ) : lesson.completed ? (
                              <CheckCircle className="text-green-600" size={16} />
                            ) : (
                              getLessonTypeIcon(lesson)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-800 truncate">{lesson.lessonName}</h3>
                            <p className="text-xs text-gray-500 truncate">
                              {lesson.locked
                                ? `Requires payment for ${MONTH_NAMES[(lesson.month || 1) - 1]}`
                                : lesson.lessonDescription}
                            </p>
                          </div>
                          {!lesson.locked && lesson.completed && (
                            <CheckCircle className="text-green-500 flex-shrink-0" size={16} />
                          )}
                          {lesson.locked && (
                            <Lock className="text-amber-400 flex-shrink-0" size={14} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lesson Content */}
          <div className="lg:col-span-2">
            {selectedLesson?.locked ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Lock className="mx-auto text-amber-400 mb-4" size={48} />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">{selectedLesson.lessonName}</h2>
                <p className="text-gray-500">
                  This lesson requires payment for{' '}
                  <span className="font-semibold text-amber-600">
                    {MONTH_NAMES[(selectedLesson.month || 1) - 1]}
                  </span>.
                </p>
                <p className="text-sm text-gray-400 mt-2">Please complete your payment to access this content.</p>
              </div>
            ) : selectedLesson ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Video Section - YouTube IFrame Player API */}
                {hasVideoContent && (
                  <div className="youtube-container" ref={playerContainerRef}>
                    <div id="yt-player"></div>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {selectedLesson.lessonName}
                    </h2>
                    {selectedLesson.completed ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={20} />
                        Completed
                      </span>
                    ) : !hasVideoContent ? (
                      <button
                        onClick={() => handleLessonComplete(selectedLesson.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        Mark as Complete
                      </button>
                    ) : null}
                  </div>

                  <p className="text-gray-600 mb-4">{selectedLesson.lessonDescription}</p>

                  {/* Text Content */}
                  {selectedLesson.content && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <FileText size={16} /> Lesson Content
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {selectedLesson.content}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <Paperclip size={16} /> Study Materials
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {attachments.map(file => (
                          <button
                            key={file.id}
                            onClick={() => setViewingFile(file)}
                            className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-indigo-500 hover:shadow-sm transition text-left"
                          >
                            {file.fileType === 'IMAGE' && <Image size={20} className="text-green-600 flex-shrink-0" />}
                            {file.fileType === 'PDF' && <FileText size={20} className="text-red-600 flex-shrink-0" />}
                            {file.fileType === 'PRESENTATION' && <Paperclip size={20} className="text-orange-600 flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {file.originalFileName}
                              </p>
                              <p className="text-xs text-gray-500">{file.fileType}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Play className="mx-auto text-gray-300 mb-4" size={48} />
                <h2 className="text-xl font-semibold text-gray-600 mb-2">Select a Lesson</h2>
                <p className="text-gray-500">Choose a lesson from the list to start learning</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      )}
    </div>
  );
};

export default Lessons;
