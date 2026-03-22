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
    const savedUser = localStorage.getItem('user');
    const savedToken = sessionStorage.getItem('_t');

    if (savedUser && savedToken) {
      // Restore token to memory store
      setToken(savedToken);
      // Validate token is still valid by calling /auth/me
      authAPI.getMe()
        .then(() => {
          setUser(JSON.parse(savedUser));
          const savedRequirePC = localStorage.getItem('requirePasswordChange');
          if (savedRequirePC === 'true') {
            setRequirePasswordChange(true);
          }
        })
        .catch(() => {
          // Token expired or invalid - clear everything
          clearToken();
          localStorage.removeItem('user');
          localStorage.removeItem('requirePasswordChange');
          sessionStorage.removeItem('_t');
        })
        .finally(() => setLoading(false));
    } else {
      // No session - clear any stale data
      clearToken();
      localStorage.removeItem('user');
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
    clearToken(); // also clears sessionStorage._t via updated clearToken()
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
