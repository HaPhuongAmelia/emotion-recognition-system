/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Descriptions,
  Spin,
  Button,
  Tag,
  Row,
  Col,
  Progress,
  message,
  Empty,
  Space,
} from "antd";
import { DownloadOutlined, FileTextOutlined } from "@ant-design/icons";
import axios from "axios";
import { useParams } from "react-router-dom";

type AnyObj = Record<string, any>;

// API URL (lấy từ .env)
const MODELS_API =
  import.meta.env.VITE_API_MODELS_URL ||
  (import.meta.env.VITE_BASE_URL
    ? `${import.meta.env.VITE_BASE_URL}/models`
    : "");

// Format ngày/thời gian
const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

// Format accuracy %
const pct = (v?: number) => {
  if (v == null || Number.isNaN(Number(v))) return "-";
  return `${Math.round(Number(v) * 100)}%`;
};

const ModelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [model, setModel] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!id) {
          if (mounted) setModel(null);
          return;
        }

        if (!MODELS_API) {
          // Demo model (khi chưa có backend)
          const demo = {
            id,
            name: `EmotionNet-${id}`,
            version: "v1.2.0",
            framework: Math.random() > 0.5 ? "TensorFlow" : "PyTorch",
            status: Math.random() > 0.7 ? "training" : "active",
            metrics: {
              accuracy: +(0.75 + Math.random() * 0.2).toFixed(3),
              loss: +(0.2 + Math.random() * 0.3).toFixed(3),
            },
            createdAt: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 7
            ).toISOString(),
            lastTrained: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 2
            ).toISOString(),
            description:
              "Emotion recognition model for facial emotion classification demo.",
            artifactUrl: null,
            trainings: [
              {
                runId: "run-1",
                date: new Date(
                  Date.now() - 1000 * 60 * 60 * 24 * 7
                ).toISOString(),
                accuracy: 0.72,
              },
              {
                runId: "run-2",
                date: new Date(
                  Date.now() - 1000 * 60 * 60 * 24 * 3
                ).toISOString(),
                accuracy: 0.78,
              },
            ],
          };
          if (mounted) setModel(demo);
          return;
        }

        const base = MODELS_API.replace(/\/$/, "");
        const res = await axios.get(`${base}/${encodeURIComponent(String(id))}`);
        if (mounted) setModel(res.data ?? null);
      } catch (err) {
        console.error("Failed to load model detail:", err);
        if (mounted) {
          setModel(null);
          message.error("Không thể tải thông tin mô hình.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Chuẩn hóa dữ liệu model
  const normalized = useMemo(() => {
    const m: AnyObj = model || {};
    const modelId = m.id ?? m._id ?? id ?? "unknown";
    const name = m.name ?? m.modelName ?? "-";
    const version = m.version ?? m.tag ?? "-";
    const framework = m.framework ?? m.engine ?? "-";
    const status = m.status ?? "unknown";
    const metrics = m.metrics ?? m.stats ?? {};
    const acc = metrics.accuracy ?? metrics.acc ?? null;
    const loss = metrics.loss ?? null;
    const createdAt = m.createdAt ?? m.created_at ?? m.created ?? null;
    const lastTrained = m.lastTrained ?? m.trainedAt ?? null;
    const description = m.description ?? m.summary ?? "-";
    const artifactUrl =
      m.artifactUrl ?? m.modelUrl ?? m.downloadUrl ?? null;
    const trainings = Array.isArray(m.trainings)
      ? m.trainings
      : Array.isArray(m.runs)
      ? m.runs
      : [];
    return {
      modelId,
      name,
      version,
      framework,
      status,
      metrics,
      acc,
      loss,
      createdAt,
      lastTrained,
      description,
      artifactUrl,
      trainings,
      raw: m,
    };
  }, [model, id]);

  // Tải model artifact
  const downloadModel = () => {
    if (!normalized.artifactUrl) {
      message.info("Không có artifact để tải về.");
      return;
    }
    const a = document.createElement("a");
    a.href = normalized.artifactUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  };

  // Xuất dữ liệu model ra JSON
  const exportJSON = () => {
    if (!model) {
      message.info("Không có dữ liệu để xuất.");
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      model,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `model-${normalized.modelId || "export"}.json`;
    a.click();
    message.success("Đã tải file JSON thành công.");
  };

  // UI hiển thị
  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );

  if (!model)
    return (
      <div className="p-6">
        <Card>
          <Empty description="Không tìm thấy mô hình." />
        </Card>
      </div>
    );

  return (
    <div className="p-6">
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <h2 className="text-xl font-semibold">
            Model #{normalized.modelId} — {normalized.name}
          </h2>
          <div className="text-sm text-gray-500">
            {normalized.framework} • {normalized.version}
          </div>
        </Col>
        <Col>
          <Space>
            {normalized.artifactUrl && (
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadModel}
                type="primary"
              >
                Tải artifact
              </Button>
            )}
            <Button icon={<FileTextOutlined />} onClick={exportJSON}>
              Xuất JSON
            </Button>
          </Space>
        </Col>
      </Row>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Thông tin chính */}
        <Card title="Thông tin chính">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Model ID">
              {normalized.modelId}
            </Descriptions.Item>
            <Descriptions.Item label="Tên">{normalized.name}</Descriptions.Item>
            <Descriptions.Item label="Phiên bản">
              {normalized.version}
            </Descriptions.Item>
            <Descriptions.Item label="Framework">
              {normalized.framework}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {normalized.status === "active" && (
                <Tag color="success">Hoạt động</Tag>
              )}
              {normalized.status === "training" && (
                <Tag color="warning">Đang training</Tag>
              )}
              {normalized.status !== "active" &&
                normalized.status !== "training" && (
                  <Tag>{normalized.status}</Tag>
                )}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {formatDate(normalized.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Huấn luyện lần cuối">
              {formatDate(normalized.lastTrained)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Metrics */}
        <Card title="Chỉ số huấn luyện">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500 mb-1">Accuracy</div>
              {normalized.acc != null ? (
                <Progress percent={Math.round(Number(normalized.acc) * 100)} />
              ) : (
                <div className="text-sm">-</div>
              )}
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Loss</div>
              {normalized.loss != null ? (
                <div className="text-sm font-medium">
                  {String(normalized.loss)}
                </div>
              ) : (
                <div className="text-sm">-</div>
              )}
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">
                Các chỉ số khác
              </div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                {JSON.stringify(normalized.metrics, null, 2)}
              </pre>
            </div>
          </div>
        </Card>

        {/* Mô tả & lịch sử */}
        <Card title="Mô tả & lịch sử huấn luyện">
          <div className="mb-3 text-sm text-gray-800 whitespace-pre-wrap">
            {normalized.description}
          </div>

          <div className="text-sm text-gray-600 mb-2">Lịch sử runs</div>
          {Array.isArray(normalized.trainings) &&
          normalized.trainings.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-auto">
              {normalized.trainings.map((t: any, idx: number) => (
                <div key={idx} className="p-2 bg-gray-50 rounded">
                  <div className="text-sm font-medium">
                    {t.runId ?? `run-${idx + 1}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(t.date ?? t.createdAt ?? t.created)}
                  </div>
                  {t.accuracy != null && (
                    <div className="text-xs">Accuracy: {pct(t.accuracy)}</div>
                  )}
                  {t.loss != null && (
                    <div className="text-xs">Loss: {String(t.loss)}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              <Empty description="Không có lịch sử huấn luyện" />
            </div>
          )}
        </Card>
      </div>

      {/* Raw JSON */}
      <Card title="Dữ liệu thô (metadata)">
        <div style={{ maxHeight: 420, overflow: "auto", fontSize: 13 }}>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(normalized.raw, null, 2)}
          </pre>
        </div>
      </Card>
    </div>
  );
};

export default ModelDetail;
