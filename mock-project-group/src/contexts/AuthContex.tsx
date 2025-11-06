import React, { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { onUnauthorized, offUnauthorized } from '../lib/authEvents';
import { jwtDecode } from "jwt-decode";

interface User {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  id: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

interface DecodedToken {
  exp: number; // Unix timestamp cho thời gian hết hạn
  [key: string]: any; // Cho phép các trường khác trong token
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => { },
  logout: () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load dữ liệu từ localStorage khi refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Kiểm tra và xử lý hết hạn token
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (token) {
        try {
          const decoded: DecodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000; // Chuyển thành giây
          if (decoded.exp < currentTime) {
            logout(); // Tự động đăng xuất nếu token hết hạn
          } else {
            // Tính thời gian còn lại và đặt interval để kiểm tra
            const timeUntilExpiration = (decoded.exp - currentTime) * 1000; // Chuyển thành mili giây
            const interval = setInterval(() => {
              const current = Date.now() / 1000;
              if (decoded.exp < current) {
                logout();
                clearInterval(interval); // Dọn dẹp interval
              }
            }, 60000); // Kiểm tra mỗi phút

            // Dọn dẹp interval khi component unmount hoặc token thay đổi
            return () => clearInterval(interval);
          }
        } catch (error) {
          console.error("Lỗi khi decode token:", error);
          logout(); // Đăng xuất nếu token không hợp lệ
        }
      }
    };

    checkTokenExpiration();
  }, [token]); // Chạy lại khi token thay đổi

  // Keep context in sync if a 401 occurs (storage is cleared in axios setup)
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setToken(null);
    };
    onUnauthorized(handler);
    return () => offUnauthorized(handler);
  }, []);

  const login = (userData: User, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
