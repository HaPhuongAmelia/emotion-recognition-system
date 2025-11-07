/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/contexts/LoginModalContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import LoginModal from "../pages/Login";
import { onUnauthorized, offUnauthorized } from "../lib/authEvents";

type Mode = "login" | "register";

interface LoginModalContextType {
  openLogin: (mode?: Mode) => void;
  closeLogin: () => void;
  isOpen: boolean;
  mode: Mode;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(
  undefined
);

export const LoginModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  const openLogin = useCallback((m: Mode = "login") => {
    setMode(m);
    setIsOpen(true);
  }, []);

  const closeLogin = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ openLogin, closeLogin, isOpen, mode }),
    [openLogin, closeLogin, isOpen, mode]
  );

  // Auto-open on 401
  useEffect(() => {
    const handler = () => openLogin("login");
    onUnauthorized(handler);
    return () => offUnauthorized(handler);
  }, [openLogin]);

  // Cast LoginModal to any to avoid TypeScript prop-type conflicts
  const LoginModalAny: any = LoginModal as any;

  return (
    <LoginModalContext.Provider value={value}>
      {children}

      {/* Render the modal once at app root. Pass common prop names so
          both implementations (open/visible, onClose/onCancel, mode/initialMode)
          are supported. */}
      <LoginModalAny
        open={isOpen}
        visible={isOpen}
        initialMode={mode}
        mode={mode}
        onClose={closeLogin}
        onCancel={closeLogin}
      />
    </LoginModalContext.Provider>
  );
};

export const useLoginModal = () => {
  const ctx = useContext(LoginModalContext);
  if (!ctx)
    throw new Error("useLoginModal must be used within LoginModalProvider");
  return ctx;
};
