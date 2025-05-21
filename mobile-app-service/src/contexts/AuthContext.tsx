import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { User, isAuthenticated, getCurrentUser, login, logout, register } from "../services/auth.service";

interface AuthContextProps {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (emailOrUsername: string, password: string) => Promise<User>;
  register: (email: string, username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Créez une valeur par défaut pour le contexte
const defaultContextValue: AuthContextProps = {
  user: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,
  login: async () => {
    throw new Error("Not implemented");
  },
  register: async () => {
    throw new Error("Not implemented");
  },
  logout: async () => {
    throw new Error("Not implemented");
  },
  refreshUser: async () => {
    throw new Error("Not implemented");
  },
};

// Créez le contexte avec une assertion de type
const AuthContext = createContext<AuthContextProps>(defaultContextValue);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const authed = await isAuthenticated();
        setIsLoggedIn(authed);

        if (authed) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Authentication check failed");
        }
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const handleLogin = async (emailOrUsername: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const loggedInUser = await login(emailOrUsername, password);

      setUser(loggedInUser);
      setIsLoggedIn(true);

      return loggedInUser;
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const handleRegister = async (email: string, username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const newUser = await register(email, username, password);

      setUser(newUser);
      setIsLoggedIn(true);

      return newUser;
    } catch (err) {
      console.error("Register error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await logout();

      setUser(null);
      setIsLoggedIn(false);
    } catch (err) {
      console.error("Logout error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Logout failed");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error("Refresh user error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to refresh user data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoggedIn,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshUser,
  };

  // Utiliser une expression JSX alternative sans accéder directement au Provider
  return React.createElement(
    AuthContext.Provider as any, 
    { value }, 
    children
  );
};

// Custom hook to use the auth context
export const useAuthContext = () => useContext(AuthContext);

export default AuthContext;