import { useState, useEffect } from 'react';
import { quizAPI, leaderboardAPI } from '../services/api';
import { Trophy, Award, Clock, Target, Users, ChevronDown, ChevronUp, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';

const Results = () => {
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await quizAPI.getMyResults();
      setResults(response.data.data || []);
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (quizId) => {
    try {
      const response = await leaderboardAPI.getByQuiz(quizId);
      setLeaderboard(response.data.data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  const toggleResult = (result) => {
    if (selectedResult?.quizId === result.quizId) {
      setSelectedResult(null);
      setLeaderboard(null);
    } else {
      setSelectedResult(result);
      fetchLeaderboard(result.quizId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Quiz Results</h1>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Trophy className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Results Yet</h2>
          <p className="text-gray-500">Take some quizzes to see your results here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => {
            const getPerformanceStyle = () => {
              if (!result.markingComplete) {
                return { bg: 'bg-orange-100', color: 'text-orange-600', Icon: AlertCircle };
              }
              if (result.performanceLevel === 'EXCELLENT' || result.percentage >= 80) {
                return { bg: 'bg-green-100', color: 'text-green-600', Icon: Sparkles };
              }
              if (result.performanceLevel === 'GOOD' || result.percentage >= 50) {
                return { bg: 'bg-yellow-100', color: 'text-yellow-600', Icon: Trophy };
              }
              return { bg: 'bg-red-100', color: 'text-red-600', Icon: AlertTriangle };
            };

            const style = getPerformanceStyle();

            return (
            <div key={result.quizId} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div
                onClick={() => toggleResult(result)}
                className="p-6 cursor-pointer hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${style.bg}`}>
                      <style.Icon className={style.color} size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{result.quizTitle}</h3>
                      <p className="text-sm text-gray-500">
                        Attempted on {new Date(result.attemptedAt).toLocaleDateString()}
                      </p>
                      {!result.markingComplete && (
                        <p className="text-xs text-orange-600 mt-1">
                          {result.pendingMarkingCount} question(s) pending manual marking
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      {result.markingComplete ? (
                        <>
                          <p className={`text-2xl font-bold ${style.color}`}>
                            {result.percentage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-500">
                            {result.correctAnswers}/{result.totalQuestions} correct
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-orange-600">Pending</p>
                          <p className="text-sm text-gray-500">Awaiting marking</p>
                        </>
                      )}
                    </div>
                    {selectedResult?.quizId === result.quizId ? (
                      <ChevronUp className="text-gray-400" size={24} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={24} />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {selectedResult?.quizId === result.quizId && (
                <div className="border-t border-gray-100">
                  <div className="p-6 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <Target className="mx-auto text-indigo-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-gray-800">{result.obtainedMarks}/{result.totalMarks}</p>
                        <p className="text-sm text-gray-500">Marks</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <Award className="mx-auto text-indigo-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-gray-800">{result.correctAnswers}</p>
                        <p className="text-sm text-gray-500">Correct</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <Clock className="mx-auto text-indigo-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-gray-800">
                          {Math.floor(result.timeTaken / 60)}:{(result.timeTaken % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-sm text-gray-500">Time</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <Users className="mx-auto text-indigo-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-gray-800">
                          {leaderboard?.totalParticipants || '-'}
                        </p>
                        <p className="text-sm text-gray-500">Participants</p>
                      </div>
                    </div>

                    {/* Leaderboard */}
                    {leaderboard && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-800">Leaderboard</h4>
                          <p className="text-sm text-gray-500">
                            Class Average: {leaderboard.classAverage?.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-white rounded-lg overflow-hidden">
                          <div className="overflow-x-auto custom-scrollbar"><table className="w-full min-w-[560px]">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Rank</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Batch</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Score</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {leaderboard.entries?.slice(0, 10).map((entry) => (
                                <tr
                                  key={entry.rank}
                                  className={entry.isCurrentUser ? 'bg-indigo-50' : ''}
                                >
                                  <td className="px-4 py-3">
                                    {entry.rank <= 3 ? (
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-sm font-bold ${
                                        entry.rank === 1 ? 'bg-yellow-500' :
                                        entry.rank === 2 ? 'bg-gray-400' : 'bg-orange-400'
                                      }`}>
                                        {entry.rank}
                                      </span>
                                    ) : (
                                      <span className="text-gray-600">{entry.rank}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-800">
                                    {entry.name}
                                    {entry.isCurrentUser && (
                                      <span className="ml-2 text-xs text-indigo-600">(You)</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">Batch {entry.batch}</td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                                    {entry.percentage.toFixed(1)}%
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-600">
                                    {Math.floor(entry.timeTaken / 60)}:{(entry.timeTaken % 60).toString().padStart(2, '0')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Results;
