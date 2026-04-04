import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { batchAPI, authAPI } from '../services/api';
import { Mail, Lock, User, Layers, AlertCircle, CheckCircle, Phone } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';

const Register = () => {
  const [regMethod, setRegMethod] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    batch: ''
  });
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'success'

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  const { register } = useAuth();

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const fetchBatches = async () => {
    try {
      const response = await batchAPI.getActive();
      setBatches(response.data.data || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        batch: parseInt(formData.batch)
      };

      if (regMethod === 'email') {
        data.email = formData.email;
      } else {
        data.phone = formData.phone;
      }

      await register(data);

      if (regMethod === 'phone') {
        setStep('otp');
        setResendCooldown(60);
      } else {
        setStep('success');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }

    setOtpError('');
    setOtpLoading(true);

    try {
      await authAPI.verifyPhone({ phone: formData.phone, otp: otpCode });
      setStep('success');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      await authAPI.resendPhoneOtp(formData.phone);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  // OTP Verification Screen
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-indigo-100 rounded-full">
              <Phone className="text-indigo-600" size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Phone</h2>
          <p className="text-gray-600 mb-8">
            Enter the 6-digit code sent to <strong>{formData.phone}</strong>
          </p>

          {otpError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
              <AlertCircle size={18} />
              {otpError}
            </div>
          )}

          {/* OTP Input */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handleOtpPaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
            ))}
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={otpLoading || otp.join('').length !== 6}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {otpLoading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <p className="text-sm text-gray-500">
            Didn't receive the code?{' '}
            {resendCooldown > 0 ? (
              <span className="text-gray-400">Resend in {resendCooldown}s</span>
            ) : (
              <button
                onClick={handleResendOtp}
                className="text-indigo-600 font-medium hover:underline"
              >
                Resend OTP
              </button>
            )}
          </p>

          <p className="text-xs text-gray-400 mt-4">OTP expires in 5 minutes</p>
        </div>
      </div>
    );
  }

  // Success Screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle className="text-green-600" size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
          {regMethod === 'email' ? (
            <>
              <p className="text-gray-600 mb-6">
                We've sent a verification email to <strong>{formData.email}</strong>.
                Please check your inbox and click the verification link to activate your account.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or contact the administrator.
              </p>
            </>
          ) : (
            <p className="text-gray-600 mb-6">
              Your phone number <strong>{formData.phone}</strong> has been verified.
              You can now log in to your account.
            </p>
          )}
          <Link
            to="/login"
            className="inline-block w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/IMG_2820.jpeg"
          alt="Indika Amarakoon Speaking"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 via-indigo-900/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
          <h2 className="text-3xl font-bold mb-3">Start Your Journey Today</h2>
          <p className="text-indigo-100 text-lg">Learn from an experienced professional and build your accounting career with confidence.</p>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="/photo.webp"
              alt="Indika Amarakoon"
              className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100 shadow-lg mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-800 text-center">Accounting with Indika Amarakoon</h1>
          </div>

          <h2 className="text-xl font-semibold text-center text-gray-700 mb-6">
            Create Account
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 mb-6">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Registration Method Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setRegMethod('email'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                regMethod === 'email'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail size={16} />
              Email
            </button>
            <button
              type="button"
              onClick={() => { setRegMethod('phone'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                regMethod === 'phone'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone size={16} />
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="John"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
            </div>

            {regMethod === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <PhoneInput
                  onChange={(full) => setFormData(prev => ({ ...prev, phone: full }))}
                  required
                  placeholder="771234567"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Batch
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select
                  name="batch"
                  value={formData.batch}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition appearance-none bg-white"
                  required
                  disabled={loadingBatches}
                >
                  <option value="">
                    {loadingBatches ? 'Loading batches...' : 'Select your batch'}
                  </option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.batchNumber}>
                      Batch {batch.batchNumber} - {batch.name}
                    </option>
                  ))}
                </select>
              </div>
              {!loadingBatches && batches.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  No batches available. Please contact the administrator.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || loadingBatches || batches.length === 0}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
