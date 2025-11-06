/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
// DetectionContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import axios from "axios";
import { message } from "antd";

export type DetectionRecord = {
  id: string;
  sessionId?: string;
  capturedAt?: string; // ISO string
  emotion?: string;
  confidence?: number; // 0..1
  imageUrl?: string | null;
  bbox?: { x: number; y: number; w: number; h: number } | null; // normalized
  source?: string;
  meta?: Record<string, any>;
};

export type DetectionContextValue = {
  detections: DetectionRecord[];
  loading: boolean;
  error?: string | null;
  selected?: DetectionRecord | null;
  setSelected: (d: DetectionRecord | null) => void;
  fetchDetections: (opts?: { sessionId?: string; userId?: string; limit?: number }) => Promise<DetectionRecord[]>;
  getDetection: (id: string) => DetectionRecord | undefined;
  addDetection: (payload: Partial<DetectionRecord>) => Promise<DetectionRecord>;
  updateDetection: (id: string, patch: Partial<DetectionRecord>) => Promise<DetectionRecord | null>;
  deleteDetection: (id: string) => Promise<boolean>;
  clearDetections: () => void;
  exportDetections: (items?: DetectionRecord[]) => void;
  startPolling: (opts?: { intervalMs?: number; sessionId?: string }) => void;
  stopPolling: () => void;
};

const DetectionContext = createContext<DetectionContextValue | null>(null);

