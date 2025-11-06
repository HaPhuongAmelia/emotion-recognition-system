/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import { onUnauthorized, offUnauthorized } from "../lib/authEvents";
import { jwtDecode } from "jwt-decode";

interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  name?: string; // ✅ thêm trường name để Profile.tsx sử dụng
  phoneNumber?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

interface DecodedToken {
  exp: number; // Unix timestamp cho thời gian hết hạn
  [key: string]: any;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ✅ Khi user có firstName + lastName, tự động gộp thành name
  useEffect(() => {
    if (user && (!user.name || user.name.trim() === "")) {
      const combinedName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (combinedName) {
        setUser((prev) => ({ ...prev!, name: combinedName }));
      }
    }
  }, [user]);

  // Load dữ liệu từ localStorage khi refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      // Gộp tên nếu cần
      const name =
        parsedUser.name ||
        [parsedUser.firstName, parsedUser.lastName].filter(Boolean).join(" ");
      setUser({ ...parsedUser, name });
      setToken(savedToken);
    }
  }, []);

  // Kiểm tra và xử lý hết hạn token
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (token) {
        try {
          const decoded: DecodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          if (decoded.exp < currentTime) {
            logout(); // Hết hạn → logout
          } else {
            const timeUntilExpiration = (decoded.exp - currentTime) * 1000;
            const interval = setInterval(() => {
              const now = Date.now() / 1000;
              if (decoded.exp < now) {
                logout();
                clearInterval(interval);
              }
            }, 60000);
            return () => clearInterval(interval);
          }
        } catch (error) {
          console.error("Lỗi khi decode token:", error);
          logout();
        }
      }
    };

    checkTokenExpiration();
  }, [token]);

  // Reset nếu gặp lỗi 401
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setToken(null);
    };
    onUnauthorized(handler);
    return () => offUnauthorized(handler);
  }, []);

  const login = (userData: User, tokenData: string) => {
    const name =
      userData.name ||
      [userData.firstName, userData.lastName].filter(Boolean).join(" ");
    const updatedUser = { ...userData, name };
    setUser(updatedUser);
    setToken(tokenData);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("token", tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
