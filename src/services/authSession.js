const USER_KEY = 'user';
const REQUIRE_PASSWORD_CHANGE_KEY = 'requirePasswordChange';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const loadStoredUser = () => {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const storeUserSession = (user, requirePasswordChange = false) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (requirePasswordChange) {
    localStorage.setItem(REQUIRE_PASSWORD_CHANGE_KEY, 'true');
  } else {
    localStorage.removeItem(REQUIRE_PASSWORD_CHANGE_KEY);
  }
};

export const loadRequirePasswordChange = () =>
  localStorage.getItem(REQUIRE_PASSWORD_CHANGE_KEY) === 'true';

export const storeRefreshToken = (token) => {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const loadRefreshToken = () =>
  localStorage.getItem(REFRESH_TOKEN_KEY) || null;

export const clearStoredSession = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REQUIRE_PASSWORD_CHANGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};
