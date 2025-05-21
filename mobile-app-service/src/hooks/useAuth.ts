import { useState, useEffect, useCallback } from "react";
import {
  getCurrentUser,
  login as loginService,
  register as registerService,
  logout as logoutService,
} from "../services/auth.service";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      await loginService(email, password);
      await checkAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      throw err;
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      setError(null);
      await registerService(email, password, username);
      await checkAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await logoutService();
      setIsAuthenticated(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      throw err;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
  };
};

export default useAuth;
