import { Users, BookOpen, FileQuestion, Trophy, TrendingUp, CheckCircle } from 'lucide-react';

const OverviewStats = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: 'Total Students',
      value: data.totalStudents,
      icon: Users,
      color: 'indigo',
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-600'
    },
    {
      label: 'Total Lessons',
      value: data.totalLessons,
      icon: BookOpen,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      label: 'Total Quizzes',
      value: data.totalQuizzes,
      icon: FileQuestion,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      label: 'Avg Quiz Score',
      value: `${data.averageQuizScore?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    },
    {
      label: 'Quiz Attempts',
      value: data.quizAttempts,
      icon: Trophy,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      label: 'Lessons Completed',
      value: data.completedLessons,
      icon: CheckCircle,
      color: 'teal',
      bgColor: 'bg-teal-100',
      textColor: 'text-teal-600'
    }
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                <stat.icon className={stat.textColor} size={20} />
              </div>
              <div>
                <p className="text-gray-500 text-xs">{stat.label}</p>
                <p className="text-xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Students by Batch */}
      {data.studentsByBatch && Object.keys(data.studentsByBatch).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Students by Batch</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(data.studentsByBatch)
              .sort(([a], [b]) => a - b)
              .map(([batch, count]) => (
                <div key={batch} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">Batch {batch}</p>
                  <p className="text-2xl font-bold text-indigo-600">{count}</p>
                  <p className="text-xs text-gray-400">students</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewStats;
