import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

// Student pages
import Dashboard from './pages/Dashboard';
import Lessons from './pages/Lessons';
import Quizzes from './pages/Quizzes';
import Results from './pages/Results';
import Payments from './pages/Payments';

// Admin pages
import Students from './pages/admin/Students';
import ManageBatches from './pages/admin/ManageBatches';
import ManageUnits from './pages/admin/ManageUnits';
import ManageLessons from './pages/admin/ManageLessons';
import ManageQuizzes from './pages/admin/ManageQuizzes';
import QuestionBank from './pages/admin/QuestionBank';
import AdminMarking from './pages/admin/AdminMarking';
import ManagePayments from './pages/admin/ManagePayments';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lessons"
            element={
              <ProtectedRoute>
                <Layout>
                  <Lessons />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <Layout>
                  <Quizzes />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <Layout>
                  <Results />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Layout>
                  <Payments />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/batches"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <ManageBatches />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/units"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <ManageUnits />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/lessons"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <ManageLessons />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/quizzes"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <ManageQuizzes />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/question-bank"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <QuestionBank />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/marking"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminMarking />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <ManagePayments />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
