import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Public pages - lazy loaded
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// Student pages - lazy loaded
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Lessons = lazy(() => import('./pages/Lessons'));
const Quizzes = lazy(() => import('./pages/Quizzes'));
const Results = lazy(() => import('./pages/Results'));
const Payments = lazy(() => import('./pages/Payments'));

// Admin pages - lazy loaded
const Students = lazy(() => import('./pages/admin/Students'));
const ManageBatches = lazy(() => import('./pages/admin/ManageBatches'));
const ManageUnits = lazy(() => import('./pages/admin/ManageUnits'));
const ManageLessons = lazy(() => import('./pages/admin/ManageLessons'));
const ManageQuizzes = lazy(() => import('./pages/admin/ManageQuizzes'));
const QuestionBank = lazy(() => import('./pages/admin/QuestionBank'));
const AdminMarking = lazy(() => import('./pages/admin/AdminMarking'));
const ManagePayments = lazy(() => import('./pages/admin/ManagePayments'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

const SuspenseFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/change-password" element={<ChangePassword />} />

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
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
