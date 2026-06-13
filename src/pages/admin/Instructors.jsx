import { useState, useEffect } from 'react';
import { instructorAPI } from '../../services/api';
import { GraduationCap, Search, Mail, Plus, X, Phone, AlertCircle, CheckCircle } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const Instructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [addMethod, setAddMethod] = useState('email');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const response = await instructorAPI.getAll();
      setInstructors(response.data.data || []);
    } catch (err) {
      console.error('Failed to load instructors:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = instructors.filter(inst => {
    const q = searchTerm.toLowerCase();
    return !searchTerm ||
      inst.firstName?.toLowerCase().includes(q) ||
      inst.lastName?.toLowerCase().includes(q) ||
      inst.email?.toLowerCase().includes(q) ||
      inst.phone?.toLowerCase().includes(q) ||
      inst.id?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredInstructors.length / ITEMS_PER_PAGE);
  const paginated = filteredInstructors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    setAddMethod('email');
    setFormError('');
    setFormSuccess('');
  };

  const openModal = () => { resetForm(); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
      };
      if (addMethod === 'email') {
        payload.email = formData.email;
      } else {
        payload.phone = formData.phone;
      }

      const response = await instructorAPI.create(payload);
      setFormSuccess(response.data.message);
      fetchInstructors();
      setTimeout(closeModal, 2000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create instructor');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Instructors</h1>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
            {instructors.length} Total
          </span>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm"
          >
            <Plus size={18} />
            Add Instructor
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by ID, name, email, or phone..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredInstructors.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No instructors found.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Instructor ID</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Instructor</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      {inst.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-medium">
                          {inst.firstName?.[0]}{inst.lastName?.[0]}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800">
                        {inst.firstName} {inst.lastName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {inst.email ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={16} />
                        {inst.email}
                      </div>
                    ) : inst.phone ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} />
                        {inst.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      inst.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {inst.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredInstructors.length)} of {filteredInstructors.length} instructors
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((page, idx, arr) => (
                <span key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      currentPage === page
                        ? 'bg-purple-600 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Instructor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Add Instructor</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                  <CheckCircle size={16} />
                  {formSuccess}
                </div>
              )}

              {/* Email / Phone Toggle */}
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => { setAddMethod('email'); setFormError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                    addMethod === 'email'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Mail size={16} />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setAddMethod('phone'); setFormError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                    addMethod === 'phone'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Phone size={16} />
                  Phone
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {addMethod === 'email' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      placeholder="instructor@example.com"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      placeholder="e.g. +94771234567"
                      required
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                {addMethod === 'email'
                  ? 'A welcome email with login credentials will be sent to the instructor.'
                  : 'A temporary password and verification OTP will be sent via SMS.'}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !!formSuccess}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {submitting ? 'Creating...' : 'Add Instructor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Instructors;
