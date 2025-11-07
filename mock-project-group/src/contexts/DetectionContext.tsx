/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
// DetectionContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import axios from "axios";
import { message } from "antd";

export type DetectionRecord = {
  id: string;
  sessionId?: string | null;
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
  startPolling: (opts?: { intervalMs?: number; sessionId?: string | null }) => void;
  stopPolling: () => void;
};

const DetectionContext = createContext<DetectionContextValue | null>(null);

const DETECTIONS_API =
  (import.meta.env.VITE_API_DETECTIONS_URL as string | undefined) ??
  (import.meta.env.VITE_BASE_URL ? `${(import.meta.env.VITE_BASE_URL as string).replace(/\/$/, "")}/detections` : "");

type ProviderProps = {
  children: ReactNode;
  initialSessionId?: string | null;
  pollIntervalMs?: number;
  demo?: boolean;
};

const defaultPollMs = 5000;

// Sử dụng kiểu dữ liệu phù hợp cho setInterval/clearInterval
type IntervalId = ReturnType<typeof setInterval> | null;

/** normalize raw API item -> DetectionRecord */
const normalizeRecord = (r: any): DetectionRecord => {
  const id = String(r?.id ?? r?._id ?? r?.detId ?? `local-${Date.now()}-${Math.random()}`);
  const sessionId = r?.sessionId ?? r?.session_id ?? r?.session ?? null;
  const capturedAt = r?.capturedAt ?? r?.timestamp ?? r?.createdAt ?? r?.created_at ?? new Date().toISOString();
  const emotion = r?.emotion ?? r?.label ?? "unknown";
  const confidence =
    typeof r?.confidence === "number"
      ? r.confidence
      : typeof r?.score === "number"
      ? r.score
      : 0;
  const imageUrl = r?.imageUrl ?? r?.cropUrl ?? r?.faceImage ?? r?.image ?? null;
  const bbox = r?.bbox ?? r?.box ?? null;
  const source = r?.source ?? r?.type ?? "unknown";
  const meta = r?.meta ?? r?.metadata ?? r ?? {};
  return { id, sessionId, capturedAt, emotion, confidence, imageUrl, bbox, source, meta };
};

