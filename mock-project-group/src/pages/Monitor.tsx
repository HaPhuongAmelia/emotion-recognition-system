// Monitor.tsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Row, Col, Button, Spin, message, List, Card, Tag } from 'antd';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/header';
import Footer from '../components/footer';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';

type DetectionRecord = {
  id: string;
  timestamp: string;
  emotion: 'happy' | 'sad' | 'neutral' | string;
  confidence: number; // 0..1
};

type SessionMeta = {
  id: string;
  name?: string;
  createdAt?: string;
  description?: string;
  // any other meta fields returned by API
};

export default function Monitor() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionMeta | null>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [statistics, setStatistics] = useState({ happy: 0, sad: 0, neutral: 0, total: 0 });
  const [history, setHistory] = useState<DetectionRecord[]>([]);

  const intervalRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLogin } = useLoginModal();

  const API_SESSIONS_URL = import.meta.env.VITE_API_SESSIONS_URL || import.meta.env.VITE_API_BASE_URL || '';

  // Fetch session metadata (optional)
  useEffect(() => {
    let mounted = true;
    const fetchSession = async () => {
      setLoading(true);
      try {
        if (!API_SESSIONS_URL || !id) {
          // No API configured — assume local/demo
          if (mounted) {
            setSession({
              id: id || 'demo',
              name: 'Phiên giám sát cảm xúc (Demo)',
              createdAt: new Date().toISOString(),
              description: 'Phiên demo hiển thị luồng video và phát hiện cảm xúc theo thời gian thực (giả lập).',
            });
          }
        } else {
          const res = await axios.get(`${API_SESSIONS_URL}/${id}`);
          if (mounted) {
            setSession(res.data);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin phiên:', err);
        message.error('Không thể tải thông tin phiên giám sát');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSession();
    return () => {
      mounted = false;
    };
  }, [id, API_SESSIONS_URL]);

  // Simple random simulator for detection (demo only)
  const simulateDetect = (): DetectionRecord[] => {
    const count = Math.floor(Math.random() * 3); // 0..2
    const emotions = ['happy', 'sad', 'neutral'];
    const arr: DetectionRecord[] = [];
    for (let i = 0; i < count; i++) {
      const emo = emotions[Math.floor(Math.random() * emotions.length)];
      arr.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        emotion: emo,
        confidence: +(0.6 + Math.random() * 0.4).toFixed(2),
      });
    }
    return arr;
  };

  const startDetection = () => {
    if (!user) {
      message.info('Vui lòng đăng nhập để sử dụng chức năng phát hiện');
      openLogin('login');
      return;
    }

    if (isDetecting) return;
    setIsDetecting(true);

    intervalRef.current = window.setInterval(() => {
      const detected = simulateDetect();
      setDetections(detected);

      if (detected.length > 0) {
        setHistory((prev) => {
          const merged = [...prev, ...detected].slice(-200); // keep last 200
          return merged;
        });

        setStatistics((prev) => {
          const next = { ...prev };
          detected.forEach((d) => {
            if (d.emotion === 'happy') next.happy += 1;
            else if (d.emotion === 'sad') next.sad += 1;
            else next.neutral += 1;
            next.total += 1;
          });
          return next;
        });
      }
    }, 900); // detect ~every 900ms
  };

  const stopDetection = () => {
    setIsDetecting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDetections([]); // clear current detection overlay
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const satisfactionRate = statistics.total > 0 ? Math.round((statistics.happy / statistics.total) * 100) : 0;

  if (loading) {
    return (
      <div>
        <Header />
        <div className="flex justify-center mt-12">
          <Spin size="large" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />

      <div className="w-full bg-[#F5F5FA] py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <Row gutter={[20, 20]}>
            <Col xs={24}>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{session?.name || 'Phiên giám sát'}</h2>
                    <p className="text-xs text-gray-500 mt-1">{session?.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => navigate('/')} type="default">Quay về</Button>
                    {!isDetecting ? (
                      <Button type="primary" onClick={startDetection}>Bắt đầu phát hiện</Button>
                    ) : (
                      <Button danger onClick={stopDetection}>Dừng phát hiện</Button>
                    )}
                  </div>
                </div>
              </Card>
            </Col>

            {/* Main display & side stats */}
            <Col xs={24} lg={16}>
              <Card>
                {/* Video / placeholder area */}
                <div className="relative rounded-md overflow-hidden" style={{ minHeight: 420 }}>
                  {/* Placeholder blurred image */}
                  <div className="absolute inset-0">
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                      <svg width="420" height="280" viewBox="0 0 420 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
                        <rect width="420" height="280" rx="12" fill="#E5E7EB" />
                        <g transform="translate(40,40)" fill="#D1D5DB">
                          <rect width="340" height="200" rx="8" />
                          <circle cx="46" cy="86" r="28" fill="#E9ECEF" />
                          <rect x="92" y="72" width="160" height="14" rx="7" />
                          <rect x="92" y="98" width="110" height="12" rx="6" />
                        </g>
                      </svg>
                    </div>
                  </div>

                  {/* Overlay: current detections */}
                  <div className="relative z-10 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium">Phát hiện hiện tại</h3>
                        <p className="text-xs text-gray-500">Khuôn mặt: {detections.length}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Tỉ lệ hài lòng</div>
                        <div className="text-2xl font-semibold text-indigo-600">{satisfactionRate}%</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Danh sách phát hiện</h4>
                        {detections.length === 0 ? (
                          <div className="text-sm text-gray-400">Không có khuôn mặt đang hiển thị</div>
                        ) : (
                          <List
                            size="small"
                            dataSource={detections}
                            renderItem={(d) => (
                              <List.Item>
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <div className="text-sm font-medium">{d.emotion}</div>
                                    <div className="text-xs text-gray-500">{d.timestamp}</div>
                                  </div>
                                  <div className="text-sm">{Math.round(d.confidence * 100)}%</div>
                                </div>
                              </List.Item>
                            )}
                          />
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Biểu đồ / Thống kê (gọn)</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <div>😊 Vui</div>
                            <div className="font-semibold">{statistics.happy}</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>😐 Bình thường</div>
                            <div className="font-semibold">{statistics.neutral}</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>😢 Buồn</div>
                            <div className="font-semibold">{statistics.sad}</div>
                          </div>
                          <div className="border-t pt-2 text-xs text-gray-500">Tổng: {statistics.total}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* History list */}
              <Card style={{ marginTop: 16 }}>
                <h4 className="text-sm font-medium mb-3">Lịch sử phát hiện (gần đây)</h4>
                {history.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">Chưa có dữ liệu</div>
                ) : (
                  <List
                    size="small"
                    dataSource={history.slice().reverse().slice(0, 50)}
                    renderItem={(item) => (
                      <List.Item>
                        <div className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: item.emotion === 'happy' ? '#10b981' : item.emotion === 'sad' ? '#ef4444' : '#6b7280'
                            }} />
                            <div>
                              <div className="text-sm font-medium">{item.emotion}</div>
                              <div className="text-xs text-gray-400">{item.timestamp}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">{Math.round(item.confidence * 100)}%</div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            {/* Right column: quick info */}
            <Col xs={24} lg={8}>
              <Card>
                <h4 className="text-sm font-medium mb-2">Thông tin phiên</h4>
                <div className="text-sm text-gray-600 mb-3">
                  <div><strong>ID:</strong> {session?.id}</div>
                  <div><strong>Ngày tạo:</strong> {session?.createdAt ? new Date(session.createdAt).toLocaleString() : '-'}</div>
                </div>

                <h4 className="text-sm font-medium mb-2">Hành động</h4>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => {
                    // reset stats/history
                    setStatistics({ happy: 0, sad: 0, neutral: 0, total: 0 });
                    setHistory([]);
                    message.success('Đã đặt lại thống kê (demo)');
                  }}>
                    Đặt lại thống kê
                  </Button>

                  <Button onClick={() => {
                    // simple export of last 50 records as json (client-side)
                    if (history.length === 0) {
                      message.info('Không có dữ liệu để xuất');
                      return;
                    }
                    const payload = {
                      sessionId: session?.id,
                      exportedAt: new Date().toISOString(),
                      summary: { ...statistics, satisfactionRate: satisfactionRate },
                      records: history.slice(-50)
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `detection-export-${Date.now()}.json`;
                    a.click();
                    message.success('Đã xuất báo cáo (client-side)');
                  }}>
                    Xuất báo cáo (JSON)
                  </Button>
                </div>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h4 className="text-sm font-medium mb-2">Ghi chú</h4>
                <div className="text-xs text-gray-500">
                  Đây là giao diện demo cho phần Monitor của Emotion Recognition System.
                  Để tích hợp thực tế, thay hàm simulateDetect bằng gọi model (client-side hoặc backend).
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      <Footer />
    </div>
  );
}
