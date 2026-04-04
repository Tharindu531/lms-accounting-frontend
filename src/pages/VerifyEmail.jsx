import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const token = searchParams.get('token');
      if (!token) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
        }
        return;
      }

      try {
        const res = await authAPI.verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
          setMessage(res.data?.message || 'Email verified successfully.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.response?.data?.message || 'Verification failed. Please try again.');
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <GraduationCap className="text-indigo-600" size={40} />
          <h1 className="text-2xl font-bold text-gray-800">Accounting with Indika Amarakoon</h1>
        </div>

        {status === 'loading' && (
          <div className="py-8">
            <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
            <p className="text-gray-600 text-lg">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <Link
              to="/login"
              className="inline-block w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8">
            <XCircle className="text-red-500 mx-auto mb-4" size={64} />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-red-600 mb-8">{message}</p>
            <Link
              to="/login"
              className="inline-block w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
