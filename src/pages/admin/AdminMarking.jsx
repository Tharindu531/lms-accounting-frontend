import { useState, useEffect } from 'react';
import { quizAPI, fileAPI } from '../../services/api';
import { ClipboardCheck, ChevronRight, X, Save, Check, AlertCircle, Paperclip, Image } from 'lucide-react';
import FileViewer from '../../components/FileViewer';

const AdminMarking = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [markingForm, setMarkingForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [answerAttachments, setAnswerAttachments] = useState({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await quizAPI.getPendingMarking();
      setSubmissions(response.data.data || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const openSubmission = async (submission) => {
    try {
      const response = await quizAPI.getSubmissionForMarking(submission.quizMarksId);
      const data = response.data.data;
      setSelectedSubmission(data);

      // Initialize marking form with existing marks
      const formData = {};
      data.writingAnswers?.forEach(answer => {
        formData[answer.questionId] = {
          marks: answer.adminMarks ?? '',
          comment: answer.adminComment || ''
        };
      });
      setMarkingForm(formData);

      // Fetch attachments for each answer
      const attachmentsMap = {};
      for (const answer of data.writingAnswers || []) {
        try {
          const attachRes = await fileAPI.getAnswerAttachments(submission.quizMarksId, answer.questionId);
          if (attachRes.data.data && attachRes.data.data.length > 0) {
            attachmentsMap[answer.questionId] = attachRes.data.data;
          }
        } catch {
          // Ignore attachment errors
        }
      }
      setAnswerAttachments(attachmentsMap);
    } catch (err) {
      console.error('Failed to load submission details:', err);
      alert('Failed to load submission details');
    }
  };

  const handleMarkQuestion = async (questionId) => {
    const { marks, comment } = markingForm[questionId] || {};

    if (marks === '' || marks === undefined) {
      alert('Please enter marks');
      return;
    }

    setSaving(true);
    try {
      await quizAPI.markQuestion({
        quizMarksId: selectedSubmission.quizMarksId,
        questionId: questionId,
        marks: parseInt(marks),
        comment: comment || ''
      });

      // Refresh submission
      const response = await quizAPI.getSubmissionForMarking(selectedSubmission.quizMarksId);
      const data = response.data.data;
      setSelectedSubmission(data);

      // Check if all marked
      if (data.pendingCount === 0) {
        alert('All questions marked! Final score calculated.');
        fetchSubmissions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const closeSubmission = () => {
    setSelectedSubmission(null);
    setMarkingForm({});
    fetchSubmissions();
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
        <h1 className="text-2xl font-bold text-gray-800">Admin Marking</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg">
          <AlertCircle size={20} />
          <span>{submissions.length} submissions pending</span>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ClipboardCheck className="mx-auto text-green-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">All Caught Up!</h2>
          <p className="text-gray-500">No submissions require manual marking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.quizMarksId}
              onClick={() => openSubmission(submission)}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{submission.quizTitle}</h3>
                  <p className="text-gray-500">{submission.studentName} ({submission.studentEmail})</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Submitted: {new Date(submission.attemptedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Writing Questions</p>
                    <p className="text-lg font-semibold">
                      <span className="text-green-600">{submission.markedCount}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-orange-600">{submission.totalWritingQuestions}</span>
                    </p>
                  </div>
                  <ChevronRight className="text-gray-400" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marking Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedSubmission.quizTitle}</h2>
                <p className="text-gray-500">{selectedSubmission.studentName}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-green-600 font-medium">{selectedSubmission.markedCount} marked</span>
                  <span className="text-gray-400"> / </span>
                  <span className="text-orange-600 font-medium">{selectedSubmission.pendingCount} pending</span>
                </div>
                <button onClick={closeSubmission} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedSubmission.writingAnswers?.map((answer, index) => (
                <div
                  key={answer.questionId}
                  className={`p-4 rounded-xl border-2 ${
                    answer.status === 'MARKED'
                      ? 'border-green-200 bg-green-50'
                      : 'border-orange-200 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        answer.status === 'MARKED'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-orange-200 text-orange-800'
                      }`}>
                        {answer.status === 'MARKED' ? 'Marked' : 'Pending'}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">Max: {answer.maxMarks} marks</span>
                    </div>
                    <span className="text-sm text-gray-500">Q{index + 1}</span>
                  </div>

                  <p className="font-medium text-gray-800 mb-3">{answer.questionText}</p>

                  {answer.expectedAnswer && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium mb-1">Expected Answer:</p>
                      <p className="text-sm text-blue-800">{answer.expectedAnswer}</p>
                    </div>
                  )}

                  <div className="mb-4 p-3 bg-white rounded-lg border">
                    <p className="text-xs text-gray-500 font-medium mb-1">Student's Answer:</p>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {answer.studentAnswer || <span className="italic text-gray-400">No answer provided</span>}
                    </p>

                    {/* Student's uploaded files */}
                    {answerAttachments[answer.questionId] && answerAttachments[answer.questionId].length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                          <Paperclip size={12} /> Uploaded Files:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {answerAttachments[answer.questionId].map(file => (
                            <button
                              key={file.id}
                              onClick={() => setViewingFile(file)}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-indigo-100 transition text-sm"
                            >
                              {file.fileType === 'IMAGE' ? <Image size={14} className="text-green-600" /> : <Paperclip size={14} className="text-blue-600" />}
                              {file.originalFileName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marks (0 - {answer.maxMarks})
                      </label>
                      <input
                        type="number"
                        value={markingForm[answer.questionId]?.marks ?? ''}
                        onChange={(e) => setMarkingForm({
                          ...markingForm,
                          [answer.questionId]: {
                            ...markingForm[answer.questionId],
                            marks: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        min={0}
                        max={answer.maxMarks}
                        disabled={saving}
                      />
                    </div>

                    <div className="flex-[2]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                      <input
                        type="text"
                        value={markingForm[answer.questionId]?.comment || ''}
                        onChange={(e) => setMarkingForm({
                          ...markingForm,
                          [answer.questionId]: {
                            ...markingForm[answer.questionId],
                            comment: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Feedback for student"
                        disabled={saving}
                      />
                    </div>

                    <button
                      onClick={() => handleMarkQuestion(answer.questionId)}
                      disabled={saving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        answer.status === 'MARKED'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {answer.status === 'MARKED' ? <Check size={18} /> : <Save size={18} />}
                      {answer.status === 'MARKED' ? 'Update' : 'Save'}
                    </button>
                  </div>

                  {answer.status === 'MARKED' && answer.adminComment && (
                    <div className="mt-3 p-2 bg-gray-100 rounded text-sm text-gray-600">
                      <span className="font-medium">Comment:</span> {answer.adminComment}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={closeSubmission}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
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

export default AdminMarking;