export const DetectionProvider: React.FC<ProviderProps> = ({
  children,
  initialSessionId = null,
  pollIntervalMs = defaultPollMs,
  demo = false,
}) => {
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DetectionRecord | null>(null);

  // Cập nhật kiểu cho pollingRef.current
  const pollingRef = useRef<IntervalId>(null);
  const pollingSessionRef = useRef<string | null>(initialSessionId);

  // Fetch detections
  const fetchDetections = useCallback(
    async (opts?: { sessionId?: string; userId?: string; limit?: number }) : Promise<DetectionRecord[]> => {
      setLoading(true);
      setError(null);
      try {
        // Demo fallback (or explicitly demo)
        if (!DETECTIONS_API || demo) {
          const demoList: DetectionRecord[] = Array.from({ length: opts?.limit ?? 12 }).map((_, i) => {
            const sess = opts?.sessionId ?? `session-${Math.floor(i / 4) + 1}`;
            return normalizeRecord({
              id: `demo-${sess}-${i}-${Date.now()}`,
              sessionId: sess,
              timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
              label: ["happy", "neutral", "sad"][i % 3],
              score: +(0.6 + Math.random() * 0.35).toFixed(2),
              image: null,
              bbox: { x: 0.15 + (i % 3) * 0.02, y: 0.12 + (i % 4) * 0.02, w: 0.22, h: 0.22 },
              type: i % 2 === 0 ? "webcam" : "upload",
              meta: { demo: true, idx: i },
            });
          });
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
        const raw = res?.data;
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data) ? raw.data : [];
        const list = items.map((it: any) => normalizeRecord(it));
        setDetections(list);
        setSelected(list[0] ?? null);
        setLoading(false);
        return list;
      } catch (err: any) {
        console.error("fetchDetections error:", err);
        const msg = err?.response?.data?.message ?? err?.message ?? "Không thể tải dữ liệu";
        setError(msg);
        setLoading(false);
        return [];
      }
    },
    [demo]
  );

  // get detection local-first
  const getDetection = useCallback((id: string) => detections.find((d) => String(d.id) === String(id)), [detections]);

  // add detection
  const addDetection = useCallback(
    async (payload: Partial<DetectionRecord>) : Promise<DetectionRecord> => {
      try {
        if (!DETECTIONS_API) {
          const next = normalizeRecord({ ...payload, id: payload.id ?? `local-${Date.now()}` });
          setDetections((prev) => [next, ...prev]);
          return next;
        }
        const res = await axios.post(DETECTIONS_API, payload);
        const created = normalizeRecord(res.data ?? payload);
        setDetections((prev) => [created, ...prev]);
        return created;
      } catch (err: any) {
        console.error("addDetection error:", err);
        message.error(err?.response?.data?.message ?? "Thêm bản ghi thất bại");
        throw err;
      }
    },
    []
  );

  // update detection
  const updateDetection = useCallback(
    async (id: string, patch: Partial<DetectionRecord>) : Promise<DetectionRecord | null> => {
      try {
        if (!DETECTIONS_API) {
          setDetections((prev) => prev.map((d) => (String(d.id) === String(id) ? { ...d, ...patch } : d)));
          return getDetection(id) ?? null;
        }
        const url = `${DETECTIONS_API.replace(/\/$/, "")}/${encodeURIComponent(String(id))}`;
        const res = await axios.put(url, patch);
        const updated = normalizeRecord(res.data ?? { id, ...patch });
        setDetections((prev) => prev.map((d) => (String(d.id) === String(id) ? updated : d)));
        // if selected is updated, reflect change
        if (selected?.id === id) setSelected(updated);
        return updated;
      } catch (err: any) {
        console.error("updateDetection error:", err);
        message.error(err?.response?.data?.message ?? "Cập nhật thất bại");
        return null;
      }
    },
    [getDetection, selected]
  );

  // delete detection
  const deleteDetection = useCallback(
    async (id: string) : Promise<boolean> => {
      try {
        if (!DETECTIONS_API) {
          setDetections((prev) => prev.filter((d) => String(d.id) !== String(id)));
          if (selected?.id === id) setSelected(null);
          return true;
        }
        const url = `${DETECTIONS_API.replace(/\/$/, "")}/${encodeURIComponent(String(id))}`;
        await axios.delete(url);
        setDetections((prev) => prev.filter((d) => String(d.id) !== String(id)));
        if (selected?.id === id) setSelected(null);
        return true;
      } catch (err: any) {
        console.error("deleteDetection error:", err);
        message.error(err?.response?.data?.message ?? "Xóa thất bại");
        return false;
      }
    },
    [selected]
  );

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

  // Polling controls
  const startPolling = useCallback(
    (opts?: { intervalMs?: number; sessionId?: string | null }) => {
      const ms = opts?.intervalMs ?? pollIntervalMs;
      const sessionId = typeof opts?.sessionId !== "undefined" ? opts?.sessionId : pollingSessionRef.current;
      pollingSessionRef.current = sessionId ?? null;
      
      // stop existing interval first
      if (pollingRef.current != null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      // **SỬA LỖI TS2322 TẠI ĐÂY:** Ép kiểu null thành undefined nếu cần truyền cho fetchDetections
      const fetchOpts = { sessionId: sessionId ?? undefined }; 

      // run an immediate fetch, then interval
      // Lời gọi fetchDetections đầu tiên
      fetchDetections(fetchOpts).catch(() => {}); 
      
      // set up new interval
      // SỬA LỖI TS2322: Dùng window.setInterval để đảm bảo kiểu IntervalId
      const id = window.setInterval(() => {
        fetchDetections(fetchOpts).catch(() => {});
      }, ms);
      
      pollingRef.current = id;
    },
    [fetchDetections, pollIntervalMs]
  );

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

  // auto-fetch initialSessionId on mount or when it changes
  useEffect(() => {
    if (initialSessionId) {
      // SỬA LỖI: initialSessionId có thể là null, cần ép thành string | undefined
      fetchDetections({ sessionId: initialSessionId ?? undefined }).catch(() => {}); 
    }
  }, [initialSessionId, fetchDetections]);

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