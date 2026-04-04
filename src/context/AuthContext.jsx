import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { getToken, setToken, clearToken } from '../services/tokenStore';
import {
  clearStoredSession,
  loadRequirePasswordChange,
  loadStoredUser,
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

      if (!savedUser || !savedToken) {
        clearToken();
        clearStoredSession();
        if (!cancelled) {
          setUser(null);
          setRequirePasswordChange(false);
          setLoading(false);
        }
        return;
      }

      try {
        await authAPI.getMe();
        if (!cancelled) {
          setUser(savedUser);
          setRequirePasswordChange(loadRequirePasswordChange());
        }
      } catch {
        if (!cancelled) {
          clearToken();
          clearStoredSession();
          setUser(null);
          setRequirePasswordChange(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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

    // Check if phone verification is required
    if (!result.success && result.message === 'PHONE_VERIFICATION_REQUIRED') {
      return { phoneVerificationRequired: true };
    }

    const { accessToken, user: userData, requirePasswordChange: reqPC } = result.data;

    setToken(accessToken);
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
    const { accessToken, user: userData } = response.data.data;

    setToken(accessToken);
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
      isStudent,
      isAuthenticated: !!user && !!getToken(),
      requirePasswordChange
    }}>
      {children}
    </AuthContext.Provider>
  );
};
