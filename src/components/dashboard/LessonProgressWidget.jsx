import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, CheckCircle, Clock } from 'lucide-react';

const LessonProgressWidget = ({ data, loading }) => {
  const [expandedLesson, setExpandedLesson] = useState(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lesson Progress</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen className="text-green-500" size={24} />
          Lesson Progress
        </h3>
        <div className="text-center py-8 text-gray-500">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No lesson progress data found</p>
        </div>
      </div>
    );
  }

  const toggleExpand = (lessonId) => {
    setExpandedLesson(expandedLesson === lessonId ? null : lessonId);
  };

  const formatWatchTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <BookOpen className="text-green-500" size={24} />
        Lesson Progress
      </h3>

      <div className="space-y-4">
        {data.map((lesson) => (
          <div key={lesson.lessonId} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(lesson.lessonId)}
            >
              <div className="flex items-center gap-4 flex-1">
                {expandedLesson === lesson.lessonId ? (
                  <ChevronDown size={20} className="text-gray-400" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{lesson.lessonName}</p>
                  <p className="text-sm text-gray-500">
                    {lesson.completedCount} of {lesson.totalStudents} students completed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">Completion</span>
                    <span className={`font-bold ${
                      lesson.completionRate >= 70 ? 'text-green-600' :
                      lesson.completionRate >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {lesson.completionRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        lesson.completionRate >= 70 ? 'bg-green-500' :
                        lesson.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(lesson.completionRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {expandedLesson === lesson.lessonId && lesson.studentProgress && lesson.studentProgress.length > 0 && (
              <div className="border-t bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Student Progress</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Student</th>
                        <th className="pb-2">Batch</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Watch Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.studentProgress.map((progress, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="py-2">{progress.studentName}</td>
                          <td className="py-2">
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs">
                              {progress.batch}
                            </span>
                          </td>
                          <td className="py-2">
                            {progress.completed ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle size={14} />
                                Completed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock size={14} />
                                In Progress
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-gray-600">
                            {formatWatchTime(progress.watchedSeconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {expandedLesson === lesson.lessonId && (!lesson.studentProgress || lesson.studentProgress.length === 0) && (
              <div className="border-t bg-gray-50 p-4 text-center text-gray-500 text-sm">
                No students have started this lesson yet
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LessonProgressWidget;
