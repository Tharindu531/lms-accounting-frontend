import axios from 'axios';
import { getToken, getTokenExpiry, setToken, clearToken } from './tokenStore';
import { clearStoredSession, loadRefreshToken, storeRefreshToken, storeUserSession } from './authSession';

// Base URL is the Railway origin only — all paths include /api explicitly.
// DO NOT add /api here: axios drops the baseURL path when request paths start with /
let API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL && !API_URL.startsWith('http')) {
  API_URL = 'https://' + API_URL;
}

const api = axios.create({
  baseURL: API_URL,
  // A stalled request ends with a clear error instead of an endless spinner.
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * The server turned the refresh token down (expired, revoked by a password change,
 * account deleted or disabled). Only this ends the session; a dropped connection,
 * a timeout or a server restart does not.
 */
export class SessionExpiredError extends Error {
  constructor(message = 'Your session has ended. Please sign in again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

// /api/auth/refresh answers 400 for a bad, expired or revoked refresh token.
const isRejected = (err) => [400, 401, 403].includes(err?.response?.status);

// One refresh at a time, shared by the 401 handler, app start-up and the keep-alive below.
let refreshPromise = null;

/** Swaps the stored refresh token for a new token pair. Resolves to the response data. */
export const refreshSession = () => {
  if (refreshPromise) return refreshPromise;
  const refreshToken = loadRefreshToken();
  if (!refreshToken) return Promise.reject(new SessionExpiredError());

  refreshPromise = axios
      .post(`${API_URL}/api/auth/refresh`, { refreshToken }, { timeout: 20000 })
      .then((response) => {
        const data = response.data.data;
        setToken(data.accessToken);
        storeRefreshToken(data.refreshToken);
        if (data.user) storeUserSession(data.user, !!data.requirePasswordChange);
        return data;
      })
      .catch((err) => {
        throw isRejected(err) ? new SessionExpiredError(err.response?.data?.message) : err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
};

const forceLogout = () => {
  clearToken();
  clearStoredSession();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // A GET that failed on the network (mobile data dropping, timeout) is safe to
      // repeat, so retry it once before showing an error.
      if (!error.response && originalRequest && !originalRequest._networkRetry &&
          (originalRequest.method || 'get').toLowerCase() === 'get' && !axios.isCancel(error)) {
        originalRequest._networkRetry = true;
        await new Promise((r) => setTimeout(r, 800));
        return api(originalRequest);
      }

      // Only intercept 401s; skip refresh endpoint to avoid infinite loop
      if (
          error.response?.status !== 401 ||
          originalRequest._retry ||
          originalRequest.url?.includes('/api/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const { accessToken } = await refreshSession();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Sign out only when the server refused the session. A network error or a
        // server restart fails this one request; the user stays signed in and the
        // next request (or the keep-alive below) tries again.
        if (refreshError instanceof SessionExpiredError) forceLogout();
        return Promise.reject(refreshError);
      }
    }
);

// Renew the access token a little before it expires, and straight away when the
// tab comes back into view or the device reconnects. Without this the first tap
// after a phone wakes up hits an expired token while the network is still waking.
const RENEW_BEFORE_MS = 2 * 60 * 1000;
let keepAliveStarted = false;

const renewIfDue = () => {
  if (!loadRefreshToken() || document.visibilityState !== 'visible' || !navigator.onLine) return;
  const expiry = getTokenExpiry();
  if (getToken() && expiry && expiry - Date.now() > RENEW_BEFORE_MS) return;
  refreshSession().catch((err) => {
    if (err instanceof SessionExpiredError) forceLogout();
    // Anything else: try again on the next tick, focus or reconnect.
  });
};

export const startSessionKeepAlive = () => {
  if (keepAliveStarted) return;
  keepAliveStarted = true;
  setInterval(renewIfDue, 60 * 1000);
  document.addEventListener('visibilitychange', renewIfDue);
  window.addEventListener('online', renewIfDue);
  window.addEventListener('focus', renewIfDue);
};

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  refresh: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
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
  getSheet: (year, month, params = {}) => api.get(`/api/payments/month/${year}/${month}/sheet`, { params }),
  createBulk: (data) => api.post('/api/payments/bulk', data),
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
  saveDraft: (quizId, answers) => api.put(`/api/quizzes/${quizId}/draft`, { answers }),
  getMyResults: () => api.get('/api/quizzes/my-results'),
  getMyQuizResult: (quizId) => api.get(`/api/quizzes/my-results/${quizId}`),
  // Admin
  getAllAdmin: () => api.get('/api/quizzes/admin/all'),
  create: (data) => api.post('/api/quizzes', data),
  update: (id, data) => api.put(`/api/quizzes/${id}`, data),
  delete: (id) => api.delete(`/api/quizzes/${id}`),
  // Questions always come from the bank: picked by hand, or drawn at random.
  addFromBank: (quizId, questionIds) => api.post(`/api/quizzes/${quizId}/questions/from-bank`, { questionIds }),
  updateQuestion: (quizId, questionId, data) => api.put(`/api/quizzes/${quizId}/questions/${questionId}`, data),
  removeQuestion: (quizId, questionId) => api.delete(`/api/quizzes/${quizId}/questions/${questionId}`),
  reorderQuestions: (quizId, ids) => api.put(`/api/quizzes/${quizId}/questions/order`, ids),
  duplicate: (quizId) => api.post(`/api/quizzes/${quizId}/duplicate`),
  // Create from units
  createFromUnits: (data) => api.post('/api/quizzes/from-units', data),
  // Question Bank
  getQuestionBank: (unitId) => api.get('/api/quizzes/question-bank', { params: { unitId } }),
  getQuestionBankStats: () => api.get('/api/quizzes/question-bank/stats'),
  // Repeated params (unitIds=1&unitIds=2), the shape Spring reads as a list.
  searchBank: (params) => api.get('/api/quizzes/question-bank/search', { params, paramsSerializer: { indexes: null } }),
  randomDraw: (data) => api.post('/api/quizzes/question-bank/random-draw', data),
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
  // Server-paginated + filtered now that there can be ~5,000 students.
  getAll: (params = {}) => api.get('/api/admin/users', { params }),
  getById: (id) => api.get(`/api/admin/users/${id}`),
  getByBatch: (batch) => api.get(`/api/admin/users/batch/${batch}`),
  create: (data) => api.post('/api/admin/users', data),
  delete: (id) => api.delete(`/api/admin/users/${id}`),
};

// Instructor APIs (Admin)
export const instructorAPI = {
  getAll: () => api.get('/api/admin/instructors'),
  create: (data) => api.post('/api/admin/instructors', data),
  delete: (id) => api.delete(`/api/admin/instructors/${id}`),
};

// Batch APIs
export const batchAPI = {
  // Public - for registration
  getActive: () => api.get('/api/batches'),
  // Admin
  getAll: () => api.get('/api/admin/batches'),
  create: (data) => api.post('/api/admin/batches', data),
  update: (id, data) => api.put(`/api/admin/batches/${id}`, data),
  deletePreview: (id) => api.get(`/api/admin/batches/${id}/delete-preview`),
  export: (id) => api.get(`/api/admin/batches/${id}/export`, { responseType: 'blob' }),
  // confirm = the batch name as the admin typed it; the server checks it again.
  delete: (id, confirm) => api.delete(`/api/admin/batches/${id}`, { params: { confirm } }),
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
  reorder: (parentId, ids) => api.put('/api/units/order', { parentId, ids }),
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