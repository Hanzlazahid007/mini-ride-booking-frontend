"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import Cookies from "js-cookie";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get("token"); // ✅ Read from cookie

      if (token) {
        const userData = await authAPI.verifyToken(token);
        setUser(userData);
      } else {
        router.push("/login"); // ⬅️ Optional: auto-redirect if no token
      }
    } catch (error) {
      Cookies.remove("token"); // ✅ Remove invalid cookie
      setUser(null);
      router.push("/login"); // ⬅️ Optional: redirect on invalid token
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);

    Cookies.set("token", response.token, { expires: 7, path: "/" }); // ✅ Store token in cookie
    setUser(response.user);

    if (response.user.userType === "rider") {
      router.push("/rider");
    } else {
      router.push("/dashboard");
    }
  };

  const signup = async (userData) => {
    const response = await authAPI.signup(userData);

    Cookies.set("token", response.token, { expires: 7, path: "/" }); // ✅ Store token in cookie
    setUser(response.user);

    if (response.user.userType === "rider") {
      router.push("/rider");
    } else {
      router.push("/dashboard");
    }
  };

  const logout = () => {
    Cookies.remove("token", { path: "/" }); // ✅ Remove cookie
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
