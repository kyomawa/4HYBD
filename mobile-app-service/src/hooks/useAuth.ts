import { useState, useEffect, useCallback } from "react";
import {
  isAuthenticated,
  getCurrentUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
  User,
} from "../services/auth.service";

export const useAuth = () => {
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
  const login = useCallback(async (emailOrUsername: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const loggedInUser = await loginService(emailOrUsername, password);

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
  }, []);

  // Register function
  const register = useCallback(async (email: string, username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const newUser = await registerService(email, username, password);

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
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await logoutService();

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
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
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
  }, []);

  return {
    user,
    isLoading,
    isLoggedIn,
    error,
    login,
    register,
    logout,
    refreshUser,
  };
};

export default useAuth;
