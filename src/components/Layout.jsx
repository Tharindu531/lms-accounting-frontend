import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import {
  Home, BookOpen, FileQuestion, Trophy, CreditCard,
  Users, LogOut, Menu, X, BarChart3, Layers,
  FolderOpen, Database, ClipboardCheck, GraduationCap
} from 'lucide-react';
import { useState } from 'react';

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isInstructor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const studentLinks = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/lessons', icon: BookOpen, label: 'Lessons' },
    { to: '/quizzes', icon: FileQuestion, label: 'Quizzes' },
    { to: '/results', icon: Trophy, label: 'My Results' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/admin/dashboard', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/students', icon: Users, label: 'Students' },
    { to: '/admin/instructors', icon: GraduationCap, label: 'Instructors' },
    { to: '/admin/batches', icon: Layers, label: 'Manage Batches' },
    { to: '/admin/units', icon: FolderOpen, label: 'Manage Units' },
    { to: '/admin/lessons', icon: BookOpen, label: 'Manage Lessons' },
    { to: '/admin/quizzes', icon: FileQuestion, label: 'Manage Quizzes' },
    { to: '/admin/question-bank', icon: Database, label: 'Question Bank' },
    { to: '/admin/marking', icon: ClipboardCheck, label: 'Admin Marking' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  ];

  const instructorLinks = [
    { to: '/admin/units', icon: FolderOpen, label: 'Units' },
    { to: '/admin/lessons', icon: BookOpen, label: 'Lessons' },
    { to: '/admin/quizzes', icon: FileQuestion, label: 'Quizzes' },
    { to: '/admin/question-bank', icon: Database, label: 'Question Bank' },
    { to: '/admin/marking', icon: ClipboardCheck, label: 'Marking' },
  ];

  const links = isAdmin ? adminLinks : isInstructor ? instructorLinks : studentLinks;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden flex-shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 flex items-center justify-between shadow-md z-30">
        <div className="flex items-center gap-2.5">
          <img src="/photo.webp" alt="Logo" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-300" />
          <span className="font-semibold tracking-tight">Accounting</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 lg:w-64 flex flex-col
          bg-gradient-to-b from-indigo-600 to-indigo-800 text-white
          shadow-xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}>
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 p-6 border-b border-white/10 flex-shrink-0">
            <img src="/photo.webp" alt="Indika Amarakoon" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-300 flex-shrink-0" />
            <span className="text-lg font-bold leading-tight tracking-tight">Accounting with Indika Amarakoon</span>
          </div>

          {/* Mobile-only close spacer (keeps layout consistent under fixed overlay) */}
          <div className="lg:hidden h-4 flex-shrink-0" />

          {/* User info */}
          <div className="mx-4 mt-2 lg:mt-4 p-4 rounded-xl bg-white/10 flex-shrink-0">
            <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-indigo-200 truncate">{user?.email || user?.phone}</p>
            {!isAdmin && !isInstructor && (
              <p className="text-xs text-indigo-200 mt-1 font-mono">ID: {user?.id}</p>
            )}
            {isInstructor && (
              <p className="text-xs text-indigo-200 mt-1 font-mono">{user?.id}</p>
            )}
            <span className="inline-block mt-2 px-2.5 py-1 bg-white/15 rounded-full text-xs font-medium">
              {isAdmin ? 'Admin' : isInstructor ? 'Instructor' : `Batch ${user?.batch}`}
            </span>
          </div>

          {/* Navigation — its own independent scroll region */}
          <nav className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar p-4 space-y-1 mt-2">
            {links.map((link) => {
              const IconComponent = link.icon;
              const isActive = location.pathname === link.to;
              return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150
                  ${isActive
                    ? 'bg-white text-indigo-700 shadow-md font-semibold'
                    : 'text-indigo-100 hover:bg-white/10 hover:text-white'}
                `}
              >
                <IconComponent size={19} className={isActive ? 'text-indigo-600' : 'text-indigo-200 group-hover:text-white transition-colors'} />
                <span className="text-sm">{link.label}</span>
              </Link>
              );
            })}
          </nav>

          {/* Logout — pinned via flex, not absolute positioning */}
          <div className="flex-shrink-0 p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-indigo-100 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
            >
              <LogOut size={19} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content — its own independent scroll region */}
        <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
