import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || '/api';
// Ensure the URL has a protocol so it's not treated as a relative path
if (API_URL !== '/api' && !API_URL.startsWith('http')) {
  API_URL = 'https://' + API_URL;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  verifyPhone: (data) => api.post('/auth/verify-phone', data),
  resendPhoneOtp: (phone) => api.post('/auth/resend-phone-otp', null, { params: { phone } }),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Payment APIs
export const paymentAPI = {
  getStatus: () => api.get('/payments/status'),
  getHistory: () => api.get('/payments/history'),
  create: (data) => api.post('/payments', data),
  getByMonth: (year, month) => api.get(`/payments/month/${year}/${month}`),
  getByUser: (userId) => api.get(`/payments/user/${userId}`),
  delete: (id) => api.delete(`/payments/${id}`),
};

// Lesson APIs
export const lessonAPI = {
  getAll: () => api.get('/lessons'),
  getById: (id) => api.get(`/lessons/${id}`),
  updateProgress: (id, data) => api.post(`/lessons/${id}/progress`, data),
  // Admin
  getAllAdmin: () => api.get('/lessons/admin/all'),
  create: (data) => api.post('/lessons', data),
  update: (id, data) => api.put(`/lessons/${id}`, data),
  delete: (id) => api.delete(`/lessons/${id}`),
};

// Quiz APIs
export const quizAPI = {
  getAll: () => api.get('/quizzes'),
  getForAttempt: (id) => api.get(`/quizzes/${id}/attempt`),
  submit: (data) => api.post('/quizzes/submit', data),
  getMyResults: () => api.get('/quizzes/my-results'),
  // Admin
  getAllAdmin: () => api.get('/quizzes/admin/all'),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  addQuestion: (quizId, data) => api.post(`/quizzes/${quizId}/questions`, data),
  // Create from units
  createFromUnits: (data) => api.post('/quizzes/from-units', data),
  // Question Bank
  getQuestionBank: (unitId) => api.get('/quizzes/question-bank', { params: { unitId } }),
  getQuestionBankStats: () => api.get('/quizzes/question-bank/stats'),
  addToQuestionBank: (data) => api.post('/quizzes/question-bank', data),
  updateBankQuestion: (id, data) => api.put(`/quizzes/question-bank/${id}`, data),
  deleteBankQuestion: (id) => api.delete(`/quizzes/question-bank/${id}`),
  // Admin Marking
  getPendingMarking: () => api.get('/quizzes/admin/pending-marking'),
  getSubmissionForMarking: (id) => api.get(`/quizzes/admin/marking/${id}`),
  markQuestion: (data) => api.post('/quizzes/admin/mark', data),
};

// Leaderboard APIs
export const leaderboardAPI = {
  getByQuiz: (quizId, batch) => api.get(`/leaderboard/quiz/${quizId}`, { params: { batch } }),
  getStats: (quizId, batch) => api.get(`/leaderboard/quiz/${quizId}/stats`, { params: { batch } }),
};

// User APIs (Admin)
export const userAPI = {
  getAll: () => api.get('/admin/users'),
  getById: (id) => api.get(`/admin/users/${id}`),
  getByBatch: (batch) => api.get(`/admin/users/batch/${batch}`),
  create: (data) => api.post('/admin/users', data),
};

// Batch APIs
export const batchAPI = {
  // Public - for registration
  getActive: () => api.get('/batches'),
  // Admin
  getAll: () => api.get('/admin/batches'),
  create: (data) => api.post('/admin/batches', data),
  update: (id, data) => api.put(`/admin/batches/${id}`, data),
  delete: (id) => api.delete(`/admin/batches/${id}`),
};

// Unit APIs
export const unitAPI = {
  // Public
  getActive: () => api.get('/units'),
  getById: (id) => api.get(`/units/${id}`),
  // Admin
  getAll: () => api.get('/units/all'),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

// Admin Dashboard APIs
export const adminDashboardAPI = {
  getOverview: (filters = {}) => api.get('/admin/dashboard/overview', { params: filters }),
  getLeaderboard: (quizId, filters = {}) => api.get('/admin/dashboard/leaderboard', { params: { quizId, ...filters } }),
  getStudentResults: (filters = {}) => api.get('/admin/dashboard/student-results', { params: filters }),
  getLessonProgress: (filters = {}) => api.get('/admin/dashboard/lesson-progress', { params: filters }),
};

// File Upload APIs
export const fileAPI = {
  // Admin: Upload for lesson
  uploadForLesson: (lessonId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/files/lesson/${lessonId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Admin: Upload for question
  uploadForQuestion: (questionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/files/question/${questionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Student: Upload for answer
  uploadForAnswer: (quizMarksId, questionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/files/answer/${quizMarksId}/${questionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Get attachments
  getLessonAttachments: (lessonId) => api.get(`/files/lesson/${lessonId}`),
  getQuestionAttachments: (questionId) => api.get(`/files/question/${questionId}`),
  getAnswerAttachments: (quizMarksId, questionId) => api.get(`/files/answer/${quizMarksId}/${questionId}`),

  // Get presigned URL
  getPresignedUrl: (attachmentId, expirationMinutes = 60) =>
    api.get(`/files/${attachmentId}/presigned`, { params: { expirationMinutes } }),

  // Delete attachment
  delete: (attachmentId) => api.delete(`/files/${attachmentId}`),
};

export default api;
