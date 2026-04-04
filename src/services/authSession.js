const USER_KEY = 'user';
const REQUIRE_PASSWORD_CHANGE_KEY = 'requirePasswordChange';

export const loadStoredUser = () => {
  const value = localStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
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

export const clearStoredSession = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REQUIRE_PASSWORD_CHANGE_KEY);
};
