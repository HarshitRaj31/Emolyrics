import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("emolyrics_token");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const logout = () => {
    try {
      localStorage.removeItem("emolyrics_token");
    } catch {}
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      const storedToken = localStorage.getItem("emolyrics_token");
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (isMounted) {
            if (res && res.success && res.user) {
              setUser(res.user);
            } else {
              logout();
            }
          }
        } catch (err) {
          if (isMounted) {
            console.warn("Session check failed, clearing token:", err.message);
            logout();
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    }
    loadUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (credentials) => {
    const res = await api.login(credentials);
    if (res && res.token) {
      localStorage.setItem("emolyrics_token", res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    if (res && res.token) {
      localStorage.setItem("emolyrics_token", res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const updateUser = (updatedUserData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserData } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
