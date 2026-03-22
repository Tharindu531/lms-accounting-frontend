import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getToken, setToken, clearToken } from '../services/tokenStore';

export { getToken, setToken, clearToken };

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    // Only restore non-sensitive user info from localStorage
    const savedUser = localStorage.getItem('user');
    const savedRequirePC = localStorage.getItem('requirePasswordChange');

    if (savedUser) {
      // We have a previous session; verify with server (token not in localStorage)
      // Try to restore session by calling /auth/me - this will fail without a token,
      // so we treat the absence of an in-memory token as logged out.
      // If the page was refreshed, inMemoryToken is gone - user must log in again.
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const result = response.data;

    // Check if phone verification is required
    if (!result.success && result.message === 'PHONE_VERIFICATION_REQUIRED') {
      return { phoneVerificationRequired: true };
    }

    const { accessToken, user: userData, requirePasswordChange: reqPC } = result.data;

    // Store token in memory only - not localStorage
    setToken(accessToken);
    // Store only non-sensitive user info in localStorage for UI persistence
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    if (reqPC) {
      localStorage.setItem('requirePasswordChange', 'true');
      setRequirePasswordChange(true);
    }

    return { user: userData, requirePasswordChange: reqPC, phoneVerificationRequired: false };
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    return response.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const response = await authAPI.changePassword({ currentPassword, newPassword });
    const { accessToken, user: userData } = response.data.data;

    // Update in-memory token
    setToken(accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('requirePasswordChange');
    setUser(userData);
    setRequirePasswordChange(false);

    return userData;
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem('user');
    localStorage.removeItem('requirePasswordChange');
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
