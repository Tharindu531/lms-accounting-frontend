import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { paymentAPI, lessonAPI, quizAPI } from '../services/api';
import {
  BookOpen, FileQuestion, Trophy, CreditCard,
  AlertTriangle, CheckCircle, Clock
} from 'lucide-react';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!isAdmin) {
          const [paymentRes, lessonsRes, quizzesRes, resultsRes] = await Promise.all([
            paymentAPI.getStatus(),
            lessonAPI.getAll().catch(() => ({ data: { data: [] } })),
            quizAPI.getAll().catch(() => ({ data: { data: [] } })),
            quizAPI.getMyResults().catch(() => ({ data: { data: [] } }))
          ]);

          setPaymentStatus(paymentRes.data.data);
          setLessons(lessonsRes.data.data || []);
          setQuizzes(quizzesRes.data.data || []);
          setResults(resultsRes.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/admin/students" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Trophy className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Manage</p>
                <p className="text-lg font-semibold text-gray-800">Students</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/lessons" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Manage</p>
                <p className="text-lg font-semibold text-gray-800">Lessons</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/quizzes" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileQuestion className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Manage</p>
                <p className="text-lg font-semibold text-gray-800">Quizzes</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/payments" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CreditCard className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Manage</p>
                <p className="text-lg font-semibold text-gray-800">Payments</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Welcome back, {user?.firstName}!
      </h1>
      <p className="text-gray-500 mb-4">Here's your learning overview</p>

      {/* Student Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Student ID</p>
            <p className="font-semibold text-gray-800">{user?.id}</p>
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

      {/* Payment Status Banner */}
      {paymentStatus && !paymentStatus.hasPaidCurrentMonth && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-amber-600" size={24} />
          <div>
            <p className="font-medium text-amber-800">Payment Required</p>
            <p className="text-sm text-amber-600">
              Please complete your payment for {paymentStatus.month} {paymentStatus.year} to access lessons and quizzes.
            </p>
          </div>
        </div>
      )}

      {paymentStatus?.hasPaidCurrentMonth && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <p className="font-medium text-green-800">Payment Up to Date</p>
            <p className="text-sm text-green-600">
              Your payment for {paymentStatus.month} {paymentStatus.year} is confirmed.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <BookOpen className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Available</p>
              <p className="text-2xl font-bold text-gray-800">{lessons.length}</p>
              <p className="text-gray-500 text-sm">Lessons</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-2xl font-bold text-gray-800">
                {lessons.filter(l => l.completed).length}
              </p>
              <p className="text-gray-500 text-sm">Lessons</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileQuestion className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Available</p>
              <p className="text-2xl font-bold text-gray-800">{quizzes.length}</p>
              <p className="text-gray-500 text-sm">Quizzes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Trophy className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Attempted</p>
              <p className="text-2xl font-bold text-gray-800">{results.length}</p>
              <p className="text-gray-500 text-sm">Quizzes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Quiz Results</h2>
          <div className="space-y-3">
            {results.slice(0, 3).map((result, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{result.quizTitle}</p>
                  <p className="text-sm text-gray-500">
                    {result.correctAnswers}/{result.totalQuestions} correct
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    result.percentage >= 70 ? 'text-green-600' :
                    result.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {result.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/results" className="block mt-4 text-center text-indigo-600 hover:underline">
            View all results
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/lessons" className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-6 text-white hover:shadow-lg transition">
          <BookOpen size={32} className="mb-4" />
          <h3 className="text-xl font-semibold mb-2">Continue Learning</h3>
          <p className="text-indigo-100">Access your video lessons and track progress</p>
        </Link>

        <Link to="/quizzes" className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white hover:shadow-lg transition">
          <FileQuestion size={32} className="mb-4" />
          <h3 className="text-xl font-semibold mb-2">Take a Quiz</h3>
          <p className="text-green-100">Test your knowledge and earn marks</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
