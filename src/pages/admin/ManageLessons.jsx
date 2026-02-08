import { useState, useEffect } from 'react';
import { lessonAPI, unitAPI, fileAPI } from '../../services/api';
import { BookOpen, Plus, Edit2, Trash2, X, Save, Upload, Paperclip, Video, FileText } from 'lucide-react';
import FileUpload, { FileList } from '../../components/FileUpload';
import FileViewer from '../../components/FileViewer';

const ManageLessons = () => {
  const [lessons, setLessons] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [formData, setFormData] = useState({
    lessonName: '',
    lessonDescription: '',
    youtubeLink: '',
    content: '',
    unitId: '',
    accessibleBatches: '',
    displayOrder: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lessonsRes, unitsRes] = await Promise.all([
        lessonAPI.getAllAdmin(),
        unitAPI.getActive()
      ]);
      setLessons(lessonsRes.data.data || []);
      setUnits(unitsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const response = await lessonAPI.getAllAdmin();
      setLessons(response.data.data || []);
    } catch (err) {
      console.error('Failed to load lessons:', err);
    }
  };

  const fetchAttachments = async (lessonId) => {
    try {
      const response = await fileAPI.getLessonAttachments(lessonId);
      setAttachments(response.data.data || []);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    }
  };

  const openModal = async (lesson = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        lessonName: lesson.lessonName,
        lessonDescription: lesson.lessonDescription || '',
        youtubeLink: lesson.youtubeLink || '',
        content: lesson.content || '',
        unitId: lesson.unitId || '',
        accessibleBatches: Array.from(lesson.accessibleBatches || []).join(', '),
        displayOrder: lesson.displayOrder || 0
      });
      await fetchAttachments(lesson.id);
    } else {
      setEditingLesson(null);
      setFormData({
        lessonName: '',
        lessonDescription: '',
        youtubeLink: '',
        content: '',
        unitId: '',
        accessibleBatches: '',
        displayOrder: lessons.length
      });
      setAttachments([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLesson(null);
    setAttachments([]);
  };

  const handleFileUpload = async (file) => {
    if (!editingLesson) {
      alert('Please save the lesson first before uploading files.');
      return;
    }
    try {
      await fileAPI.uploadForLesson(editingLesson.id, file);
      await fetchAttachments(editingLesson.id);
    } catch (err) {
      throw err;
    }
  };

  const handleFileDelete = async (attachmentId) => {
    if (!confirm('Delete this file?')) return;
    try {
      await fileAPI.delete(attachmentId);
      await fetchAttachments(editingLesson.id);
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      unitId: formData.unitId ? parseInt(formData.unitId) : null,
      accessibleBatches: formData.accessibleBatches
        .split(',')
        .map(b => parseInt(b.trim()))
        .filter(b => !isNaN(b))
    };

    try {
      if (editingLesson) {
        await lessonAPI.update(editingLesson.id, data);
        fetchLessons();
        closeModal();
      } else {
        const response = await lessonAPI.create(data);
        const newLesson = response.data.data;
        setEditingLesson(newLesson);
        fetchLessons();
        alert('Lesson created! You can now upload files.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save lesson');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      await lessonAPI.delete(id);
      fetchLessons();
    } catch (err) {
      alert('Failed to delete lesson');
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
        <h1 className="text-2xl font-bold text-gray-800">Manage Lessons</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          Add Lesson
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Lessons</h2>
          <p className="text-gray-500">Create your first lesson to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Order</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Lesson</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Batches</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600">
                    #{lesson.displayOrder}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {lesson.lessonType === 'VIDEO' && <Video size={16} className="text-red-500" />}
                      {lesson.lessonType === 'TEXT' && <FileText size={16} className="text-blue-500" />}
                      {lesson.lessonType === 'MIXED' && <Paperclip size={16} className="text-purple-500" />}
                      <div>
                        <p className="font-medium text-gray-800">{lesson.lessonName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {lesson.lessonDescription}
                        </p>
                        {lesson.unitName && (
                          <span className="text-xs text-indigo-600">{lesson.unitName}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(lesson.accessibleBatches || []).map(batch => (
                        <span key={batch} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                          Batch {batch}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      lesson.isActive !== false
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {lesson.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(lesson)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg mr-2"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lessonName}
                    onChange={(e) => setFormData({ ...formData, lessonName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="">No Unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.lessonDescription}
                  onChange={(e) => setFormData({ ...formData, lessonDescription: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube Link (optional if content provided)
                </label>
                <input
                  type="url"
                  value={formData.youtubeLink}
                  onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Content (optional if YouTube link provided)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={4}
                  placeholder="Lesson content in text format..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accessible Batches * (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.accessibleBatches}
                  onChange={(e) => setFormData({ ...formData, accessibleBatches: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="1, 2, 3"
                  required
                />
              </div>

              {/* File Upload Section */}
              {editingLesson && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload size={16} className="inline mr-1" />
                    Attachments (PDFs, Images, Presentations)
                  </label>
                  <FileUpload
                    onUpload={handleFileUpload}
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.ppt,.pptx"
                    maxSize={50}
                    multiple={true}
                  />
                  <FileList
                    files={attachments}
                    onDelete={handleFileDelete}
                    showDelete={true}
                  />
                </div>
              )}

              {!editingLesson && (
                <p className="text-sm text-gray-500 italic">
                  Save the lesson first to upload files.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <Save size={18} />
                  {editingLesson ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
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

export default ManageLessons;
