/* eslint-disable @typescript-eslint/no-explicit-any */
// MyHistory.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Input,
  Select,
  Button,
  List,
  Card,
  Tag,
  Pagination,
  Empty,
  Spin,
  Tooltip,
  message,
} from "antd";
import { SearchOutlined, DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type DetectionRecord = {
  id: string;
  sessionId?: string;
  capturedAt: string; // ISO
  emotion: string;
  confidence: number; // 0..1
  imageUrl?: string | null;
  source?: string;
  bbox?: any;
  meta?: any;
};

const EMOTIONS = ["all", "happy", "neutral", "sad"];

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

const MyHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const userId = (user as any)?.id ?? (user as any)?.userId ?? null;

  const DETECTIONS_API =
    import.meta.env.VITE_API_USER_HISTORY_URL ||
    import.meta.env.VITE_API_DETECTIONS_URL ||
    (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL}/detections` : "");

  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<DetectionRecord[]>([]);
  const [query, setQuery] = useState<string>("");
  const [emotionFilter, setEmotionFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Fetch user history (or demo)
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        if (!DETECTIONS_API) {
          // demo data
          const demo: DetectionRecord[] = Array.from({ length: 48 }).map((_, i) => {
            const emotions = ["happy", "neutral", "sad"];
            const emo = emotions[Math.floor(Math.random() * emotions.length)];
            return {
              id: `demo-${i + 1}`,
              sessionId: `session-${Math.floor(i / 6) + 1}`,
              capturedAt: new Date(Date.now() - i * 1000 * 60 * 8).toISOString(),
              emotion: emo,
              confidence: +(0.6 + Math.random() * 0.35).toFixed(2),
              imageUrl: null,
              source: i % 2 === 0 ? "webcam" : "upload",
              bbox: { x: 0.2, y: 0.15, w: 0.25, h: 0.25 },
              meta: { camera: "cam-01" },
            };
          });
          if (mounted) setRecords(demo);
          return;
        }

        // Build params: prefer endpoint that supports userId param
        const params: Record<string, any> = {};
        if (userId) params.userId = userId;
        // Optionally apply server-side pagination/filters later
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get(DETECTIONS_API, { params, headers });
        const list: any[] = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.items) ? res.data.items : []);
        const normalized: DetectionRecord[] = list.map((r: any, idx: number) => ({
          id: String(r.id ?? r._id ?? idx),
          sessionId: r.sessionId ?? r.session_id ?? r.session ?? "",
          capturedAt: r.capturedAt ?? r.timestamp ?? r.createdAt ?? new Date().toISOString(),
          emotion: r.emotion ?? r.label ?? "neutral",
          confidence: Number(r.confidence ?? r.score ?? 0),
          imageUrl: r.imageUrl ?? r.cropUrl ?? r.faceImage ?? null,
          source: r.source ?? r.type ?? "",
          bbox: r.bbox ?? r.box ?? null,
          meta: r.meta ?? r.metadata ?? r,
        }));
        if (mounted) setRecords(normalized);
      } catch (err) {
        console.error("Load history failed:", err);
        message.error("Không thể tải lịch sử");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => {
      mounted = false;
    };
  }, [DETECTIONS_API, userId, token]);

  // Filter and search locally
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return records.filter((r) => {
      if (emotionFilter !== "all" && r.emotion !== emotionFilter) return false;
      if (!q) return true;
      return (
        String(r.id).toLowerCase().includes(q) ||
        String(r.sessionId || "").toLowerCase().includes(q) ||
        (r.source || "").toLowerCase().includes(q) ||
        String(r.emotion || "").toLowerCase().includes(q)
      );
    });
  }, [records, query, emotionFilter]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const exportFiltered = () => {
    if (!filtered.length) {
      message.info("Không có dữ liệu để xuất");
      return;
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: filtered }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-history-${Date.now()}.json`;
    a.click();
    message.success("Đã xuất JSON (client-side)");
  };

  const goToDetail = (rec: DetectionRecord) => {
    navigate(`/detections/${encodeURIComponent(String(rec.id))}`);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Lịch sử phát hiện của tôi</h2>
          <div className="text-sm text-gray-500">Xem lại các phiên & kết quả nhận diện cảm xúc</div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={emotionFilter} onChange={(v) => { setEmotionFilter(v); setPage(1); }} style={{ width: 160 }}>
            {EMOTIONS.map((e) => (
              <Select.Option key={e} value={e}>
                {e === "all" ? "Tất cả" : e === "happy" ? "Vui" : e === "neutral" ? "Bình thường" : "Buồn"}
              </Select.Option>
            ))}
          </Select>

          <Input
            placeholder="Tìm ID / Phiên / Nguồn / Cảm xúc"
            prefix={<SearchOutlined />}
            allowClear
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            style={{ width: 320 }}
          />

          <Tooltip title="Xuất JSON của dữ liệu đang hiển thị">
            <Button icon={<DownloadOutlined />} onClick={exportFiltered}>
              Xuất
            </Button>
          </Tooltip>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-8"><Empty description="Chưa có bản ghi" /></div>
        ) : (
          <>
            <List
              itemLayout="horizontal"
              dataSource={paged}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Tooltip key="view" title="Xem chi tiết">
                      <Button icon={<EyeOutlined />} onClick={() => goToDetail(item)} />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      item.imageUrl ? (
                        // small preview if available
                        <img src={item.imageUrl} alt="face" className="w-16 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
                          No image
                        </div>
                      )
                    }
                    title={
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{String(item.sessionId || "—")}</div>
                        <div className="text-xs text-gray-500">{formatDate(item.capturedAt)}</div>
                      </div>
                    }
                    description={
                      <div className="flex items-center gap-4">
                        <div>
                          {item.emotion === "happy" && <Tag color="success">😊 Vui</Tag>}
                          {item.emotion === "neutral" && <Tag>😐 Bình thường</Tag>}
                          {item.emotion === "sad" && <Tag color="error">😢 Buồn</Tag>}
                          {(!["happy", "neutral", "sad"].includes(item.emotion)) && <Tag>{item.emotion}</Tag>}
                        </div>

                        <div className="text-sm text-gray-600">Độ tin cậy: {Math.round((item.confidence || 0) * 100)}%</div>

                        <div className="text-sm text-gray-500">Nguồn: {item.source || "-"}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">Hiển thị {paged.length} / {total} bản ghi</div>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, ps) => { setPage(p); if (ps !== pageSize) setPageSize(ps); }}
                pageSizeOptions={["6", "12", "24"]}
                showSizeChanger
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default MyHistory;