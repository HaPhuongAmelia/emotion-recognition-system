/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
// AuthContext.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  useContext,
} from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { onUnauthorized, offUnauthorized } from "../lib/authEvents";

/**
 * AuthContext for Emotion Recognition System (ERS)
 * - login accepts { user?: User | null, token: string, refreshToken?: string | null }
 * - stores token, refreshToken, user in localStorage
 * - decodes token to derive user if user not provided
 * - auto-logout on token expiry, optional refresh before expiry
 */

/* ---------------- Types ---------------- */
export interface User {
  id?: string | number;
  email?: string;
  role?: string | string[];
  firstName?: string;
  lastName?: string;
  name?: string;
  phoneNumber?: string;
  address?: string;
  [k: string]: any;
}

interface LoginPayload {
  user?: User | null;
  token: string;
  refreshToken?: string | null;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => void;
  logout: (opts?: { silent?: boolean }) => void;
  refreshAuthToken: () => Promise<boolean>;
  isAdmin: () => boolean;
  hasRole: (role: string) => boolean;
}

/* ------------- Helpers ------------- */
type DecodedToken = {
  exp?: number;
  iat?: number;
  sub?: string | number;
  email?: string;
  role?: string | string[];
  user?: any;
  [k: string]: any;
};

const tryParseJSON = (s: string | null) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const parseTokenToUser = (t: string | null): User | null => {
  if (!t) return null;
  try {
    const decoded = jwtDecode<DecodedToken>(t);
    const u: User = {
      id: decoded.sub ?? decoded.user?.id,
      email: decoded.email ?? decoded.user?.email,
      role: decoded.role ?? decoded.user?.role,
      ...(decoded.user ?? {}),
    };
    u.name = u.name ?? ([u.firstName, u.lastName].filter(Boolean).join(" ").trim() || undefined);
    return u;
  } catch (err) {
    console.warn("Failed to decode token:", err);
    return null;
  }
};

