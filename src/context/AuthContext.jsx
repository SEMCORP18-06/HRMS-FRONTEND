import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeTenant, setActiveTenant] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentRole, setCurrentRole] = useState('Employee');

  const allowedRoles = user?.role === 'Admin (HR)' ? ['Admin', 'Employee'] : ['Employee'];

  useEffect(() => {
    const token = localStorage.getItem('hr_token');
    if (token) {
      api.auth.me()
        .then(data => {
          setUser(data.user);
          setActiveTenant(data.tenant);
          if (data.user.role === 'Admin (HR)') {
            setCurrentRole('Admin');
          } else {
            setCurrentRole('Employee');
          }
        })
        .catch(err => {
          console.error("Auth check failed:", err);
          localStorage.removeItem('hr_token');
        })
        .finally(() => {
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const login = (userData, tenantData) => {
    setActiveTenant(tenantData);
    return api.auth.me()
      .then(data => {
        setUser(data.user);
        if (data.tenant) setActiveTenant(data.tenant);
        if (data.user.role === 'Admin (HR)') {
          setCurrentRole('Admin');
        } else {
          setCurrentRole('Employee');
        }
      })
      .catch(() => {
        setUser(userData);
        if (userData.role === 'Admin (HR)') {
          setCurrentRole('Admin');
        } else {
          setCurrentRole('Employee');
        }
      });
  };

  const logout = () => {
    localStorage.removeItem('hr_token');
    setUser(null);
    setActiveTenant(null);
    setCurrentRole('Employee');
  };

  const refreshUser = () => {
    return api.auth.me().then(data => {
      setUser(data.user);
      if (data.user.role !== 'Admin (HR)') {
        setCurrentRole('Employee');
      }
    });
  };

  const switchRole = (newRole) => {
    if (allowedRoles.includes(newRole)) {
      setCurrentRole(newRole);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeTenant,
      checkingAuth,
      currentRole,
      allowedRoles,
      login,
      logout,
      refreshUser,
      switchRole,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
