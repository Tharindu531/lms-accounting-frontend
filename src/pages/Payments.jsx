import { useState, useEffect } from 'react';
import { paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';

const Payments = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        paymentAPI.getStatus(),
        paymentAPI.getHistory()
      ]);
      setStatus(statusRes.data.data);
      setHistory(historyRes.data.data || []);
    } catch (err) {
      console.error('Failed to load payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (month, year) => {
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Payment Status</h1>

      {/* Student Info */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Student ID</p>
            <p className="font-semibold text-gray-800 font-mono">{user?.id}</p>
          </div>
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-semibold text-gray-800">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-semibold text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Batch</p>
            <p className="font-semibold text-gray-800">Batch {user?.batch}</p>
          </div>
        </div>
      </div>

      {/* Current Month Status */}
      <div className={`rounded-xl p-6 mb-8 ${
        status?.hasPaidCurrentMonth
          ? 'bg-green-50 border border-green-200'
          : 'bg-amber-50 border border-amber-200'
      }`}>
        <div className="flex items-center gap-4">
          {status?.hasPaidCurrentMonth ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={48} />
          ) : (
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={48} />
          )}
          <div>
            <h2 className={`text-xl font-semibold ${
              status?.hasPaidCurrentMonth ? 'text-green-800' : 'text-amber-800'
            }`}>
              {status?.hasPaidCurrentMonth
                ? 'Payment Up to Date'
                : 'Payment Required'}
            </h2>
            <p className={status?.hasPaidCurrentMonth ? 'text-green-600' : 'text-amber-600'}>
              {status?.hasPaidCurrentMonth
                ? `Your payment for ${status?.month} ${status?.year} has been confirmed.`
                : `Please contact your administrator to complete payment for ${status?.month} ${status?.year}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No payment records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((payment) => (
              <div key={payment.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {formatMonth(payment.month, payment.year)}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar size={14} />
                      Paid on {new Date(payment.paidAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-800">
                    Rs. {payment.amount.toLocaleString()}
                  </p>
                  {payment.notes && (
                    <p className="text-sm text-gray-500">{payment.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
