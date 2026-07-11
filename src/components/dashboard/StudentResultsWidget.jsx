import { useState } from 'react';
import { Users, ChevronDown, ChevronRight, BookOpen, Trophy } from 'lucide-react';

const StudentResultsWidget = ({ data, loading }) => {
  const [expandedStudent, setExpandedStudent] = useState(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Student Results</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="text-indigo-500" size={24} />
          Student Results
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No student results found</p>
        </div>
      </div>
    );
  }

  const toggleExpand = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Users className="text-indigo-500" size={24} />
        Student Results Summary
      </h3>

      <div className="space-y-3">
        {data.map((student) => (
          <div key={student.studentId} className="border rounded-lg overflow-hidden">
            <div
              className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(student.studentId)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {expandedStudent === student.studentId ? (
                  <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{student.studentName}</p>
                  <p className="text-sm text-gray-500 truncate">{student.email}</p>
                </div>
                <span className="flex-shrink-0 px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-sm">
                  Batch {student.batch}
                </span>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 text-sm ml-8 sm:ml-0">
                <div className="text-center">
                  <p className="text-gray-500">Quizzes</p>
                  <p className="font-bold text-purple-600">{student.quizzesAttempted}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Avg Score</p>
                  <p className={`font-bold ${
                    student.averageScore >= 70 ? 'text-green-600' :
                    student.averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {student.averageScore.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Lessons</p>
                  <p className="font-bold text-blue-600">
                    {student.lessonsCompleted}/{student.totalLessons}
                  </p>
                </div>
              </div>
            </div>

            {expandedStudent === student.studentId && student.quizAttempts && student.quizAttempts.length > 0 && (
              <div className="border-t bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Quiz Attempts</p>
                <div className="space-y-2">
                  {student.quizAttempts.map((attempt, index) => (
                    <div key={index} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Trophy size={16} className="text-yellow-500 flex-shrink-0" />
                        <span className="text-gray-800 truncate">{attempt.quizTitle}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-shrink-0">
                        <span className={`font-bold ${
                          attempt.percentage >= 70 ? 'text-green-600' :
                          attempt.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {attempt.percentage.toFixed(1)}%
                        </span>
                        <span className="text-gray-500">
                          {attempt.score}/{attempt.totalMarks}
                        </span>
                        <span className="text-gray-400">
                          {Math.floor(attempt.timeTaken / 60)}:{String(attempt.timeTaken % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedStudent === student.studentId && (!student.quizAttempts || student.quizAttempts.length === 0) && (
              <div className="border-t bg-gray-50 p-4 text-center text-gray-500 text-sm">
                No quiz attempts yet
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentResultsWidget;
