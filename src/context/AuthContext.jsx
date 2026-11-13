import { useCallback, useEffect, useMemo, useState } from 'react';
import { authAPI, refreshSession, SessionExpiredError, startSessionKeepAlive } from '../services/api';
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
import { queryClient } from '../lib/queryClient';

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

      // Access token already in memory (same JS session, e.g. hot-reload): nothing to restore.
      // If it has expired, the first request renews it through the 401 handler.
      if (savedToken && savedUser) {
        if (!cancelled) {
          setUser(savedUser);
          setRequirePasswordChange(loadRequirePasswordChange());
          setLoading(false);
        }
        return;
      }

      // No access token in memory (page load) — use the refresh token to restore the session.
      try {
        const data = await refreshSession();
        if (!cancelled) {
          setUser(data.user ?? savedUser);
          setRequirePasswordChange(!!data.requirePasswordChange);
        }
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          // The server refused the session: sign out for real.
          clearToken();
          clearStoredSession();
          if (!cancelled) {
            setUser(null);
            setRequirePasswordChange(false);
          }
        } else if (!cancelled) {
          // Offline, timed out or the server is restarting. Keep the user signed in with
          // the saved profile; requests renew the token once the server can be reached.
          setUser(savedUser);
          setRequirePasswordChange(loadRequirePasswordChange());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initializeAuth();
    startSessionKeepAlive();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
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
  }, []);

  const register = useCallback(async (data) => {
    const response = await authAPI.register(data);
    return response.data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const response = await authAPI.changePassword({ currentPassword, newPassword });
    const { accessToken, refreshToken, user: userData } = response.data.data;

    setToken(accessToken);
    storeRefreshToken(refreshToken);
    storeUserSession(userData, false);
    setUser(userData);
    setRequirePasswordChange(false);

    return userData;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearStoredSession();
    setUser(null);
    setRequirePasswordChange(false);
    // Cached lists belong to the previous user; the next login starts clean.
    queryClient.clear();
  }, []);

  const isAdmin = user?.userType === 'ADMIN';
  const isInstructor = user?.userType === 'INSTRUCTOR';
  const isStudent = user?.userType === 'STUDENT';

  const isAuthenticated = !!user && (!!getToken() || !!loadRefreshToken());

  // One stable object per actual change, so consumers don't all re-render on every render.
  const value = useMemo(() => ({
    user, loading, login, register, logout, changePassword,
    isAdmin, isInstructor, isStudent, isAuthenticated, requirePasswordChange,
  }), [user, loading, login, register, logout, changePassword, isAdmin, isInstructor, isStudent,
    isAuthenticated, requirePasswordChange]);

  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
};
