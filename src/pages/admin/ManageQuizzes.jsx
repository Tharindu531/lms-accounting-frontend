import { useState, useEffect } from 'react';
import { quizAPI, unitAPI } from '../../services/api';
import { FileQuestion, Plus, Edit2, Trash2, X, Save, PlusCircle, Wand2 } from 'lucide-react';

const ManageQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showFromUnitsModal, setShowFromUnitsModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [selectedQuizForQuestion, setSelectedQuizForQuestion] = useState(null);

  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    accessibleBatches: '',
    timeLimit: 0
  });

  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    questionType: 'MCQ',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    marks: 1
  });

  const [fromUnitsForm, setFromUnitsForm] = useState({
    title: '',
    description: '',
    accessibleBatches: '',
    timeLimit: 0,
    unitIds: [],
    numberOfQuestions: 10,
    evenDistribution: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [quizzesRes, unitsRes] = await Promise.all([
        quizAPI.getAllAdmin(),
        unitAPI.getActive()
      ]);
      setQuizzes(quizzesRes.data.data || []);
      setUnits(unitsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await quizAPI.getAllAdmin();
      setQuizzes(response.data.data || []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    }
  };

  const openQuizModal = (quiz = null) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setQuizForm({
        title: quiz.title,
        description: quiz.description || '',
        accessibleBatches: Array.from(quiz.accessibleBatches || []).join(', '),
        timeLimit: quiz.timeLimit || 0
      });
    } else {
      setEditingQuiz(null);
      setQuizForm({
        title: '',
        description: '',
        accessibleBatches: '',
        timeLimit: 0
      });
    }
    setShowQuizModal(true);
  };

  const openQuestionModal = (quiz) => {
    setSelectedQuizForQuestion(quiz);
    setQuestionForm({
      questionText: '',
      questionType: 'MCQ',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      marks: 1
    });
    setShowQuestionModal(true);
  };

  const openFromUnitsModal = () => {
    setFromUnitsForm({
      title: '',
      description: '',
      accessibleBatches: '',
      timeLimit: 0,
      unitIds: [],
      numberOfQuestions: 10,
      evenDistribution: false
    });
    setShowFromUnitsModal(true);
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...quizForm,
      accessibleBatches: quizForm.accessibleBatches
        .split(',')
        .map(b => parseInt(b.trim()))
        .filter(b => !isNaN(b))
    };

    try {
      if (editingQuiz) {
        await quizAPI.update(editingQuiz.id, data);
      } else {
        await quizAPI.create(data);
      }
      fetchQuizzes();
      setShowQuizModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save quiz');
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();

    const data = { ...questionForm };
    // Clear MCQ fields for WRITING questions
    if (questionForm.questionType === 'WRITING') {
      data.optionA = null;
      data.optionB = null;
      data.optionC = null;
      data.optionD = null;
    }

    try {
      await quizAPI.addQuestion(selectedQuizForQuestion.id, data);
      fetchQuizzes();
      setShowQuestionModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add question');
    }
  };

  const handleFromUnitsSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...fromUnitsForm,
      accessibleBatches: fromUnitsForm.accessibleBatches
        .split(',')
        .map(b => parseInt(b.trim()))
        .filter(b => !isNaN(b)),
      unitIds: fromUnitsForm.unitIds.length > 0 ? fromUnitsForm.unitIds : null
    };

    try {
      await quizAPI.createFromUnits(data);
      fetchQuizzes();
      setShowFromUnitsModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create quiz from units');
    }
  };

  const handleUnitToggle = (unitId) => {
    setFromUnitsForm(prev => ({
      ...prev,
      unitIds: prev.unitIds.includes(unitId)
        ? prev.unitIds.filter(id => id !== unitId)
        : [...prev.unitIds, unitId]
    }));
  };

  const handleDeleteQuiz = async (id) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await quizAPI.delete(id);
      fetchQuizzes();
    } catch (err) {
      alert('Failed to delete quiz');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Quizzes</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openFromUnitsModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Wand2 size={20} />
            Create from Units
          </button>
          <button
            onClick={() => openQuizModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            Add Quiz
          </button>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileQuestion className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Quizzes</h2>
          <p className="text-gray-500">Create your first quiz to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{quiz.title}</h3>
                    <p className="text-gray-500">{quiz.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openQuestionModal(quiz)}
                      className="flex items-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <PlusCircle size={18} />
                      Add Question
                    </button>
                    <button
                      onClick={() => openQuizModal(quiz)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>{quiz.questions?.length || 0} questions</span>
                  <span>{quiz.timeLimit > 0 ? `${quiz.timeLimit} min` : 'No time limit'}</span>
                  <span className={quiz.isActive !== false ? 'text-green-600' : 'text-red-600'}>
                    {quiz.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {Array.from(quiz.accessibleBatches || []).map(batch => (
                    <span key={batch} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                      Batch {batch}
                    </span>
                  ))}
                </div>

                {/* Questions List */}
                {quiz.questions && quiz.questions.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Questions:</h4>
                    <div className="space-y-2">
                      {quiz.questions.map((q, index) => (
                        <div key={q.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-gray-800">
                              <span className="font-medium">{index + 1}.</span> {q.questionText}
                            </p>
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                              q.questionType === 'WRITING'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {q.questionType || 'MCQ'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {q.questionType !== 'WRITING' && `Correct: ${q.correctAnswer} | `}Marks: {q.marks}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingQuiz ? 'Edit Quiz' : 'Add New Quiz'}
              </h2>
              <button onClick={() => setShowQuizModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleQuizSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accessible Batches * (comma-separated)
                </label>
                <input
                  type="text"
                  value={quizForm.accessibleBatches}
                  onChange={(e) => setQuizForm({ ...quizForm, accessibleBatches: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="1, 2, 3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Limit (minutes, 0 = no limit)
                </label>
                <input
                  type="number"
                  value={quizForm.timeLimit}
                  onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  min={0}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowQuizModal(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Save size={18} />
                  {editingQuiz ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">
                Add Question to "{selectedQuizForQuestion?.title}"
              </h2>
              <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleQuestionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type *</label>
                <select
                  value={questionForm.questionType}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="WRITING">Writing / Typing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                <textarea
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={2}
                  required
                />
              </div>

              {questionForm.questionType === 'MCQ' && (
                <>
                  {['A', 'B', 'C', 'D'].map((option) => (
                    <div key={option}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Option {option} *</label>
                      <input
                        type="text"
                        value={questionForm[`option${option}`]}
                        onChange={(e) => setQuestionForm({ ...questionForm, [`option${option}`]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
                    <select
                      value={questionForm.correctAnswer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {questionForm.questionType === 'WRITING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Answer (for reference)</label>
                  <textarea
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    rows={2}
                    placeholder="Model answer or key points"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
                <input
                  type="number"
                  value={questionForm.marks}
                  onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  min={1}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowQuestionModal(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <PlusCircle size={18} />
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create from Units Modal */}
      {showFromUnitsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Create Quiz from Question Bank</h2>
              <button onClick={() => setShowFromUnitsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleFromUnitsSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
                <input
                  type="text"
                  value={fromUnitsForm.title}
                  onChange={(e) => setFromUnitsForm({ ...fromUnitsForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={fromUnitsForm.description}
                  onChange={(e) => setFromUnitsForm({ ...fromUnitsForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accessible Batches * (comma-separated)
                </label>
                <input
                  type="text"
                  value={fromUnitsForm.accessibleBatches}
                  onChange={(e) => setFromUnitsForm({ ...fromUnitsForm, accessibleBatches: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="1, 2, 3"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
                  <input
                    type="number"
                    value={fromUnitsForm.timeLimit}
                    onChange={(e) => setFromUnitsForm({ ...fromUnitsForm, timeLimit: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions *</label>
                  <input
                    type="number"
                    value={fromUnitsForm.numberOfQuestions}
                    onChange={(e) => setFromUnitsForm({ ...fromUnitsForm, numberOfQuestions: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Units (leave empty for all units)
                </label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {units.length === 0 ? (
                    <p className="text-gray-500 text-sm">No units available. Create units first.</p>
                  ) : (
                    units.map(unit => (
                      <label key={unit.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fromUnitsForm.unitIds.includes(unit.id)}
                          onChange={() => handleUnitToggle(unit.id)}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-sm text-gray-700">{unit.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fromUnitsForm.evenDistribution}
                    onChange={(e) => setFromUnitsForm({ ...fromUnitsForm, evenDistribution: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Even distribution across selected units</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowFromUnitsModal(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <Wand2 size={18} />
                  Create Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageQuizzes;
