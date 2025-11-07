/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  List,
  Spin,
  Button,
  Tag,
  Tooltip,
  Empty,
  Row,
  Col,
  Descriptions,
  message,
  Input,
} from "antd";
import {
  DownloadOutlined,
  PictureOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

type AnyObj = Record<string, any>;

type DetectionRecord = {
  id: string;
  sessionId?: string;
  capturedAt: string;
  emotion: string;
  confidence: number;
  imageUrl?: string | null;
  bbox?: { x: number; y: number; w: number; h: number } | null; // normalized 0..1
  source?: string;
  meta?: AnyObj;
};

const DETECTIONS_API =
  import.meta.env.VITE_API_DETECTIONS_URL ||
  (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL}/detections` : "");

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

/**
 * DetectionDetails
 * - loads all detections for a session (query by ?sessionId= or /sessions/:id/detections)
 * - left: list; right: selected detection visual + metadata
 * - draws bbox over image on canvas
 */
const DetectionDetails: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<DetectionRecord[]>([]);
  const [selected, setSelected] = useState<DetectionRecord | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchRecords = async () => {
      setLoading(true);
      try {
        if (!sessionId) {
          // nothing to load
          if (mounted) {
            setRecords([]);
            setSelected(null);
          }
          return;
        }

        if (!DETECTIONS_API) {
          // demo
          const demo: DetectionRecord[] = Array.from({ length: 16 }).map((_, i) => {
            const emo = ["happy", "neutral", "sad"][i % 3];
            return {
              id: `demo-${i + 1}`,
              sessionId,
              capturedAt: new Date(Date.now() - i * 60 * 1000).toISOString(),
              emotion: emo,
              confidence: +(0.6 + Math.random() * 0.35).toFixed(2),
              imageUrl: null,
              bbox: { x: 0.2 + (i % 4) * 0.02, y: 0.15 + (i % 3) * 0.02, w: 0.25, h: 0.25 },
              source: i % 2 === 0 ? "webcam" : "video",
              meta: { camera: "cam-01", frameIndex: i * 5 },
            };
          });
          if (mounted) {
            setRecords(demo);
            setSelected(demo[0]);
          }
          return;
        }

        // try session-specific endpoint first
        const base = DETECTIONS_API.replace(/\/$/, "");
        // prefer endpoint: /sessions/:sessionId/detections
        try {
          const sessionEndpoint = base.replace(/\/detections$/, "") + `/sessions/${encodeURIComponent(sessionId)}/detections`;
          const r1 = await axios.get(sessionEndpoint);
          const list = Array.isArray(r1.data) ? r1.data : Array.isArray(r1.data.items) ? r1.data.items : [];
          if (mounted && list.length) {
            const normalized = list.map((r: any) => normalizeRecord(r));
            setRecords(normalized);
            setSelected(normalized[0] ?? null);
            return;
          }
        } catch {
          // ignore and fallback to query
        }

        // fallback: query detections by sessionId param
        const res = await axios.get(base, { params: { sessionId } });
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data.items) ? res.data.items : [];
        const normalized = list.map((r: any) => normalizeRecord(r));
        if (mounted) {
          setRecords(normalized);
          setSelected(normalized[0] ?? null);
        }
      } catch (err) {
        console.error("Failed to load detections for session:", err);
        message.error("Không thể tải dữ liệu phiên");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRecords();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  // normalize incoming record shape to DetectionRecord
  const normalizeRecord = (r: any): DetectionRecord => {
    return {
      id: String(r.id ?? r._id ?? r.detId ?? `${Math.random()}`),
      sessionId: r.sessionId ?? r.session_id ?? r.session ?? sessionId,
      capturedAt: r.capturedAt ?? r.timestamp ?? r.createdAt ?? new Date().toISOString(),
      emotion: r.emotion ?? r.label ?? "neutral",
      confidence: Number(r.confidence ?? r.score ?? 0),
      imageUrl: r.imageUrl ?? r.cropUrl ?? r.faceImage ?? r.image ?? null,
      bbox: r.bbox ?? r.box ?? null,
      source: r.source ?? r.type ?? "unknown",
      meta: r.meta ?? r.metadata ?? r,
    };
  };

  // draw bbox on canvas when selected or image load
  const drawBox = () => {
    const det = selected;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!img || !det) return;
    if (!det.bbox) return;

    // set canvas to image display size
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    // compute box
    const { x, y, w, h } = det.bbox;
    const bx = x * canvas.width;
    const by = y * canvas.height;
    const bw = w * canvas.width;
    const bh = h * canvas.height;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#00FF88";
    ctx.strokeRect(bx, by, bw, bh);

    // label
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(bx, by - 26, 140, 26);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    const label = `${capitalize(det.emotion)} (${Math.round(det.confidence * 100)}%)`;
    ctx.fillText(label, bx + 8, by - 8);
  };

  // redraw whenever selected changes or image resizes/loads
  useEffect(() => {
    // small delay to let image size settle
    const t = setTimeout(drawBox, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // when image loads, redraw
  const onImageLoad = () => {
    drawBox();
  };

  const capitalize = (s: string) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return records.filter((r) => {
      if (filter !== "all" && r.emotion !== filter) return false;
      if (!q) return true;
      return (
        String(r.id).toLowerCase().includes(q) ||
        String(r.sessionId || "").toLowerCase().includes(q) ||
        (r.source || "").toLowerCase().includes(q) ||
        String(r.emotion || "").toLowerCase().includes(q)
      );
    });
  }, [records, filter, query]);

  const downloadAll = () => {
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
    a.download = `session-${sessionId || "export"}-detections.json`;
    a.click();
    message.success("Đã xuất JSON (client-side)");
  };

  const openDetectionDetail = (rec: DetectionRecord) => {
    navigate(`/detections/${encodeURIComponent(String(rec.id))}`);
  };

  const handleSelect = (rec: DetectionRecord) => {
    setSelected(rec);
    // scroll into view right-hand panel if needed (optional)
    const el = document.getElementById("detection-visual");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="p-6">
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <div className="flex items-center gap-3">
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
            <h2 className="text-lg font-semibold m-0">Chi tiết phiên: {sessionId}</h2>
            <Tag color="blue">{records.length} bản ghi</Tag>
          </div>
        </Col>

        <Col>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Tìm ID / Nguồn / Cảm xúc"
              allowClear
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: 280 }}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #D9D9D9" }}
            >
              <option value="all">Tất cả cảm xúc</option>
              <option value="happy">Vui</option>
              <option value="neutral">Bình thường</option>
              <option value="sad">Buồn</option>
            </select>
            <Tooltip title="Xuất JSON các bản ghi đang lọc">
              <Button icon={<DownloadOutlined />} onClick={downloadAll}>
                Xuất
              </Button>
            </Tooltip>
            <Tooltip title="Mở trang phiên (monitor)">
              <Button icon={<EyeOutlined />} onClick={() => navigate(`/monitor/${encodeURIComponent(String(sessionId || ""))}`)}>
                Mở Monitor
              </Button>
            </Tooltip>
          </div>
        </Col>
      </Row>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: list */}
        <div className="lg:col-span-1">
          <Card title="Bản ghi trong phiên" size="small" bodyStyle={{ padding: 8 }}>
            {loading ? (
              <div className="py-12 flex justify-center"><Spin /></div>
            ) : filtered.length === 0 ? (
              <Empty description="Không có bản ghi" />
            ) : (
              <List
                size="small"
                dataSource={filtered}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => handleSelect(item)}
                    style={{
                      cursor: "pointer",
                      background: selected?.id === item.id ? "#EEF2FF" : undefined,
                      borderRadius: 6,
                    }}
                    extra={
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>{Math.round(item.confidence * 100)}%</div>
                        <div style={{ fontSize: 12 }}>{formatDate(item.capturedAt)}</div>
                      </div>
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        item.imageUrl ? (
                          <img src={item.imageUrl} alt="face" className="w-12 h-9 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-9 bg-gray-100 rounded flex items-center justify-center">
                            <PictureOutlined />
                          </div>
                        )
                      }
                      title={<div className="flex items-center gap-2"><span style={{ fontWeight: 600 }}>{item.sessionId || "—"}</span><span style={{ color: "#666", fontSize: 12 }}>{item.source}</span></div>}
                      description={<div>{item.emotion === "happy" ? <Tag color="success">😊 Vui</Tag> : item.emotion === "sad" ? <Tag color="error">😢 Buồn</Tag> : <Tag>😐 Bình thường</Tag>}</div>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>

        {/* Right: visual + meta */}
        <div id="detection-visual" className="lg:col-span-3">
          <Card title="Xem chi tiết" size="small" extra={
            <div className="flex items-center gap-2">
              {selected && <Button size="small" onClick={() => openDetectionDetail(selected)} icon={<EyeOutlined />}>Mở chi tiết</Button>}
              <Button size="small" onClick={() => {
                if (!selected) { message.info("Chưa chọn bản ghi"); return; }
                const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `detection-${selected.id}.json`;
                a.click();
              }} icon={<DownloadOutlined />}>Xuất</Button>
            </div>
          }>
            {selected ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={10}>
                  <div style={{ position: "relative", width: "100%", minHeight: 260, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
                    {selected.imageUrl ? (
                      <>
                        {/* image + overlay canvas */}
                        <img
                          ref={imgRef}
                          src={selected.imageUrl}
                          alt={`det-${selected.id}`}
                          onLoad={onImageLoad}
                          style={{ maxWidth: "100%", maxHeight: 420, display: "block" }}
                        />
                        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 p-12">
                        <PictureOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
                        <div className="text-sm text-gray-500">Không có ảnh</div>
                      </div>
                    )}
                  </div>
                </Col>

                <Col xs={24} lg={14}>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
                    <Descriptions.Item label="Phiên">{selected.sessionId}</Descriptions.Item>
                    <Descriptions.Item label="Thời gian">{formatDate(selected.capturedAt)}</Descriptions.Item>
                    <Descriptions.Item label="Nguồn">{selected.source || "-"}</Descriptions.Item>
                    <Descriptions.Item label="Cảm xúc">
                      <span style={{ fontWeight: 700 }}>{capitalize(selected.emotion)}</span>
                      <span style={{ marginLeft: 8, color: "#666" }}> ({Math.round(selected.confidence * 100)}%)</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="BBox">{selected.bbox ? JSON.stringify(selected.bbox) : "-"}</Descriptions.Item>
                    <Descriptions.Item label="Meta">
                      <div style={{ maxHeight: 180, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 12 }}>
                        <pre style={{ margin: 0 }}>{JSON.stringify(selected.meta ?? {}, null, 2)}</pre>
                      </div>
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
            ) : loading ? (
              <div className="py-12 flex justify-center"><Spin /></div>
            ) : (
              <Empty description="Chưa chọn bản ghi" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetectionDetails;
