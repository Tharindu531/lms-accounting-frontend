import { useCallback, useEffect, useState } from 'react';
import { paymentAPI, userAPI } from '../../services/api';
import { CreditCard, Plus, Search, X, Save, Trash2, Calendar } from 'lucide-react';

const ManagePayments = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    userId: '',
    year: new Date().getFullYear().toString(),
    month: String(new Date().getMonth() + 1).padStart(2, '0'),
    amount: '',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        paymentAPI.getByMonth(selectedYear, selectedMonth),
        // This page needs the full student roster (not a paginated slice)
        // to compute paid/unpaid lists — request a large page size explicitly.
        userAPI.getAll({ size: 5000 })
      ]);
      setPayments(paymentsRes.data.data || []);
      setStudents(studentsRes.data.data?.content || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = () => {
    setFormData({
      userId: '',
      year: selectedYear,
      month: selectedMonth,
      amount: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await paymentAPI.create({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      fetchData();
      setShowModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;

    try {
      await paymentAPI.delete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete payment:', err);
      alert('Failed to delete payment');
    }
  };

  const getStudentName = (userId) => {
    const student = students.find(s => s.id === userId);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown';
  };

  const getStudentBatch = (userId) => {
    const student = students.find(s => s.id === userId);
    return student?.batch || '-';
  };

  // Students who haven't paid
  const paidUserIds = payments.map(p => p.userId);
  const unpaidStudents = students.filter(s => !paidUserIds.includes(s.id));

  const filteredUnpaid = unpaidStudents.filter(s =>
    !searchTerm ||
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

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
        <h1 className="text-2xl font-bold text-gray-800">Manage Payments</h1>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paid Students */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-green-50">
            <h2 className="font-semibold text-green-800">
              Paid Students ({payments.length})
            </h2>
          </div>
          {payments.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500">No payments recorded for this month.</p>
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{getStudentName(payment.userId)}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-mono bg-gray-100 px-1 rounded">{payment.userId}</span>
                      {' • '}Batch {getStudentBatch(payment.userId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-800">Rs. {payment.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(payment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unpaid Students */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-amber-50">
            <h2 className="font-semibold text-amber-800">
              Unpaid Students ({unpaidStudents.length})
            </h2>
          </div>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
          {filteredUnpaid.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500">
                {searchTerm ? 'No matching students.' : 'All students have paid!'}
              </p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {filteredUnpaid.map((student) => (
                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{student.firstName} {student.lastName}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-mono bg-gray-100 px-1 rounded">{student.id}</span>
                      {' • '}Batch {student.batch}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        userId: student.id,
                        year: selectedYear,
                        month: selectedMonth
                      });
                      setShowModal(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                  >
                    Record Payment
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-semibold text-gray-800">Record Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id} - {s.firstName} {s.lastName} (Batch {s.batch})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (Rs.) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Save size={18} />
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePayments;
