import axios from 'axios';
import { getToken, clearToken } from './tokenStore';

// Base URL is the Railway origin only — all paths include /api explicitly.
// DO NOT add /api here: axios drops the baseURL path when request paths start with /
let API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL && !API_URL.startsWith('http')) {
  API_URL = 'https://' + API_URL;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests - use in-memory token, not localStorage
api.interceptors.request.use((config) => {
  const token = getToken();
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
      clearToken();
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
  verifyEmail: (token) => api.get('/api/auth/verify-email', { params: { token } }),
  verifyPhone: (data) => api.post('/api/auth/verify-phone', data),
  resendPhoneOtp: (phone) => api.post('/api/auth/resend-phone-otp', null, { params: { phone } }),
  changePassword: (data) => api.post('/api/auth/change-password', data),
};

// Payment APIs
export const paymentAPI = {
  getStatus: () => api.get('/api/payments/status'),
  getHistory: () => api.get('/api/payments/history'),
  create: (data) => api.post('/api/payments', data),
  getByMonth: (year, month) => api.get(`/api/payments/month/${year}/${month}`),
  getByUser: (userId) => api.get(`/api/payments/user/${userId}`),
  delete: (id) => api.delete(`/api/payments/${id}`),
};

// Lesson APIs
export const lessonAPI = {
  getAll: () => api.get('/api/lessons'),
  getById: (id) => api.get(`/api/lessons/${id}`),
  updateProgress: (id, data) => api.post(`/api/lessons/${id}/progress`, data),
  // Admin
  getAllAdmin: () => api.get('/api/lessons/admin/all'),
  create: (data) => api.post('/api/lessons', data),
  update: (id, data) => api.put(`/api/lessons/${id}`, data),
  delete: (id) => api.delete(`/api/lessons/${id}`),
};

// Quiz APIs
export const quizAPI = {
  getAll: () => api.get('/api/quizzes'),
  getForAttempt: (id) => api.get(`/api/quizzes/${id}/attempt`),
  submit: (data) => api.post('/api/quizzes/submit', data),
  getMyResults: () => api.get('/api/quizzes/my-results'),
  getMyQuizResult: (quizId) => api.get(`/api/quizzes/my-results/${quizId}`),
  // Admin
  getAllAdmin: () => api.get('/api/quizzes/admin/all'),
  create: (data) => api.post('/api/quizzes', data),
  update: (id, data) => api.put(`/api/quizzes/${id}`, data),
  delete: (id) => api.delete(`/api/quizzes/${id}`),
  addQuestion: (quizId, data) => api.post(`/api/quizzes/${quizId}/questions`, data),
  // Create from units
  createFromUnits: (data) => api.post('/api/quizzes/from-units', data),
  // Question Bank
  getQuestionBank: (unitId) => api.get('/api/quizzes/question-bank', { params: { unitId } }),
  getQuestionBankStats: () => api.get('/api/quizzes/question-bank/stats'),
  addToQuestionBank: (data) => api.post('/api/quizzes/question-bank', data),
  updateBankQuestion: (id, data) => api.put(`/api/quizzes/question-bank/${id}`, data),
  deleteBankQuestion: (id) => api.delete(`/api/quizzes/question-bank/${id}`),
  // Admin Marking
  getPendingMarking: () => api.get('/api/quizzes/admin/pending-marking'),
  getSubmissionForMarking: (id) => api.get(`/api/quizzes/admin/marking/${id}`),
  markQuestion: (data) => api.post('/api/quizzes/admin/mark', data),
};

// Leaderboard APIs
export const leaderboardAPI = {
  getByQuiz: (quizId, batch) => api.get(`/api/leaderboard/quiz/${quizId}`, { params: { batch } }),
  getStats: (quizId, batch) => api.get(`/api/leaderboard/quiz/${quizId}/stats`, { params: { batch } }),
};

// User APIs (Admin)
export const userAPI = {
  getAll: () => api.get('/api/admin/users'),
  getById: (id) => api.get(`/api/admin/users/${id}`),
  getByBatch: (batch) => api.get(`/api/admin/users/batch/${batch}`),
  create: (data) => api.post('/api/admin/users', data),
};

// Batch APIs
export const batchAPI = {
  // Public - for registration
  getActive: () => api.get('/api/batches'),
  // Admin
  getAll: () => api.get('/api/admin/batches'),
  create: (data) => api.post('/api/admin/batches', data),
  update: (id, data) => api.put(`/api/admin/batches/${id}`, data),
  delete: (id) => api.delete(`/api/admin/batches/${id}`),
};

// Unit APIs
export const unitAPI = {
  // Public
  getActive: () => api.get('/api/units'),
  getById: (id) => api.get(`/api/units/${id}`),
  // Admin
  getAll: () => api.get('/api/units/all'),
  create: (data) => api.post('/api/units', data),
  update: (id, data) => api.put(`/api/units/${id}`, data),
  delete: (id) => api.delete(`/api/units/${id}`),
};

// Admin Dashboard APIs
export const adminDashboardAPI = {
  getOverview: (filters = {}) => api.get('/api/admin/dashboard/overview', { params: filters }),
  getLeaderboard: (quizId, filters = {}) => api.get('/api/admin/dashboard/leaderboard', { params: { quizId, ...filters } }),
  getStudentResults: (filters = {}) => api.get('/api/admin/dashboard/student-results', { params: filters }),
  getLessonProgress: (filters = {}) => api.get('/api/admin/dashboard/lesson-progress', { params: filters }),
};

// File Upload APIs
export const fileAPI = {
  // Admin: Upload for lesson
  uploadForLesson: (lessonId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/files/lesson/${lessonId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Admin: Upload for question
  uploadForQuestion: (questionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/files/question/${questionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Student: Upload for answer
  uploadForAnswer: (quizMarksId, questionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/files/answer/${quizMarksId}/${questionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Get attachments
  getLessonAttachments: (lessonId) => api.get(`/api/files/lesson/${lessonId}`),
  getQuestionAttachments: (questionId) => api.get(`/api/files/question/${questionId}`),
  getAnswerAttachments: (quizMarksId, questionId) => api.get(`/api/files/answer/${quizMarksId}/${questionId}`),

  // Get presigned URL
  getPresignedUrl: (attachmentId, expirationMinutes = 60) =>
    api.get(`/api/files/${attachmentId}/presigned`, { params: { expirationMinutes } }),

  // Delete attachment
  delete: (attachmentId) => api.delete(`/api/files/${attachmentId}`),
};

export default api;
