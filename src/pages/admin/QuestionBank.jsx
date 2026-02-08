import { useState, useEffect } from 'react';
import { quizAPI, unitAPI, fileAPI } from '../../services/api';
import { HelpCircle, Plus, Edit2, Trash2, X, Save, Filter, BarChart3, Upload, Paperclip } from 'lucide-react';
import FileUpload, { FileList } from '../../components/FileUpload';
import FileViewer from '../../components/FileViewer';

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [filterUnitId, setFilterUnitId] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);

  const [form, setForm] = useState({
    questionText: '',
    questionType: 'MCQ',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    marks: 1,
    unitId: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterUnitId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [questionsRes, unitsRes] = await Promise.all([
        quizAPI.getQuestionBank(filterUnitId || null),
        unitAPI.getActive()
      ]);
      setQuestions(questionsRes.data.data || []);
      setUnits(unitsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await quizAPI.getQuestionBankStats();
      setStats(response.data.data || []);
      setShowStatsModal(true);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchAttachments = async (questionId) => {
    try {
      const response = await fileAPI.getQuestionAttachments(questionId);
      setAttachments(response.data.data || []);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!editingQuestion) {
      alert('Please save the question first before uploading files.');
      return;
    }
    try {
      await fileAPI.uploadForQuestion(editingQuestion.id, file);
      await fetchAttachments(editingQuestion.id);
    } catch (err) {
      throw err;
    }
  };

  const handleFileDelete = async (attachmentId) => {
    if (!confirm('Delete this file?')) return;
    try {
      await fileAPI.delete(attachmentId);
      await fetchAttachments(editingQuestion.id);
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const openModal = async (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setForm({
        questionText: question.questionText,
        questionType: question.questionType || 'MCQ',
        optionA: question.optionA || '',
        optionB: question.optionB || '',
        optionC: question.optionC || '',
        optionD: question.optionD || '',
        correctAnswer: question.correctAnswer || 'A',
        marks: question.marks || 1,
        unitId: question.unitId || ''
      });
      await fetchAttachments(question.id);
    } else {
      setEditingQuestion(null);
      setForm({
        questionText: '',
        questionType: 'MCQ',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A',
        marks: 1,
        unitId: filterUnitId || ''
      });
      setAttachments([]);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...form,
      unitId: form.unitId ? parseInt(form.unitId) : null
    };

    // Clear MCQ fields for WRITING questions
    if (form.questionType === 'WRITING') {
      data.optionA = null;
      data.optionB = null;
      data.optionC = null;
      data.optionD = null;
    }

    try {
      if (editingQuestion) {
        await quizAPI.updateBankQuestion(editingQuestion.id, data);
        fetchData();
        setShowModal(false);
      } else {
        const response = await quizAPI.addToQuestionBank(data);
        const newQuestion = response.data.data;
        setEditingQuestion(newQuestion);
        fetchData();
        alert('Question created! You can now upload files.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await quizAPI.deleteBankQuestion(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete question');
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
        <h1 className="text-2xl font-bold text-gray-800">Question Bank</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <BarChart3 size={20} />
            Stats
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            Add Question
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filterUnitId}
            onChange={(e) => setFilterUnitId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            <option value="">All Units</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">{questions.length} questions found</span>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <HelpCircle className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Questions</h2>
          <p className="text-gray-500">Add questions to the bank to use them in quizzes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      question.questionType === 'WRITING'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {question.questionType || 'MCQ'}
                    </span>
                    {question.unitName && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {question.unitName}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{question.marks} mark(s)</span>
                  </div>
                  <p className="text-gray-800 font-medium">{question.questionText}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openModal(question)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {question.questionType !== 'WRITING' && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <div
                      key={opt}
                      className={`p-2 rounded text-sm ${
                        question.correctAnswer === opt
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="font-medium">{opt}.</span> {question[`option${opt}`]}
                    </div>
                  ))}
                </div>
              )}

              {question.questionType === 'WRITING' && question.correctAnswer && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700 font-medium mb-1">Expected Answer:</p>
                  <p className="text-sm text-green-800">{question.correctAnswer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Question Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingQuestion ? 'Edit Question' : 'Add Question to Bank'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="">No Unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Type *</label>
                  <select
                    value={form.questionType}
                    onChange={(e) => setForm({ ...form, questionType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="WRITING">Writing / Typing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                <textarea
                  value={form.questionText}
                  onChange={(e) => setForm({ ...form, questionText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={3}
                  required
                />
              </div>

              {form.questionType === 'MCQ' && (
                <>
                  {['A', 'B', 'C', 'D'].map((option) => (
                    <div key={option}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Option {option} *</label>
                      <input
                        type="text"
                        value={form[`option${option}`]}
                        onChange={(e) => setForm({ ...form, [`option${option}`]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
                    <select
                      value={form.correctAnswer}
                      onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {form.questionType === 'WRITING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Answer (for admin reference)
                  </label>
                  <textarea
                    value={form.correctAnswer}
                    onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    rows={3}
                    placeholder="Model answer or key points for marking reference"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
                <input
                  type="number"
                  value={form.marks}
                  onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  min={1}
                />
              </div>

              {/* File Upload Section */}
              {editingQuestion && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Paperclip size={16} className="inline mr-1" />
                    Attachments (Images, PDFs)
                  </label>
                  <FileUpload
                    onUpload={handleFileUpload}
                    accept=".jpg,.jpeg,.png,.gif,.pdf"
                    maxSize={20}
                    multiple={true}
                  />
                  <FileList
                    files={attachments}
                    onDelete={handleFileDelete}
                    showDelete={true}
                  />
                </div>
              )}

              {!editingQuestion && (
                <p className="text-sm text-gray-500 italic">
                  Save the question first to upload files.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Save size={18} />
                  {editingQuestion ? 'Update' : 'Add to Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Question Bank Statistics</h2>
              <button onClick={() => setShowStatsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {stats.length === 0 ? (
                <p className="text-gray-500 text-center">No statistics available</p>
              ) : (
                <div className="space-y-3">
                  {stats.map((stat) => (
                    <div key={stat.unitId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{stat.unitName}</p>
                        <p className="text-sm text-gray-500">
                          {stat.mcqCount} MCQ + {stat.writingCount} Writing
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-indigo-600">{stat.totalCount}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

export default QuestionBank;
