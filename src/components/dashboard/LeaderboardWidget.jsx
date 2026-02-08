import { useState } from 'react';
import { Trophy, Clock, ChevronUp, ChevronDown } from 'lucide-react';

const LeaderboardWidget = ({ data, loading, quizRequired }) => {
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');

  if (quizRequired) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Trophy className="text-yellow-500" size={24} />
          Quiz Leaderboard
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Select a quiz from the filters to view leaderboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quiz Leaderboard</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Trophy className="text-yellow-500" size={24} />
          Quiz Leaderboard
        </h3>
        <div className="text-center py-8 text-gray-500">
          <p>No quiz attempts found</p>
        </div>
      </div>
    );
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortDirection === 'desc') [aVal, bVal] = [bVal, aVal];
    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800';
    if (rank === 2) return 'bg-gray-100 text-gray-800';
    if (rank === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Trophy className="text-yellow-500" size={24} />
        Quiz Leaderboard
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th
                className="pb-3 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('rank')}
              >
                <div className="flex items-center gap-1">
                  Rank <SortIcon field="rank" />
                </div>
              </th>
              <th className="pb-3">Student</th>
              <th
                className="pb-3 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('batch')}
              >
                <div className="flex items-center gap-1">
                  Batch <SortIcon field="batch" />
                </div>
              </th>
              <th
                className="pb-3 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('percentage')}
              >
                <div className="flex items-center gap-1">
                  Score <SortIcon field="percentage" />
                </div>
              </th>
              <th
                className="pb-3 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('timeTaken')}
              >
                <div className="flex items-center gap-1">
                  <Clock size={14} /> Time <SortIcon field="timeTaken" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((entry) => (
              <tr key={entry.studentId} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getRankBadge(entry.rank)}`}>
                    {entry.rank}
                  </span>
                </td>
                <td className="py-3">
                  <div>
                    <p className="font-medium text-gray-800">{entry.studentName}</p>
                    <p className="text-xs text-gray-500">{entry.email}</p>
                  </div>
                </td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-sm">
                    {entry.batch}
                  </span>
                </td>
                <td className="py-3">
                  <div>
                    <span className={`font-bold ${
                      entry.percentage >= 70 ? 'text-green-600' :
                      entry.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {entry.percentage.toFixed(1)}%
                    </span>
                    <p className="text-xs text-gray-500">{entry.score}/{entry.totalMarks}</p>
                  </div>
                </td>
                <td className="py-3 text-gray-600">
                  {Math.floor(entry.timeTaken / 60)}:{String(entry.timeTaken % 60).padStart(2, '0')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardWidget;
