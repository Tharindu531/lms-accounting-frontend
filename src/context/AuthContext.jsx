import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedRequirePC = localStorage.getItem('requirePasswordChange');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      if (savedRequirePC === 'true') {
        setRequirePasswordChange(true);
      }
      // Verify token is still valid
      authAPI.getMe()
        .then(res => {
          setUser(res.data.data);
          localStorage.setItem('user', JSON.stringify(res.data.data));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('requirePasswordChange');
          setUser(null);
          setRequirePasswordChange(false);
        })
        .finally(() => setLoading(false));
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

    localStorage.setItem('token', accessToken);
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

    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('requirePasswordChange');
    setUser(userData);
    setRequirePasswordChange(false);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
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
      isAuthenticated: !!user,
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
