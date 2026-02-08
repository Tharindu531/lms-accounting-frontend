import { useState, useEffect } from 'react';
import { BarChart3, Trophy, Users, BookOpen } from 'lucide-react';
import { adminDashboardAPI } from '../../services/api';
import DashboardFilters from '../../components/dashboard/DashboardFilters';
import OverviewStats from '../../components/dashboard/OverviewStats';
import LeaderboardWidget from '../../components/dashboard/LeaderboardWidget';
import StudentResultsWidget from '../../components/dashboard/StudentResultsWidget';
import LessonProgressWidget from '../../components/dashboard/LessonProgressWidget';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  const [overviewData, setOverviewData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [studentResultsData, setStudentResultsData] = useState([]);
  const [lessonProgressData, setLessonProgressData] = useState([]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'students', label: 'Student Results', icon: Users },
    { id: 'lessons', label: 'Lesson Progress', icon: BookOpen },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview':
          const overviewRes = await adminDashboardAPI.getOverview(filters);
          setOverviewData(overviewRes.data.data);
          break;
        case 'leaderboard':
          if (filters.quizId) {
            const leaderboardRes = await adminDashboardAPI.getLeaderboard(filters.quizId, filters);
            setLeaderboardData(leaderboardRes.data.data);
          } else {
            setLeaderboardData([]);
          }
          break;
        case 'students':
          const studentsRes = await adminDashboardAPI.getStudentResults(filters);
          setStudentResultsData(studentsRes.data.data);
          break;
        case 'lessons':
          const lessonsRes = await adminDashboardAPI.getLessonProgress(filters);
          setLessonProgressData(lessonsRes.data.data);
          break;
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewStats data={overviewData} loading={loading} />;
      case 'leaderboard':
        return (
          <LeaderboardWidget
            data={leaderboardData}
            loading={loading}
            quizRequired={!filters.quizId}
          />
        );
      case 'students':
        return <StudentResultsWidget data={studentResultsData} loading={loading} />;
      case 'lessons':
        return <LessonProgressWidget data={lessonProgressData} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
        <p className="text-gray-500">Monitor student performance and progress</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <DashboardFilters
        onFilterChange={handleFilterChange}
        showQuizFilter={activeTab === 'leaderboard'}
        showLessonFilter={activeTab === 'lessons'}
        showStudentFilter={activeTab === 'students'}
      />

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default AdminDashboard;
