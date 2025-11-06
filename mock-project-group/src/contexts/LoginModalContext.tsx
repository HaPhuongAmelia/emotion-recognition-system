import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import LoginModal from '../pages/Login';
import { onUnauthorized, offUnauthorized } from '../lib/authEvents';

type Mode = 'login' | 'register';

interface LoginModalContextType {
  openLogin: (mode?: Mode) => void;
  closeLogin: () => void;
  isOpen: boolean;
  mode: Mode;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export const LoginModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');

  const openLogin = useCallback((m: Mode = 'login') => {
    setMode(m);
    setIsOpen(true);
  }, []);

  const closeLogin = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ openLogin, closeLogin, isOpen, mode }), [openLogin, closeLogin, isOpen, mode]);

  // Auto-open login modal on 401
  useEffect(() => {
    const handler = () => openLogin('login');
    onUnauthorized(handler);
    return () => offUnauthorized(handler);
  }, [openLogin]);

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      {/* Render once at app root */}
      <LoginModal open={isOpen} initialMode={mode} onClose={closeLogin} />
    </LoginModalContext.Provider>
  );
};

export const useLoginModal = () => {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used within LoginModalProvider');
  return ctx;
};