const DETECTIONS_API =
  import.meta.env.VITE_API_DETECTIONS_URL ??
  (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL.replace(/\/$/, "")}/detections` : "");

type ProviderProps = {
  children: ReactNode;
  initialSessionId?: string | null;
  pollIntervalMs?: number;
  demo?: boolean;
};

export const DetectionProvider: React.FC<ProviderProps> = ({ children, initialSessionId = null, pollIntervalMs = 5000, demo = false }) => {
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DetectionRecord | null>(null);

  // polling refs
  const pollingRef = useRef<number | null>(null);
  const pollingSessionRef = useRef<string | null>(initialSessionId);

  // helper: normalize incoming raw item to DetectionRecord
  const normalize = (r: any): DetectionRecord => ({
    id: String(r?.id ?? r?._id ?? r?.detId ?? `${Math.random()}`),
    sessionId: r?.sessionId ?? r?.session_id ?? r?.session ?? r?.sessionId ?? null,
    capturedAt: r?.capturedAt ?? r?.timestamp ?? r?.createdAt ?? r?.created_at ?? new Date().toISOString(),
    emotion: r?.emotion ?? r?.label ?? "unknown",
    confidence: typeof r?.confidence === "number" ? r.confidence : (typeof r?.score === "number" ? r.score : 0),
    imageUrl: r?.imageUrl ?? r?.cropUrl ?? r?.faceImage ?? r?.image ?? null,
    bbox: r?.bbox ?? r?.box ?? null,
    source: r?.source ?? r?.type ?? "unknown",
    meta: r?.meta ?? r?.metadata ?? r ?? {},
  });

  // fetch detections (optionally by sessionId/userId)
  const fetchDetections = useCallback(async (opts?: { sessionId?: string; userId?: string; limit?: number }) => {
    setLoading(true);
    setError(null);
    try {
      // demo fallback
      if (!DETECTIONS_API || demo) {
        // generate some demo items
        const demoList: DetectionRecord[] = Array.from({ length: 12 }).map((_, i) => ({
          id: `demo-${Date.now()}-${i}`,
          sessionId: opts?.sessionId ?? `session-${Math.floor(i / 4) + 1}`,
          capturedAt: new Date(Date.now() - i * 60 * 1000).toISOString(),
          emotion: ["happy", "neutral", "sad"][i % 3],
          confidence: +(0.6 + Math.random() * 0.35).toFixed(2),
          imageUrl: null,
          bbox: { x: 0.15 + (i % 3) * 0.02, y: 0.12 + (i % 4) * 0.02, w: 0.22, h: 0.22 },
          source: i % 2 === 0 ? "webcam" : "upload",
          meta: { demo: true, idx: i },
        }));
        setDetections(demoList);
        setSelected(demoList[0] ?? null);
        setLoading(false);
        return demoList;
      }

      const params: Record<string, any> = {};
      if (opts?.sessionId) params.sessionId = opts.sessionId;
      if (opts?.userId) params.userId = opts.userId;
      if (opts?.limit) params.limit = opts.limit;

      const res = await axios.get(DETECTIONS_API, { params });
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.items) ? res.data.items : []);
      const list = data.map((r: any) => normalize(r));
      setDetections(list);
      setSelected(list[0] ?? null);
      setLoading(false);
      return list;
    } catch (err: any) {
      console.error("fetchDetections error:", err);
      setError(err?.message ?? "Không thể tải dữ liệu");
      setLoading(false);
      return [];
    }
  }, []);

  // get one detection by id (local first)
  const getDetection = useCallback((id: string) => detections.find((d) => String(d.id) === String(id)), [detections]);

  // add detection (POST to API if configured)
  const addDetection = useCallback(async (payload: Partial<DetectionRecord>) => {
    try {
      if (!DETECTIONS_API) {
        // local mock
        const next: DetectionRecord = normalize({ ...payload, id: payload.id ?? `local-${Date.now()}` });
        setDetections(prev => [next, ...prev]);
        return next;
      }
      const res = await axios.post(DETECTIONS_API, payload);
      const created = normalize(res.data ?? payload);
      setDetections(prev => [created, ...prev]);
      return created;
    } catch (err: any) {
      console.error("addDetection error:", err);
      message.error(err?.response?.data?.message ?? "Thêm bản ghi thất bại");
      throw err;
    }
  }, []);

  // update detection
  const updateDetection = useCallback(async (id: string, patch: Partial<DetectionRecord>) => {
    try {
      if (!DETECTIONS_API) {
        setDetections(prev => prev.map(d => (String(d.id) === String(id) ? { ...d, ...patch } : d)));
        const updated = getDetection(id) || null;
        return updated ?? null;
      }
      const res = await axios.put(`${DETECTIONS_API.replace(/\/$/, "")}/${encodeURIComponent(String(id))}`, patch);
      const updated = normalize(res.data ?? { id, ...patch });
      setDetections(prev => prev.map(d => (String(d.id) === String(id) ? updated : d)));
      return updated;
    } catch (err: any) {
      console.error("updateDetection error:", err);
      message.error(err?.response?.data?.message ?? "Cập nhật thất bại");
      return null;
    }
  }, [getDetection]);

  // delete detection
  const deleteDetection = useCallback(async (id: string) => {
    try {
      if (!DETECTIONS_API) {
        setDetections(prev => prev.filter(d => String(d.id) !== String(id)));
        if (selected?.id === id) setSelected(null);
        return true;
      }
      await axios.delete(`${DETECTIONS_API.replace(/\/$/, "")}/${encodeURIComponent(String(id))}`);
      setDetections(prev => prev.filter(d => String(d.id) !== String(id)));
      if (selected?.id === id) setSelected(null);
      return true;
    } catch (err: any) {
      console.error("deleteDetection error:", err);
      message.error(err?.response?.data?.message ?? "Xóa thất bại");
      return false;
    }
  }, [selected]);

  const clearDetections = useCallback(() => {
    setDetections([]);
    setSelected(null);
  }, []);

  const exportDetections = useCallback((items?: DetectionRecord[]) => {
    const payload = items ?? detections;
    if (!payload || payload.length === 0) {
      message.info("Không có dữ liệu để xuất");
      return;
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: payload }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `detections-export-${Date.now()}.json`;
    a.click();
    message.success("Đã xuất JSON (client-side)");
  }, [detections]);

  // Polling: basic implementation to periodically re-fetch detections for a session
  const startPolling = useCallback((opts?: { intervalMs?: number; sessionId?: string }) => {
    const ms = opts?.intervalMs ?? pollIntervalMs;
    const sessionId = opts?.sessionId ?? pollingSessionRef.current ?? null;
    pollingSessionRef.current = sessionId;
    stopPolling(); // clear existing

    // setInterval returns number in browsers
    const id = window.setInterval(() => {
      fetchDetections({ sessionId }).catch(() => { /* swallow */ });
    }, ms);
    pollingRef.current = id;
  }, [fetchDetections, pollIntervalMs]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current != null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // optionally auto-fetch initialSessionId
  useEffect(() => {
    if (initialSessionId) {
      fetchDetections({ sessionId: initialSessionId }).catch(() => {});
    }
    // note: intentionally not including fetchDetections in deps to avoid double calls from provider instantiation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId]);

  const value: DetectionContextValue = {
    detections,
    loading,
    error,
    selected,
    setSelected,
    fetchDetections,
    getDetection,
    addDetection,
    updateDetection,
    deleteDetection,
    clearDetections,
    exportDetections,
    startPolling,
    stopPolling,
  };

  return <DetectionContext.Provider value={value}>{children}</DetectionContext.Provider>;
};

export const useDetections = (): DetectionContextValue => {
  const ctx = useContext(DetectionContext);
  if (!ctx) throw new Error("useDetections must be used within a DetectionProvider");
  return ctx;
};

export default DetectionProvider;
