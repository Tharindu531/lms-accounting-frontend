// Answers are kept on this device as the student works, so a refresh, a crash or a
// dropped connection doesn't lose them. Keyed per user so a shared PC never shows
// one student's answers to another; removed once the quiz is submitted.
const draftKey = (userId, quizId) => `quizDraft:${userId}:${quizId}`;
const flagKey = (userId, quizId) => `quizFlags:${userId}:${quizId}`;

/** Returns { answers, savedAt } or null. */
export const loadDraft = (userId, quizId) => {
  try {
    const raw = localStorage.getItem(draftKey(userId, quizId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { answers: parsed.answers || {}, savedAt: parsed.savedAt || 0 };
  } catch {
    return null;
  }
};

export const saveDraft = (userId, quizId, answers) => {
  try {
    localStorage.setItem(draftKey(userId, quizId), JSON.stringify({ answers, savedAt: Date.now() }));
    return true;
  } catch {
    return false; // storage full or blocked (private mode); the quiz still works
  }
};

export const clearDraft = (userId, quizId) => {
  try {
    localStorage.removeItem(draftKey(userId, quizId));
    localStorage.removeItem(flagKey(userId, quizId));
  } catch { /* ignore */ }
};

/** Questions the student flagged to come back to (this device only). */
export const loadFlags = (userId, quizId) => {
  try { return new Set(JSON.parse(localStorage.getItem(flagKey(userId, quizId)) || '[]')); } catch { return new Set(); }
};

export const saveFlags = (userId, quizId, flags) => {
  try { localStorage.setItem(flagKey(userId, quizId), JSON.stringify([...flags])); } catch { /* ignore */ }
};
