import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import {
  Home, BookOpen, FileQuestion, Trophy, CreditCard,
  Users, LogOut, Menu, X, BarChart3, Layers,
  FolderOpen, Database, ClipboardCheck
} from 'lucide-react';
import { useState } from 'react';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
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
    { to: '/admin/batches', icon: Layers, label: 'Manage Batches' },
    { to: '/admin/units', icon: FolderOpen, label: 'Manage Units' },
    { to: '/admin/lessons', icon: BookOpen, label: 'Manage Lessons' },
    { to: '/admin/quizzes', icon: FileQuestion, label: 'Manage Quizzes' },
    { to: '/admin/question-bank', icon: Database, label: 'Question Bank' },
    { to: '/admin/marking', icon: ClipboardCheck, label: 'Admin Marking' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/photo.webp" alt="Logo" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-300" />
          <span className="font-bold">Accounting</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-indigo-600 text-white
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}>
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 p-6 border-b border-indigo-500">
            <img src="/photo.webp" alt="Indika Amarakoon" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-300 flex-shrink-0" />
            <span className="text-lg font-bold leading-tight">Accounting with Indika Amarakoon</span>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-indigo-500">
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-indigo-200">{user?.email}</p>
            {!isAdmin && (
              <p className="text-xs text-indigo-200 mt-1 font-mono">ID: {user?.id}</p>
            )}
            <span className="inline-block mt-2 px-2 py-1 bg-indigo-500 rounded text-xs">
              {isAdmin ? 'Admin' : `Batch ${user?.batch}`}
            </span>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {links.map((link) => {
              const IconComponent = link.icon;
              return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${location.pathname === link.to
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-100 hover:bg-indigo-500'}
                `}
              >
                <IconComponent size={20} />
                {link.label}
              </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-indigo-100 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
