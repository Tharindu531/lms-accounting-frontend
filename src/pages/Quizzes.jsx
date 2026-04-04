import { useState, useEffect, useRef } from 'react';
import { quizAPI, fileAPI } from '../services/api';
import {
  FileQuestion, Clock, CheckCircle, Play, AlertTriangle, Trophy, Sparkles,
  AlertCircle, PenLine, Paperclip, Eye, Upload, Image, FileText,
} from 'lucide-react';
import FileViewer from '../components/FileViewer';

const Quizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  // Post-submission file upload (per writing question)
  const [quizMarksId, setQuizMarksId] = useState(null);
  const [answerFiles, setAnswerFiles] = useState({});      // { questionId: [file objects] }
  const [uploadingFor, setUploadingFor] = useState(null);  // questionId currently uploading

  // Review mode (viewing a past, already-submitted quiz)
  const [reviewLoading, setReviewLoading] = useState(null); // quizId being loaded

  // Ref to prevent double-submit (race condition between button click and auto-submit)
  const submittingRef = useRef(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Countdown tick
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft === 0) { setTimedOut(true); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  // Keep a ref to submitQuiz so the timer effect always calls the latest version
  const submitQuizRef = useRef(null);
  submitQuizRef.current = submitQuiz;

  // Auto-submit when timer reaches zero
  useEffect(() => {
    if (timedOut && !submitting && !result) {
      submitQuizRef.current(true);
    }
  }, [timedOut, submitting, result]);

  const fetchQuizzes = async () => {
    try {
      const response = await quizAPI.getAll();
      setQuizzes(response.data.data || []);
    } catch (err) {
      if (err.response?.status === 402) {
        setError('Payment required to access quizzes.');
      } else {
        setError('Failed to load quizzes');
      }
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (quizId) => {
    try {
      const response = await quizAPI.getForAttempt(quizId);
      const quiz = response.data.data;
      setQuizData(quiz);
      setSelectedQuiz(quizId);
      setCurrentQuestion(0);
      setAnswers({});
      setResult(null);
      setQuizMarksId(null);
      setAnswerFiles({});
      setTimedOut(false);
      setTimeLeft(quiz.timeLimit > 0 ? quiz.timeLimit * 60 : null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start quiz');
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const submitQuiz = async (isAutoSubmit = false) => {
    if (submittingRef.current) return; // prevent double submit
    if (!isAutoSubmit) {
      const unanswered = (quizData?.questions ?? []).filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        if (!confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) {
          return;
        }
      }
    }

    submittingRef.current = true;
    setTimeLeft(null);
    setSubmitting(true);
    try {
      const response = await quizAPI.submit({ quizId: selectedQuiz, answers });
      const resultData = response.data.data;
      setResult(resultData);
      setQuizMarksId(resultData.quizMarksId);
      fetchQuizzes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Load a past quiz result for review
  const reviewQuiz = async (quizId) => {
    setReviewLoading(quizId);
    try {
      const res = await quizAPI.getMyQuizResult(quizId);
      const resultData = res.data.data;
      setResult(resultData);
      setQuizMarksId(resultData.quizMarksId);

      // Fetch uploaded answer files for all writing questions
      const fileEntries = await Promise.all(
        (resultData.answerDetails || [])
          .filter((detail) => detail.questionType === 'WRITING' && resultData.quizMarksId)
          .map(async (detail) => {
            try {
              const fileRes = await fileAPI.getAnswerAttachments(resultData.quizMarksId, detail.questionId);
              return [detail.questionId, fileRes.data.data || []];
            } catch {
              return [detail.questionId, []];
            }
          })
      );
      const files = Object.fromEntries(fileEntries.filter(([, fileList]) => fileList.length > 0));
      setAnswerFiles(files);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load quiz result');
    } finally {
      setReviewLoading(null);
    }
  };

  // Upload a file for a writing answer (only available on result screen right after submission)
  const handleAnswerFileUpload = async (questionId, file) => {
    if (!quizMarksId) return;
    setUploadingFor(questionId);
    try {
      await fileAPI.uploadForAnswer(quizMarksId, questionId, file);
      // Refresh the file list for this question
      const res = await fileAPI.getAnswerAttachments(quizMarksId, questionId);
      setAnswerFiles(prev => ({ ...prev, [questionId]: res.data.data || [] }));
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed. Only images and PDFs up to 20 MB are allowed.');
    } finally {
      setUploadingFor(null);
    }
  };

  const resetQuiz = () => {
    setTimeLeft(null);
    setTimedOut(false);
    setSelectedQuiz(null);
    setQuizData(null);
    setAnswers({});
    setResult(null);
    setCurrentQuestion(0);
    setQuizMarksId(null);
    setAnswerFiles({});
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerFraction = () => {
    if (timeLeft === null || !quizData?.timeLimit) return 1;
    return timeLeft / (quizData.timeLimit * 60);
  };

  // ─── Loading / Error ────────────────────────────────────────────────────────

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

  // ─── Result / Review Screen ─────────────────────────────────────────────────

  if (result) {
    const isReview = !quizData; // if quizData is null we came via the Review button

    const getPerformanceDisplay = () => {
      if (!result.markingComplete) {
        return {
          icon: <AlertCircle size={48} />,
          bg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          title: 'Marking in Progress',
          message: `${result.pendingMarkingCount} writing question(s) pending review`,
        };
      }
      if (result.percentage >= 80) {
        return {
          icon: <Sparkles size={48} />,
          bg: 'bg-green-100',
          iconColor: 'text-green-600',
          title: 'Excellent!',
          message: 'Outstanding performance! Keep up the great work!',
        };
      }
      if (result.percentage >= 50) {
        return {
          icon: <Trophy size={48} />,
          bg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          title: 'Good Job!',
          message: 'Good effort! A little more practice will make it perfect.',
        };
      }
      return {
        icon: <AlertTriangle size={48} />,
        bg: 'bg-red-100',
        iconColor: 'text-red-600',
        title: 'Needs Improvement',
        message: 'Keep working hard! Review the material and try again.',
      };
    };

    const performance = getPerformanceDisplay();

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Performance header */}
          <div className="text-center mb-8">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${performance.bg}`}>
              <span className={performance.iconColor}>{performance.icon}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{performance.title}</h1>
            <p className="text-gray-500 mb-1">{result.quizTitle}</p>
            <p className="text-sm text-gray-400">{performance.message}</p>
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">
                {result.markingComplete ? `${result.percentage.toFixed(1)}%` : 'Pending'}
              </p>
              <p className="text-gray-500 text-sm">Score</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">{result.obtainedMarks}/{result.totalMarks}</p>
              <p className="text-gray-500 text-sm">Marks</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">{result.correctAnswers}/{result.totalQuestions}</p>
              <p className="text-gray-500 text-sm">Correct</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">
                {Math.floor(result.timeTaken / 60)}:{(result.timeTaken % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-gray-500 text-sm">Time Taken</p>
            </div>
          </div>

          {/* Upload hint for writing questions (only immediately after submission) */}
          {!isReview && result.answerDetails?.some(d => d.questionType === 'WRITING') && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
              <Upload size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-indigo-800">Support your writing answers</p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  You can upload images or PDFs for each writing question below. The admin will see them when marking.
                </p>
              </div>
            </div>
          )}

          {/* Answer Review */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Answer Review</h3>
            <div className="space-y-4">
              {result.answerDetails?.map((detail, index) => (
                <AnswerDetailCard
                  key={detail.questionId}
                  detail={detail}
                  index={index}
                  isReview={isReview}
                  markingComplete={result.markingComplete}
                  uploadedFiles={answerFiles[detail.questionId] || []}
                  uploadingFor={uploadingFor}
                  onUpload={handleAnswerFileUpload}
                  onViewFile={setViewingFile}
                />
              ))}
            </div>
          </div>

          <button
            onClick={resetQuiz}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Back to Quizzes
          </button>
        </div>

        {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
      </div>
    );
  }

  // ─── Active Quiz ────────────────────────────────────────────────────────────

  if (quizData) {
    const questions = quizData.questions ?? [];
    const question = questions[currentQuestion] ?? questions[0];
    const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

    if (!question) return null; // no active questions — should not happen after backend fix

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="h-2 bg-gray-200">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Timer bar — shown when quiz has a time limit */}
          {timeLeft !== null && (() => {
            const fraction = getTimerFraction();
            const isLow = fraction <= 0.25;
            const isMedium = fraction <= 0.5 && fraction > 0.25;
            const barBg = isLow ? 'bg-red-600' : isMedium ? 'bg-amber-500' : 'bg-green-600';
            const trackBg = isLow ? 'bg-red-200' : isMedium ? 'bg-amber-200' : 'bg-green-200';
            return (
              <div className={`${isLow ? 'bg-red-50' : isMedium ? 'bg-amber-50' : 'bg-green-50'} border-b ${isLow ? 'border-red-200' : isMedium ? 'border-amber-200' : 'border-green-200'}`}>
                {/* Shrinking progress track */}
                <div className={`h-1 w-full ${trackBg}`}>
                  <div
                    className={`h-full ${barBg} transition-all duration-1000 ${isLow ? 'animate-pulse' : ''}`}
                    style={{ width: `${fraction * 100}%` }}
                  />
                </div>
                {/* Time display */}
                <div className="flex items-center justify-center gap-3 py-2">
                  <Clock size={16} className={isLow ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-green-600'} />
                  <span className={`font-mono font-bold text-lg ${isLow ? 'text-red-700 animate-pulse' : isMedium ? 'text-amber-700' : 'text-green-700'}`}>
                    {formatTime(timeLeft)}
                  </span>
                  <span className={`text-xs ${isLow ? 'text-red-500' : isMedium ? 'text-amber-500' : 'text-green-500'}`}>
                    remaining
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Time's up banner */}
          {timedOut && (
            <div className="bg-red-600 px-6 py-3 flex items-center gap-2 text-white">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="font-semibold">Time's up! Submitting your answers...</span>
            </div>
          )}

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">{quizData.title}</h2>
              <span className="text-gray-500 text-sm">{currentQuestion + 1} / {questions.length}</span>
            </div>

            {/* Question */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  question.questionType === 'WRITING' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {question.questionType === 'WRITING'
                    ? <span className="flex items-center gap-1"><PenLine size={12} /> Writing</span>
                    : 'MCQ'}
                </span>
                <span className="text-xs text-gray-500">{question.marks} mark(s)</span>
              </div>

              <p className="text-xl font-medium text-gray-800 mb-4">{question.questionText}</p>

              {/* Question attachments */}
              {question.attachments?.length > 0 && (
                <div className="mb-6 space-y-3">
                  {question.attachments.filter(f => f.fileType === 'IMAGE').map(file => (
                    <div key={file.id} className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={file.url || file.presignedUrl}
                        alt={file.originalFileName}
                        className="w-full max-h-96 object-contain bg-gray-50 cursor-pointer hover:opacity-90 transition"
                        onClick={() => setViewingFile(file)}
                      />
                    </div>
                  ))}
                  {question.attachments.filter(f => f.fileType !== 'IMAGE').length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {question.attachments.filter(f => f.fileType !== 'IMAGE').map(file => (
                        <button
                          key={file.id}
                          onClick={() => setViewingFile(file)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border rounded-lg hover:bg-indigo-50 transition text-sm"
                        >
                          <Paperclip size={14} className="text-blue-600" />
                          {file.originalFileName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Answer input */}
              {question.questionType === 'WRITING' ? (
                <textarea
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                  rows={6}
                  placeholder="Type your answer here..."
                />
              ) : (
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D', 'E'].map((option) => (
                    question[`option${option}`] && (
                      <button
                        key={option}
                        onClick={() => handleAnswer(question.id, option)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition ${
                          answers[question.id] === option
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="font-medium text-indigo-600 mr-3">{option}.</span>
                        {question[`option${option}`]}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium ${
                      index === currentQuestion
                        ? 'bg-indigo-600 text-white'
                        : answers[questions[index].id]
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={() => submitQuiz(false)}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={resetQuiz} className="mt-4 text-gray-500 hover:text-gray-700">
          Cancel Quiz
        </button>

        {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
      </div>
    );
  }

  // ─── Quiz List ──────────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Available Quizzes</h1>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileQuestion className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Quizzes Available</h2>
          <p className="text-gray-500">Check back later for new quizzes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-lg ${quiz.attempted ? 'bg-green-100' : 'bg-indigo-100'}`}>
                    {quiz.attempted
                      ? <CheckCircle className="text-green-600" size={24} />
                      : <FileQuestion className="text-indigo-600" size={24} />}
                  </div>
                  {quiz.timeLimit > 0 && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock size={16} />{quiz.timeLimit} min
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">{quiz.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{quiz.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>{quiz.questionCount} questions</span>
                  <span>{quiz.totalMarks} marks</span>
                </div>

                {quiz.attempted ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-green-700 font-medium">
                        {quiz.score != null ? `Completed — Score: ${quiz.score.toFixed(1)}%` : 'Completed — Marking Pending'}
                      </p>
                    </div>
                    <button
                      onClick={() => reviewQuiz(quiz.id)}
                      disabled={reviewLoading === quiz.id}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition text-sm disabled:opacity-50"
                    >
                      {reviewLoading === quiz.id
                        ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                        : <Eye size={16} />}
                      {reviewLoading === quiz.id ? 'Loading...' : 'Review Answers'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startQuiz(quiz.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    <Play size={20} />
                    Start Quiz
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
};

// ─── Answer Detail Card ─────────────────────────────────────────────────────

const AnswerDetailCard = ({
  detail, index, isReview, markingComplete,
  uploadedFiles, uploadingFor, onUpload, onViewFile,
}) => {
  const isPending = detail.markingStatus === 'PENDING';
  const isWriting = detail.questionType === 'WRITING';

  const cardBg = isPending
    ? 'bg-orange-50 border-orange-200'
    : detail.isCorrect
      ? 'bg-green-50 border-green-200'
      : 'bg-red-50 border-red-200';

  return (
    <div className={`p-4 rounded-xl border-2 ${cardBg}`}>
      {/* Question header */}
      <div className="flex items-start justify-between mb-3">
        <p className="font-medium text-gray-800 pr-4">
          {index + 1}. {detail.questionText}
        </p>
        <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${
          isWriting ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {isWriting ? 'Writing' : 'MCQ'}
        </span>
      </div>

      {/* MCQ result */}
      {!isWriting && (
        <div className="space-y-1">
          <p className={detail.isCorrect ? 'text-green-700' : 'text-red-700'}>
            Your answer: <strong>{detail.selectedAnswer || 'Not answered'}</strong>
            {!detail.isCorrect && detail.correctAnswer && (
              <span className="ml-2 text-gray-600">
                (Correct: <strong>{detail.correctAnswer}</strong>)
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            {detail.isCorrect ? `+${detail.maxMarks} mark(s)` : '0 marks'}
          </p>
        </div>
      )}

      {/* Writing result */}
      {isWriting && (
        <div className="space-y-3">
          {/* Student's typed answer */}
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-1">Your Answer:</p>
            <p className="text-gray-800 whitespace-pre-wrap text-sm">
              {detail.selectedAnswer || <span className="italic text-gray-400">No answer provided</span>}
            </p>
          </div>

          {/* Uploaded files */}
          {uploadedFiles.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                <Paperclip size={12} /> Uploaded Files:
              </p>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map(file => (
                  <button
                    key={file.id}
                    onClick={() => onViewFile(file)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition text-sm"
                  >
                    {file.fileType === 'IMAGE'
                      ? <Image size={14} className="text-green-600" />
                      : <FileText size={14} className="text-blue-600" />}
                    <span className="max-w-[160px] truncate">{file.originalFileName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload button — only shown right after submission, not in review mode */}
          {!isReview && (
            <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition ${
              uploadingFor === detail.questionId
                ? 'border-indigo-400 bg-indigo-50 opacity-70'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
            }`}>
              <Upload size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-500">
                {uploadingFor === detail.questionId ? 'Uploading...' : 'Upload image or PDF'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={uploadingFor === detail.questionId}
                onChange={(e) => {
                  if (e.target.files?.[0]) onUpload(detail.questionId, e.target.files[0]);
                  e.target.value = '';
                }}
              />
            </label>
          )}

          {/* Admin marks & feedback */}
          {detail.markingStatus === 'MARKED' && (
            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Admin Review</p>
                <span className="text-sm font-bold text-indigo-800">
                  {detail.adminMarks ?? 0} / {detail.maxMarks} marks
                </span>
              </div>
              {detail.adminComment ? (
                <p className="text-sm text-indigo-800 italic">"{detail.adminComment}"</p>
              ) : (
                <p className="text-xs text-indigo-500">No comment left.</p>
              )}
            </div>
          )}

          {/* Pending notice */}
          {isPending && (
            <div className="flex items-center gap-2 text-orange-600 text-sm">
              <AlertCircle size={14} />
              Awaiting admin marking
            </div>
          )}

          {/* Reference answer — shown when quiz is fully marked */}
          {markingComplete && detail.correctAnswer && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">Reference Answer:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.correctAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Quizzes;
