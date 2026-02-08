import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { quizAPI, lessonAPI, userAPI } from '../../services/api';

const DashboardFilters = ({ onFilterChange, showQuizFilter = false, showLessonFilter = false, showStudentFilter = false }) => {
  const [batches, setBatches] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const usersRes = await userAPI.getAll();
        const users = usersRes.data.data || [];
        setStudents(users.filter(u => u.userType === 'STUDENT'));

        const uniqueBatches = [...new Set(users.filter(u => u.userType === 'STUDENT').map(u => u.batch))].sort((a, b) => a - b);
        setBatches(uniqueBatches);

        if (showQuizFilter) {
          const quizzesRes = await quizAPI.getAllAdmin();
          setQuizzes(quizzesRes.data.data || []);
        }

        if (showLessonFilter) {
          const lessonsRes = await lessonAPI.getAllAdmin();
          setLessons(lessonsRes.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, [showQuizFilter, showLessonFilter]);

  const handleBatchToggle = (batch) => {
    const newBatches = selectedBatches.includes(batch)
      ? selectedBatches.filter(b => b !== batch)
      : [...selectedBatches, batch];
    setSelectedBatches(newBatches);
  };

  const applyFilters = () => {
    const filters = {};
    if (selectedBatches.length > 0) filters.batches = selectedBatches;
    if (selectedQuiz) filters.quizId = selectedQuiz;
    if (selectedLesson) filters.lessonId = selectedLesson;
    if (selectedStudent) filters.studentId = selectedStudent;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    onFilterChange(filters);
  };

  const clearFilters = () => {
    setSelectedBatches([]);
    setSelectedQuiz('');
    setSelectedLesson('');
    setSelectedStudent('');
    setStartDate('');
    setEndDate('');
    onFilterChange({});
  };

  const hasActiveFilters = selectedBatches.length > 0 || selectedQuiz || selectedLesson || selectedStudent || startDate || endDate;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition"
        >
          <Filter size={20} />
          <span className="font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition"
          >
            <X size={16} />
            Clear all
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Batch Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batches</label>
            <div className="flex flex-wrap gap-2">
              {batches.map(batch => (
                <button
                  key={batch}
                  onClick={() => handleBatchToggle(batch)}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    selectedBatches.includes(batch)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Batch {batch}
                </button>
              ))}
            </div>
          </div>

          {/* Quiz Filter */}
          {showQuizFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz</label>
              <select
                value={selectedQuiz}
                onChange={(e) => setSelectedQuiz(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Quizzes</option>
                {quizzes.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Lesson Filter */}
          {showLessonFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lesson</label>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Lessons</option>
                {lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>{lesson.lessonName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Student Filter */}
          {showStudentFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Students</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} (Batch {student.batch})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;
