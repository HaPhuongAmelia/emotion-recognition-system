/* eslint-disable @typescript-eslint/no-explicit-any */
// History.tsx
import React, { useEffect, useState } from 'react';
import { Card, List, Button, Input, Spin, message, Row, Col, Tag, Space, Pagination } from 'antd';
import { EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/header';
import Footer from '../components/footer';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';

type DetectionRecord = {
  id: string;
  sessionId?: string;
  timestamp: string;
  emotion: 'happy' | 'sad' | 'neutral' | string;
  confidence: number;
};

type SessionItem = {
  id: string;
  name?: string;
  createdAt?: string;
  description?: string;
  totalDetections?: number;
  // additional fields
};

export default function History() {
  const [loading, setLoading] = useState<boolean>(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [query, setQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(8);
  const [totalSessions, setTotalSessions] = useState<number>(0);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLogin } = useLoginModal();

  const SESSIONS_API = import.meta.env.VITE_API_SESSIONS_URL || import.meta.env.VITE_API_BASE_URL || '';
  const DETECTIONS_API = import.meta.env.VITE_API_DETECTIONS_URL || import.meta.env.VITE_API_BASE_URL || '';

  // Load sessions (or demo data)
  useEffect(() => {
    const mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!SESSIONS_API) {
          // Demo data if no API configured
          const demo: SessionItem[] = Array.from({ length: 14 }).map((_, i) => ({
            id: `demo-${i + 1}`,
            name: `Phiên giám sát #${i + 1}`,
            createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24).toISOString(),
            description: 'Phiên demo lưu trữ kết quả phát hiện cảm xúc',
            totalDetections: Math.floor(Math.random() * 200),
          }));
          if (mounted) {
            setSessions(demo);
            setTotalSessions(demo.length);
          }
        } else {
          // try fetch from API (supporting basic pagination & search query if backend supports query params)
          const params: any = {
            _page: page,
            _limit: pageSize,
          };
          if (query) params.q = query;
          const res = await axios.get(SESSIONS_API, { params });
          // If backend returns list + total via headers, try to parse
          const data = res.data;
          const totalFromHeader = Number(res.headers['x-total-count'] || res.headers['x-total'] || 0);
          if (mounted) {
            setSessions(Array.isArray(data) ? data : []);
            setTotalSessions(totalFromHeader || (Array.isArray(data) ? data.length : 0));
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải sessions:', err);
        message.error('Không thể tải lịch sử phiên');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    // re-run when page/query change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SESSIONS_API, page, pageSize, query]);

  // Optionally preload some detection records for preview (demo or API)
  useEffect(() => {
    let mounted = true;
    const loadDetections = async () => {
      try {
        if (!DETECTIONS_API) {
          const demoDet: DetectionRecord[] = Array.from({ length: 40 }).map((_, i) => {
            const emotions = ['happy', 'sad', 'neutral'];
            const emo = emotions[Math.floor(Math.random() * emotions.length)];
            return {
              id: `det-${i + 1}`,
              sessionId: `demo-${Math.floor(i / 3) + 1}`,
              timestamp: new Date(Date.now() - i * 60000).toLocaleString(),
              emotion: emo,
              confidence: +(0.6 + Math.random() * 0.4).toFixed(2),
            };
          });
          if (mounted) setDetections(demoDet);
        } else {
          const res = await axios.get(DETECTIONS_API, { params: { _limit: 200 } });
          if (mounted) setDetections(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error('Lỗi khi tải detections:', err);
      }
    };
    loadDetections();
    return () => { mounted = false; };
  }, [DETECTIONS_API]);

  const onViewSession = (s: SessionItem) => {
    // navigate to monitor page for this session
    navigate(`/monitor/${s.id}`);
  };

  const onExportSession = (s: SessionItem) => {
    const records = detections.filter((d) => d.sessionId === s.id || !d.sessionId).slice(-200);
    const payload = {
      session: s,
      exportedAt: new Date().toISOString(),
      records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${s.id || 'export'}.json`;
    a.click();
    message.success('Đã xuất dữ liệu (client-side)');
  };

  const renderEmotionTag = (emo: string) => {
    if (emo === 'happy') return <Tag color="success">😊 Vui</Tag>;
    if (emo === 'sad') return <Tag color="error">😢 Buồn</Tag>;
    return <Tag>😐 Bình thường</Tag>;
  };

  const pagedSessions = sessions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <Header simulateBackend={false} onToggleSimulate={function (): void {
        throw new Error('Function not implemented.');
      } } onReset={function (): void {
        throw new Error('Function not implemented.');
      } } />
      <div className="w-full bg-[#F5F5FA] py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <Card>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={12}>
                <h2 className="text-lg font-semibold">Lịch sử phiên giám sát</h2>
                <p className="text-sm text-gray-500">Xem lại các phiên, xuất báo cáo hoặc truy cập phần Monitor.</p>
              </Col>
              <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                <Space>
                  <Input.Search
                    placeholder="Tìm theo tên hoặc ID phiên"
                    onSearch={(val) => { setQuery(val); setPage(1); }}
                    style={{ width: 280 }}
                    allowClear
                  />
                  <Button onClick={() => {
                    if (!user) {
                      message.info('Vui lòng đăng nhập để tải thêm dữ liệu');
                      openLogin('login');
                      return;
                    }
                    // refresh
                    setPage(1);
                    setQuery('');
                    message.success('Đã tải lại (demo)');
                  }}>
                    Tải lại
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : (
                  <>
                    {sessions.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">Chưa có phiên nào</div>
                    ) : (
                      <List
                        itemLayout="vertical"
                        dataSource={pagedSessions}
                        renderItem={(s) => (
                          <List.Item
                            key={s.id}
                            actions={[
                              <Button type="link" icon={<EyeOutlined />} onClick={() => onViewSession(s)}>Xem</Button>,
                              <Button type="link" icon={<DownloadOutlined />} onClick={() => onExportSession(s)}>Xuất</Button>
                            ]}
                          >
                            <List.Item.Meta
                              title={<div className="flex items-center justify-between">
                                <div className="font-medium">{s.name || s.id}</div>
                                <div className="text-xs text-gray-400">{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</div>
                              </div>}
                              description={<div className="text-sm text-gray-600">{s.description}</div>}
                            />
                            <div className="flex items-center gap-4 mt-2">
                              <div>
                                <div className="text-xs text-gray-500">Tổng phát hiện</div>
                                <div className="font-semibold">{s.totalDetections ?? detections.filter(d => d.sessionId === s.id).length}</div>
                              </div>

                              <div>
                                <div className="text-xs text-gray-500">Mẫu gần đây</div>
                                <div className="flex gap-2">
                                  {detections.filter(d => d.sessionId === s.id).slice(-3).reverse().map((d) => (
                                    <div key={d.id}>{renderEmotionTag(d.emotion)}</div>
                                  ))}
                                  {detections.filter(d => d.sessionId === s.id).length === 0 && <div className="text-xs text-gray-400">Chưa có</div>}
                                </div>
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    )}

                    <div className="flex justify-end mt-4">
                      <Pagination
                        current={page}
                        pageSize={pageSize}
                        total={totalSessions}
                        onChange={(p) => setPage(p)}
                        showSizeChanger={false}
                      />
                    </div>
                  </>
                )}
              </Card>
            </div>

            <div>
              <Card>
                <h4 className="text-sm font-medium mb-2">Tổng quan nhanh</h4>
                <div className="text-sm text-gray-600 mb-4">
                  Thông tin tóm tắt các phát hiện gần đây.
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500">Tổng bản ghi (cache)</div>
                    <div className="text-lg font-semibold">{detections.length}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Các cảm xúc phổ biến</div>
                    <Space direction="vertical">
                      <div className="flex items-center justify-between">
                        <div>😊 Vui</div>
                        <div className="font-semibold">{detections.filter(d => d.emotion === 'happy').length}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>😐 Bình thường</div>
                        <div className="font-semibold">{detections.filter(d => d.emotion === 'neutral').length}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>😢 Buồn</div>
                        <div className="font-semibold">{detections.filter(d => d.emotion === 'sad').length}</div>
                      </div>
                    </Space>
                  </div>

                  <div>
                    <Button
                      onClick={() => {
                        if (detections.length === 0) {
                          message.info('Không có dữ liệu để xuất');
                          return;
                        }
                        const payload = {
                          exportedAt: new Date().toISOString(),
                          summary: {
                            total: detections.length,
                            happy: detections.filter(d => d.emotion === 'happy').length,
                            neutral: detections.filter(d => d.emotion === 'neutral').length,
                            sad: detections.filter(d => d.emotion === 'sad').length,
                          },
                          records: detections.slice(-200),
                        };
                        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `detections-export-${Date.now()}.json`;
                        a.click();
                        message.success('Đã xuất dữ liệu (client-side)');
                      }}
                      block
                    >
                      Xuất tất cả (JSON)
                    </Button>
                  </div>
                </div>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h4 className="text-sm font-medium mb-2">Ghi chú</h4>
                <div className="text-xs text-gray-500">
                  Trang lịch sử dùng để xem lại các phiên giám sát và xuất báo cáo dạng JSON.
                  Nếu bạn cấu hình API (VITE_API_SESSIONS_URL / VITE_API_DETECTIONS_URL) thì trang sẽ gọi dữ liệu thực.
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
