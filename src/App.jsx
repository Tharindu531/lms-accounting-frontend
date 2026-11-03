import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import useAuth from './context/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ConfirmProvider } from './components/ui/Confirm';
import { Skeleton } from './components/ui/primitives';
import { useTheme } from './lib/theme';
import UpdatePrompt from './components/UpdatePrompt';
// Sign-in is where most visits start, so it ships in the main bundle: lazy-loading
// it added a second network round trip before the form could appear on phones.
import Login from './pages/Login';

// The signed-in shell (sidebar, menus) isn't needed on the sign-in screen.
const Layout = lazy(() => import('./components/Layout'));

// Public pages
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// Student pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Lessons = lazy(() => import('./pages/Lessons'));
const Quizzes = lazy(() => import('./pages/Quizzes'));
const Results = lazy(() => import('./pages/Results'));
const Payments = lazy(() => import('./pages/Payments'));

// Admin and instructor pages
const Students = lazy(() => import('./pages/admin/Students'));
const Instructors = lazy(() => import('./pages/admin/Instructors'));
const ManageBatches = lazy(() => import('./pages/admin/ManageBatches'));
const ManageUnits = lazy(() => import('./pages/admin/ManageUnits'));
const ManageLessons = lazy(() => import('./pages/admin/ManageLessons'));
const ManageQuizzes = lazy(() => import('./pages/admin/ManageQuizzes'));
const QuestionBank = lazy(() => import('./pages/admin/QuestionBank'));
const AdminMarking = lazy(() => import('./pages/admin/AdminMarking'));
const ManagePayments = lazy(() => import('./pages/admin/ManagePayments'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

const FullPageFallback = () => (
  <div className="min-h-dvh grid place-items-center bg-paper" role="status" aria-label="Loading">
    <img src="/avatar-96.webp" alt="" width="48" height="48" className="h-12 w-12 rounded-full opacity-80 animate-pulse" />
  </div>
);

// Shown inside the shell while a page's code loads, so the sidebar stays put.
const PageFallback = () => (
  <div role="status" aria-label="Loading" className="space-y-6">
    <Skeleton className="h-8 w-56" />
    <Skeleton className="h-4 w-80" />
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
    </div>
    <Skeleton className="h-64" />
  </div>
);

const Shell = () => (
  <ProtectedRoute>
    <Suspense fallback={<FullPageFallback />}>
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </Layout>
    </Suspense>
  </ProtectedRoute>
);

const AdminOnly = () => <ProtectedRoute adminOnly><Outlet /></ProtectedRoute>;
const StaffOnly = () => <ProtectedRoute instructorOrAdmin><Outlet /></ProtectedRoute>;
const StudentOnly = () => <ProtectedRoute studentArea><Outlet /></ProtectedRoute>;

// Admins have no student home; their home is the analytics overview.
const Home = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Dashboard />;
};

const ThemedToaster = () => {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-surface !text-ink !border-line !shadow-pop !rounded-control !font-sans',
          description: '!text-ink-2',
          success: '[&_[data-icon]]:!text-credit',
          error: '[&_[data-icon]]:!text-debit',
          warning: '[&_[data-icon]]:!text-due',
        },
      }}
    />
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConfirmProvider>
          <Router>
            <Suspense fallback={<FullPageFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/change-password" element={<ChangePassword />} />

                <Route element={<Shell />}>
                  <Route element={<StudentOnly />}>
                    <Route path="/dashboard" element={<Home />} />
                    <Route path="/lessons" element={<Lessons />} />
                    <Route path="/lessons/:lessonId" element={<Lessons />} />
                    <Route path="/quizzes" element={<Quizzes />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/payments" element={<Payments />} />
                  </Route>

                  <Route element={<AdminOnly />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/students" element={<Students />} />
                    <Route path="/admin/instructors" element={<Instructors />} />
                    <Route path="/admin/batches" element={<ManageBatches />} />
                    <Route path="/admin/payments" element={<ManagePayments />} />
                  </Route>

                  <Route element={<StaffOnly />}>
                    <Route path="/admin/units" element={<ManageUnits />} />
                    <Route path="/admin/lessons" element={<ManageLessons />} />
                    <Route path="/admin/quizzes" element={<ManageQuizzes />} />
                    <Route path="/admin/question-bank" element={<QuestionBank />} />
                    <Route path="/admin/marking" element={<AdminMarking />} />
                  </Route>
                </Route>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </Router>
          <ThemedToaster />
          {import.meta.env.PROD && <UpdatePrompt />}
        </ConfirmProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