/* ------------- Context ------------- */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = tryParseJSON(localStorage.getItem("user"));
    return raw ?? null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token") ?? null);
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("refreshToken") ?? null);

  const logoutTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current != null) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (refreshTimerRef.current != null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // schedule auto-logout at token expiry and auto-refresh 30s before expiry (if refreshToken available)
  const scheduleTokenHandlers = useCallback(
    (t: string | null) => {
      clearTimers();
      if (!t) return;
      try {
        const decoded = jwtDecode<DecodedToken>(t);
        if (!decoded?.exp) return;
        const expiresAtMs = decoded.exp * 1000;
        const nowMs = Date.now();
        const msLeft = Math.max(0, expiresAtMs - nowMs);

        // logout at exact expiry + small guard
        logoutTimerRef.current = window.setTimeout(() => {
          doLogout({ silent: true });
        }, msLeft + 500);

        // refresh 30s before expiry if a refreshToken exists
        const refreshBeforeMs = 30_000;
        if (localStorage.getItem("refreshToken") || refreshToken) {
          const msToRefresh = Math.max(0, msLeft - refreshBeforeMs);
          refreshTimerRef.current = window.setTimeout(async () => {
            try {
              await refreshAuthToken();
            } catch {
              // if refresh fails, expiry timer will handle logout
            }
          }, msToRefresh);
        }
      } catch (err) {
        console.warn("scheduleTokenHandlers error:", err);
      }
    },
    [clearTimers, refreshToken]
  );

  // refresh token implementation (calls /refresh on configured AUTH API)
  const AUTH_API_BASE = (import.meta.env.VITE_API_AUTH_URL ?? import.meta.env.VITE_BASE_URL ?? "").replace(/\/$/, "");
  const REFRESH_ENDPOINT = AUTH_API_BASE ? `${AUTH_API_BASE}/refresh` : "";

  const refreshAuthToken = useCallback(async (): Promise<boolean> => {
    if (!REFRESH_ENDPOINT) return false;
    const rt = localStorage.getItem("refreshToken") ?? refreshToken;
    if (!rt) return false;
    try {
      const res = await axios.post(REFRESH_ENDPOINT, { refreshToken: rt }, { headers: { "Content-Type": "application/json" } });
      const data = res.data ?? {};
      const newToken = data.token ?? data.accessToken ?? data.access_token ?? null;
      const newRefresh = data.refreshToken ?? data.refresh ?? null;
      const userFromResp = data.user ?? data.profile ?? null;

      if (!newToken) return false;

      localStorage.setItem("token", newToken);
      setToken(newToken);

      if (newRefresh) {
        localStorage.setItem("refreshToken", newRefresh);
        setRefreshToken(newRefresh);
      }

      if (userFromResp) {
        localStorage.setItem("user", JSON.stringify(userFromResp));
        setUser(userFromResp);
      } else {
        const parsed = parseTokenToUser(newToken);
        if (parsed) {
          localStorage.setItem("user", JSON.stringify(parsed));
          setUser(parsed);
        }
      }

      scheduleTokenHandlers(newToken);
      return true;
    } catch (err) {
      console.warn("refreshAuthToken failed:", err);
      localStorage.removeItem("refreshToken");
      setRefreshToken(null);
      return false;
    }
  }, [refreshToken, REFRESH_ENDPOINT, scheduleTokenHandlers]);

  // internal logout (silent optional)
  const doLogout = useCallback(({ silent = false }: { silent?: boolean } = {}) => {
    clearTimers();
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    } catch {}
    // optionally show notification if not silent (left intentionally blank)
  }, [clearTimers]);

  // exported logout
  const logout = useCallback((opts?: { silent?: boolean }) => {
    doLogout(opts ?? {});
  }, [doLogout]);

  // login accepts an object payload
  const login = useCallback(
    (payload: LoginPayload) => {
      const { user: providedUser, token: t, refreshToken: rt } = payload;
      if (!t) return;

      // persist token and refresh token
      try {
        localStorage.setItem("token", t);
        setToken(t);
        if (rt) {
          localStorage.setItem("refreshToken", rt);
          setRefreshToken(rt);
        } else {
          localStorage.removeItem("refreshToken");
          setRefreshToken(null);
        }
      } catch {}

      // set user: prefer provided user, else parse from token
      if (providedUser) {
        const name = providedUser.name ?? [providedUser.firstName, providedUser.lastName].filter(Boolean).join(" ").trim();
        const merged: User = { ...providedUser, name: name || providedUser.name };
        try {
          localStorage.setItem("user", JSON.stringify(merged));
        } catch {}
        setUser(merged);
      } else {
        const parsed = parseTokenToUser(t);
        if (parsed) {
          try {
            localStorage.setItem("user", JSON.stringify(parsed));
          } catch {}
          setUser(parsed);
        } else {
          setUser(null);
        }
      }

      // schedule expiry / refresh handlers
      scheduleTokenHandlers(t);
    },
    [scheduleTokenHandlers]
  );

  // restore from storage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      const rawUser = tryParseJSON(localStorage.getItem("user"));
      if (rawUser) setUser(rawUser);
      else {
        const parsed = parseTokenToUser(storedToken);
        if (parsed) setUser(parsed);
      }
      scheduleTokenHandlers(storedToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep in sync on global 401s
  useEffect(() => {
    const handler = () => {
      doLogout({ silent: true });
    };
    onUnauthorized(handler);
    return () => offUnauthorized(handler);
  }, [doLogout]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const isAuthenticated = Boolean(token);

  const isAdmin = useCallback(() => {
    if (!user) return false;
    const r = user.role;
    if (!r) return false;
    if (Array.isArray(r)) return r.map(String).includes("admin");
    return String(r).toLowerCase() === "admin";
  }, [user]);

  const hasRole = useCallback((role: string) => {
    if (!user) return false;
    const r = user.role;
    if (!r) return false;
    if (Array.isArray(r)) return r.map(String).includes(role);
    return String(r).toLowerCase() === role.toLowerCase();
  }, [user]);

  const value: AuthContextType = {
    user,
    token,
    refreshToken,
    isAuthenticated,
    login,
    logout,
    refreshAuthToken,
    isAdmin,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/* ------------- Hook ------------- */
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

export default AuthProvider;
