/* eslint-disable @typescript-eslint/no-explicit-any */

// Home.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import useWindowWidth from "../hooks/useWindowWidth";
import { Input, Tag, Card, Empty, Spin, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";

type Detection = {
  id: string;
  sessionId?: string;
  capturedAt: string;
  emotion: string;
  confidence: number;
  imageUrl?: string | null;
  source?: string;
  meta?: Record<string, any>;
};

const EMOTIONS = ["happy", "neutral", "sad"];

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

const normalizeText = (s?: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const Home: React.FC = () => {
  const [records, setRecords] = useState<Detection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const width = useWindowWidth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const DETECTIONS_API =
    import.meta.env.VITE_API_DETECTIONS_URL ??
    (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL.replace(/\/$/, "")}/detections` : "");

  // fetch detections based on query params
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build params from searchParams
        const params: Record<string, any> = {};
        searchParams.forEach((v, k) => {
          if (v != null && v !== "") params[k] = v;
        });

        // prefer dedicated API if configured
        if (!DETECTIONS_API) {
          // demo mode
          const demo: Detection[] = Array.from({ length: 24 }).map((_, i) => {
            const emo = EMOTIONS[i % EMOTIONS.length];
            return {
              id: `demo-${i + 1}`,
              sessionId: `session-${Math.floor(i / 6) + 1}`,
              capturedAt: new Date(Date.now() - i * 1000 * 60 * 10).toISOString(),
              emotion: emo,
              confidence: +(0.6 + Math.random() * 0.35).toFixed(2),
              imageUrl: null,
              source: i % 2 === 0 ? "webcam" : "upload",
              meta: { demo: true, idx: i },
            };
          });
          if (mounted) setRecords(demo);
          return;
        }

        const res = await axios.get(DETECTIONS_API, { params });
        const data = res.data;
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data.data)) list = data.data;
        else if (Array.isArray(data.items)) list = data.items;
        else list = [];

        // normalize
        const normalized: Detection[] = list.map((r: any, idx: number) => ({
          id: String(r.id ?? r._id ?? r.detId ?? idx),
          sessionId: r.sessionId ?? r.session_id ?? r.session ?? "",
          capturedAt: r.capturedAt ?? r.timestamp ?? r.createdAt ?? new Date().toISOString(),
          emotion: r.emotion ?? r.label ?? "neutral",
          confidence: Number(r.confidence ?? r.score ?? 0),
          imageUrl: r.imageUrl ?? r.cropUrl ?? r.faceImage ?? r.image ?? null,
          source: r.source ?? r.type ?? "",
          meta: r.meta ?? r.metadata ?? r,
        }));

        // client-side search q if provided
        const qRaw = (searchParams.get("q") || "").trim();
        const q = normalizeText(qRaw);
        let filtered = normalized;
        if (q) {
          filtered = normalized.filter((r) => {
            return (
              normalizeText(r.id).includes(q) ||
              normalizeText(r.sessionId).includes(q) ||
              normalizeText(r.emotion).includes(q) ||
              normalizeText(r.source).includes(q)
            );
          });
        }

        // optional filtering by emotion/source/session query param
        const emotionParam = searchParams.get("emotion");
        if (emotionParam) {
          filtered = filtered.filter((r) => String(r.emotion).toLowerCase() === emotionParam.toLowerCase());
        }
        const sourceParam = searchParams.get("source");
        if (sourceParam) {
          filtered = filtered.filter((r) => String(r.source).toLowerCase() === sourceParam.toLowerCase());
        }
        const sessionParam = searchParams.get("sessionId");
        if (sessionParam) {
          filtered = filtered.filter((r) => String(r.sessionId) === sessionParam);
        }

        if (mounted) setRecords(filtered);
      } catch (err) {
        console.error("Load detections failed:", err);
        if (mounted) setError("Không thể tải dữ liệu phát hiện");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [searchParams, DETECTIONS_API]);

  // auto-scroll behaviour preserved from original (scroll to list)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let shouldScroll = false;
    let tsOk = false;
    try {
      shouldScroll = sessionStorage.getItem("scroll_to_book_list_once") === "1";
      const ts = Number(sessionStorage.getItem("scroll_to_book_list_ts") || 0);
      tsOk = Number.isFinite(ts) && Date.now() - ts < 3000;
    } catch {
      shouldScroll = false;
      tsOk = false;
    }
    if (!(shouldScroll && tsOk)) {
      try {
        sessionStorage.removeItem("scroll_to_book_list_once");
        sessionStorage.removeItem("scroll_to_book_list_ts");
      } catch { /* empty */ }
      return;
    }
    const el = document.getElementById("detection-list");
    if (!el) return;
    requestAnimationFrame(() => {
      const header = document.querySelector("header") as HTMLElement | null;
      const headerOffset = header ? header.offsetHeight : 0;
      const top = window.scrollY + el.getBoundingClientRect().top - headerOffset - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      try {
        sessionStorage.removeItem("scroll_to_book_list_once");
        sessionStorage.removeItem("scroll_to_book_list_ts");
      } catch { /* empty */ }
    });
  }, [location.pathname, loading]);

  const recent = useMemo(() => (Array.isArray(records) ? records.slice(0, 6) : []), [records]);

  // local UI filters (client-side)
  const [selectedEmotion, setSelectedEmotion] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [query, setQuery] = useState<string>((searchParams.get("q") || "") as string);

  const filtered = useMemo(() => {
    let list = records || [];
    if (selectedEmotion !== "all") list = list.filter((r) => r.emotion === selectedEmotion);
    if (selectedSource !== "all") list = list.filter((r) => String(r.source) === selectedSource);
    const q = normalizeText(query || "");
    if (q) {
      list = list.filter((r) => {
        return (
          normalizeText(r.id).includes(q) ||
          normalizeText(r.sessionId).includes(q) ||
          normalizeText(r.emotion).includes(q) ||
          normalizeText(r.source).includes(q)
        );
      });
    }
    return list;
  }, [records, selectedEmotion, selectedSource, query]);

  const availableSources = useMemo(() => {
    const s = new Set<string>();
    records.forEach((r) => {
      if (r.source) s.add(r.source);
    });
    return Array.from(s);
  }, [records]);

  return (
    <>
      <div className="bg-gray-100 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 mt-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Dashboard nhận diện cảm xúc</h1>
            <p className="text-gray-600">Xem các bản ghi mới nhất, lọc theo cảm xúc, phiên, và nguồn.</p>
          </div>

          {/* Top slider / recent */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Bản ghi gần đây</h2>
              <div>
                <Button onClick={() => navigate("/history")}>Xem lịch sử đầy đủ</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {loading ? (
                <div className="col-span-full flex justify-center p-8">
                  <Spin size="large" />
                </div>
              ) : recent.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <Empty description="Không có bản ghi" />
                  </Card>
                </div>
              ) : (
                recent.map((r) => (
                  <Card key={r.id} className="p-2" hoverable>
                    <div className="flex flex-col items-center gap-2">
                      {r.imageUrl ? (
                        <img src={r.imageUrl} alt={`face-${r.id}`} className="w-full h-28 object-cover rounded" />
                      ) : (
                        <div className="w-full h-28 bg-gray-50 rounded flex items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                      <div className="w-full flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{r.sessionId || "—"}</div>
                          <div className="text-xs text-gray-500">{formatDate(r.capturedAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{Math.round((r.confidence || 0) * 100)}%</div>
                          <div className="mt-1">
                            {r.emotion === "happy" && <Tag color="green">😊 Vui</Tag>}
                            {r.emotion === "neutral" && <Tag>😐 Bình thường</Tag>}
                            {r.emotion === "sad" && <Tag color="red">😢 Buồn</Tag>}
                            {!["happy", "neutral", "sad"].includes(r.emotion) && <Tag>{r.emotion}</Tag>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-5">
            {/* Sidebar */}
            {width >= 768 && (
              <aside className="w-1/4 space-y-4">
                <Card title="Bộ lọc nhanh">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium mb-2">Cảm xúc</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className={`px-3 py-1 rounded ${selectedEmotion === "all" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                          onClick={() => setSelectedEmotion("all")}
                        >
                          Tất cả
                        </button>
                        {EMOTIONS.map((e) => (
                          <button
                            key={e}
                            className={`px-3 py-1 rounded ${selectedEmotion === e ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                            onClick={() => setSelectedEmotion(e)}
                          >
                            {e === "happy" ? "Vui" : e === "neutral" ? "Bình thường" : "Buồn"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Nguồn</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className={`px-3 py-1 rounded ${selectedSource === "all" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                          onClick={() => setSelectedSource("all")}
                        >
                          Tất cả
                        </button>
                        {availableSources.map((s) => (
                          <button
                            key={s}
                            className={`px-3 py-1 rounded ${selectedSource === s ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                            onClick={() => setSelectedSource(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Phiên gần đây</div>
                      <div className="flex flex-col gap-2 max-h-40 overflow-auto">
                        {Array.from(new Set(records.map((r) => r.sessionId))).slice(0, 8).map((sid) => (
                          <button
                            key={sid}
                            className="text-left px-2 py-1 rounded bg-gray-50 hover:bg-gray-100"
                            onClick={() => {
                              // navigate with sessionId param
                              const sp = new URLSearchParams(Object.fromEntries(searchParams.entries()));
                              sp.set("sessionId", String(sid));
                              navigate({ pathname: "/", search: sp.toString() });
                            }}
                          >
                            {sid || "—"}
                          </button>
                        ))}
                        {records.length === 0 && <div className="text-sm text-gray-400">Không có phiên</div>}
                      </div>
                    </div>
                  </div>
                </Card>
              </aside>
            )}

            {/* Main content */}
            <main className={width >= 768 ? "flex-1" : "w-full"}>
              <div className="mb-4 flex items-center gap-3">
                <Input
                  placeholder="Tìm ID / Phiên / Nguồn / Cảm xúc"
                  prefix={<SearchOutlined />}
                  allowClear
                  value={query}
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setQuery(e.target.value)}
                  style={{ maxWidth: 480 }}
                />
                <div className="text-sm text-gray-500">Hiển thị {filtered.length} kết quả</div>
              </div>

              <div id="detection-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full flex justify-center py-12">
                    <Spin size="large" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="col-span-full">
                    <Card>
                      <Empty description={error ?? "Không có bản ghi"} />
                    </Card>
                  </div>
                ) : (
                  filtered.map((r) => (
                    <Card
                      key={r.id}
                      hoverable
                      onClick={() => navigate(`/detections/${encodeURIComponent(r.id)}`)}
                      className="cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <div className="w-28 h-20 bg-gray-50 flex-shrink-0 rounded overflow-hidden flex items-center justify-center">
                          {r.imageUrl ? (
                            <img src={r.imageUrl} alt={`face-${r.id}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-xs text-gray-400">No image</div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{r.sessionId || "—"}</div>
                            <div className="text-sm text-gray-500">{formatDate(r.capturedAt)}</div>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              {r.emotion === "happy" && <Tag color="green">😊 Vui</Tag>}
                              {r.emotion === "neutral" && <Tag>😐 Bình thường</Tag>}
                              {r.emotion === "sad" && <Tag color="red">😢 Buồn</Tag>}
                              {!["happy", "neutral", "sad"].includes(r.emotion) && <Tag>{r.emotion}</Tag>}
                            </div>
                            <div className="text-sm font-semibold">{Math.round((r.confidence || 0) * 100)}%</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </main>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Home;
