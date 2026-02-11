import { useState, useEffect } from 'react';
import { quizAPI, fileAPI } from '../services/api';
import { FileQuestion, Clock, CheckCircle, Play, AlertTriangle, Trophy, Sparkles, AlertCircle, PenLine, Upload, Paperclip, Image } from 'lucide-react';
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
  const [startTime, setStartTime] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

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
      setStartTime(Date.now());
      setUploadedFiles({});
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start quiz');
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const submitQuiz = async () => {
    const unanswered = quizData.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const response = await quizAPI.submit({
        quizId: selectedQuiz,
        answers,
        timeTaken
      });
      setResult(response.data.data);
      fetchQuizzes(); // Refresh to update attempted status
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setQuizData(null);
    setAnswers({});
    setResult(null);
    setCurrentQuestion(0);
  };

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

  // Show result
  if (result) {
    const getPerformanceDisplay = () => {
      if (!result.markingComplete) {
        return {
          icon: <AlertCircle size={48} />,
          bg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          title: 'Marking in Progress',
          message: `${result.pendingMarkingCount} writing question(s) pending review`
        };
      }
      if (result.performanceLevel === 'EXCELLENT' || result.percentage >= 80) {
        return {
          icon: <Sparkles size={48} />,
          bg: 'bg-green-100',
          iconColor: 'text-green-600',
          title: 'Excellent!',
          message: 'Outstanding performance! Keep up the great work!'
        };
      }
      if (result.performanceLevel === 'GOOD' || result.percentage >= 50) {
        return {
          icon: <Trophy size={48} />,
          bg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          title: 'Good Job!',
          message: 'Good effort! A little more practice will make it perfect.'
        };
      }
      return {
        icon: <AlertTriangle size={48} />,
        bg: 'bg-red-100',
        iconColor: 'text-red-600',
        title: 'Needs Improvement',
        message: 'Keep working hard! Review the material and try again.'
      };
    };

    const performance = getPerformanceDisplay();

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${performance.bg}`}>
            <span className={performance.iconColor}>{performance.icon}</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">{performance.title}</h1>
          <p className="text-gray-500 mb-2">{result.quizTitle}</p>
          <p className="text-sm text-gray-400 mb-6">{performance.message}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-indigo-600">
                {result.markingComplete ? `${result.percentage.toFixed(1)}%` : 'Pending'}
              </p>
              <p className="text-gray-500">Score</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-indigo-600">{result.correctAnswers}/{result.totalQuestions}</p>
              <p className="text-gray-500">Correct</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-indigo-600">{result.obtainedMarks}/{result.totalMarks}</p>
              <p className="text-gray-500">Marks</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-indigo-600">{Math.floor(result.timeTaken / 60)}:{(result.timeTaken % 60).toString().padStart(2, '0')}</p>
              <p className="text-gray-500">Time Taken</p>
            </div>
          </div>

          {/* Answer Review */}
          <div className="text-left mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Answer Review</h3>
            <div className="space-y-3">
              {result.answerDetails?.map((detail, index) => (
                <div key={detail.questionId} className={`p-4 rounded-lg ${
                  detail.markingStatus === 'PENDING' ? 'bg-orange-50' :
                  detail.isCorrect ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-800">
                      {index + 1}. {detail.questionText}
                    </p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      detail.questionType === 'WRITING' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {detail.questionType || 'MCQ'}
                    </span>
                  </div>

                  {detail.markingStatus === 'PENDING' ? (
                    <p className="text-orange-600">
                      Your answer: {detail.selectedAnswer || 'Not answered'} - Awaiting manual marking
                    </p>
                  ) : (
                    <p className={detail.isCorrect ? 'text-green-600' : 'text-red-600'}>
                      Your answer: {detail.selectedAnswer || 'Not answered'}
                      {detail.questionType !== 'WRITING' && !detail.isCorrect && ` (Correct: ${detail.correctAnswer})`}
                      {detail.questionType === 'WRITING' && detail.adminMarks !== undefined && (
                        <span className="ml-2">- Marks: {detail.adminMarks}/{detail.maxMarks}</span>
                      )}
                    </p>
                  )}

                  {detail.adminComment && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      Feedback: {detail.adminComment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={resetQuiz}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // Show quiz questions
  if (quizData) {
    const question = quizData.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="h-2 bg-gray-200">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">{quizData.title}</h2>
              <span className="text-gray-500">
                Question {currentQuestion + 1} of {quizData.questions.length}
              </span>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  question.questionType === 'WRITING' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {question.questionType === 'WRITING' ? (
                    <span className="flex items-center gap-1"><PenLine size={12} /> Writing</span>
                  ) : 'MCQ'}
                </span>
                <span className="text-xs text-gray-500">{question.marks} mark(s)</span>
              </div>

              <p className="text-xl font-medium text-gray-800 mb-4">
                {question.questionText}
              </p>

              {/* Question Images - displayed inline */}
              {question.attachments && question.attachments.length > 0 && (
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
                  {/* Non-image attachments as download links */}
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

              {question.questionType === 'WRITING' ? (
                <div className="space-y-4">
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                    rows={6}
                    placeholder="Type your answer here..."
                  />

                  {/* File upload for writing answers - shown after submission */}
                  {uploadedFiles[question.id] && uploadedFiles[question.id].length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles[question.id].map((file, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm flex items-center gap-1">
                          <Paperclip size={12} />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D', 'E'].map((option) => (
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
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex gap-2">
                {quizData.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium ${
                      index === currentQuestion
                        ? 'bg-indigo-600 text-white'
                        : answers[quizData.questions[index].id]
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {currentQuestion === quizData.questions.length - 1 ? (
                <button
                  onClick={submitQuiz}
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

        <button
          onClick={resetQuiz}
          className="mt-4 text-gray-500 hover:text-gray-700"
        >
          Cancel Quiz
        </button>
      </div>
    );
  }

  // Show quiz list
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
                  <div className={`p-2 rounded-lg ${
                    quiz.attempted ? 'bg-green-100' : 'bg-indigo-100'
                  }`}>
                    {quiz.attempted ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <FileQuestion className="text-indigo-600" size={24} />
                    )}
                  </div>
                  {quiz.timeLimit > 0 && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock size={16} />
                      {quiz.timeLimit} min
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
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-green-700 font-medium">
                      Completed - Score: {quiz.score?.toFixed(1)}%
                    </p>
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

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      )}
    </div>
  );
};

export default Quizzes;
