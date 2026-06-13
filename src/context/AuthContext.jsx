import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { getToken, setToken, clearToken } from '../services/tokenStore';
import {
  clearStoredSession,
  loadRefreshToken,
  loadRequirePasswordChange,
  loadStoredUser,
  storeRefreshToken,
  storeUserSession,
} from '../services/authSession';
import AuthContext from './AuthContextStore';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      const savedUser = loadStoredUser();
      const savedToken = getToken();
      const savedRefresh = loadRefreshToken();

      // Nothing stored — not logged in
      if (!savedUser && !savedRefresh) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Access token already in memory (same JS session, e.g. hot-reload) — validate it
      if (savedToken) {
        try {
          await authAPI.getMe();
          if (!cancelled) {
            setUser(savedUser);
            setRequirePasswordChange(loadRequirePasswordChange());
          }
        } catch {
          // Access token invalid; fall through to refresh below
          clearToken();
          await tryRefresh(cancelled, savedRefresh);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      // No access token in memory (page refresh) — use refresh token to restore session silently
      await tryRefresh(cancelled, savedRefresh);
      if (!cancelled) setLoading(false);
    };

    const tryRefresh = async (cancelled, refreshToken) => {
      if (!refreshToken) {
        if (!cancelled) {
          clearToken();
          clearStoredSession();
          setUser(null);
          setRequirePasswordChange(false);
        }
        return;
      }

      try {
        const response = await authAPI.refresh(refreshToken);
        const { accessToken, refreshToken: newRefresh, user: freshUser, requirePasswordChange: reqPC } =
          response.data.data;

        setToken(accessToken);
        storeRefreshToken(newRefresh);
        storeUserSession(freshUser, !!reqPC);

        if (!cancelled) {
          setUser(freshUser);
          setRequirePasswordChange(!!reqPC);
        }
      } catch {
        if (!cancelled) {
          clearToken();
          clearStoredSession();
          setUser(null);
          setRequirePasswordChange(false);
        }
      }
    };

    initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const result = response.data;

    if (!result.success && result.message === 'PHONE_VERIFICATION_REQUIRED') {
      return { phoneVerificationRequired: true };
    }

    const { accessToken, refreshToken, user: userData, requirePasswordChange: reqPC } = result.data;

    setToken(accessToken);
    storeRefreshToken(refreshToken);
    storeUserSession(userData, reqPC);
    setUser(userData);
    setRequirePasswordChange(!!reqPC);

    return { user: userData, requirePasswordChange: reqPC, phoneVerificationRequired: false };
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    return response.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const response = await authAPI.changePassword({ currentPassword, newPassword });
    const { accessToken, refreshToken, user: userData } = response.data.data;

    setToken(accessToken);
    storeRefreshToken(refreshToken);
    storeUserSession(userData, false);
    setUser(userData);
    setRequirePasswordChange(false);

    return userData;
  };

  const logout = () => {
    clearToken();
    clearStoredSession();
    setUser(null);
    setRequirePasswordChange(false);
  };

  const isAdmin = user?.userType === 'ADMIN';
  const isInstructor = user?.userType === 'INSTRUCTOR';
  const isStudent = user?.userType === 'STUDENT';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      changePassword,
      isAdmin,
      isInstructor,
      isStudent,
      isAuthenticated: !!user && (!!getToken() || !!loadRefreshToken()),
      requirePasswordChange
    }}>
      {children}
    </AuthContext.Provider>
  );
};
