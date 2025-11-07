/* eslint-disable @typescript-eslint/no-unused-vars */
// DetectionManager.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Table,
  Input,
  Button,
  Dropdown,
  Space,
  Pagination,
  Tooltip,
  Modal,
  message,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  ExportOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDragScroll } from '../../hooks/useDragScroll';

type DetectionRecord = {
  key: string;
  id: string;
  sessionId?: string;
  capturedAt: string; // ISO or readable
  source?: string; // camera / upload / video
  emotion: 'happy' | 'sad' | 'neutral' | string;
  confidence: number; // 0..1
  meta?: any;
};

const DetectionManager: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deletingRecord, setDeletingRecord] = useState<DetectionRecord | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const { token, user } = useAuth();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useDragScroll(scrollRef as unknown as React.RefObject<HTMLElement | null>);

  const DETECTIONS_API = import.meta.env.VITE_API_DETECTIONS_URL || (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL}/detections` : '');

  useEffect(() => {
    let mounted = true;

    const fetchDetections = async () => {
      setLoading(true);
      try {
        if (!DETECTIONS_API) {
          // demo data
          const demo: DetectionRecord[] = Array.from({ length: 60 }).map((_, i) => {
            const emotions = ['happy', 'sad', 'neutral'];
            const emo = emotions[Math.floor(Math.random() * emotions.length)];
            return {
              key: `demo-${i + 1}`,
              id: `demo-${i + 1}`,
              sessionId: `session-${Math.floor(i / 5) + 1}`,
              capturedAt: new Date(Date.now() - i * 60000).toISOString(),
              source: i % 3 === 0 ? 'video' : 'webcam',
              emotion: emo,
              confidence: +(0.6 + Math.random() * 0.4).toFixed(2),
              meta: {},
            };
          });
          if (mounted) setRecords(demo);
        } else {
          const res = await axios.get(DETECTIONS_API, { params: { _limit: 1000 } });
          const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.items) ? res.data.items : []);
          const normalized: DetectionRecord[] = list.map((r: any, idx: number) => ({
            key: String(r.id ?? r._id ?? `${idx}`),
            id: String(r.id ?? r._id ?? `${idx}`),
            sessionId: r.sessionId ?? r.session?.id ?? r.session_id ?? '',
            capturedAt: r.capturedAt ?? r.timestamp ?? r.createdAt ?? new Date().toISOString(),
            source: r.source ?? r.type ?? 'unknown',
            emotion: r.emotion ?? r.label ?? 'neutral',
            confidence: Number(r.confidence ?? r.score ?? 0),
            meta: r.meta ?? {},
          }));
          if (mounted) setRecords(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch detections:', err);
        message.error('Không thể tải dữ liệu phát hiện');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDetections();
    return () => { mounted = false; };
  }, [DETECTIONS_API]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<DetectionRecord> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const columns: ColumnsType<DetectionRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      fixed: 'left',
      render: (text: string, record: DetectionRecord) => (
        <a className="text-blue-600" onClick={() => navigate(`/monitor/${encodeURIComponent(record.sessionId || '')}`)}>{text}</a>
      ),
    },
    {
      title: 'Phiên',
      dataIndex: 'sessionId',
      key: 'sessionId',
      width: 140,
      render: (s: string) => s || '-',
    },
    {
      title: 'Thời gian',
      dataIndex: 'capturedAt',
      key: 'capturedAt',
      width: 180,
      render: (d: string) => {
        try {
          const dt = new Date(d);
          return isNaN(dt.getTime()) ? d : dt.toLocaleString();
        } catch {
          return d;
        }
      },
      sorter: (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
      width: 110,
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: 'Cảm xúc',
      dataIndex: 'emotion',
      key: 'emotion',
      width: 140,
      render: (e: string) => {
        if (e === 'happy') return <Tag color="success">😊 Vui</Tag>;
        if (e === 'sad') return <Tag color="error">😢 Buồn</Tag>;
        return <Tag>😐 Bình thường</Tag>;
      },
      filters: [
        { text: 'Vui', value: 'happy' },
        { text: 'Bình thường', value: 'neutral' },
        { text: 'Buồn', value: 'sad' },
      ],
      onFilter: (value, record) => String(record.emotion) === String(value),
    },
    {
      title: 'Độ tin cậy',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (c: number) => `${Math.round((Number(c) || 0) * 100)}%`,
      sorter: (a, b) => (Number(a.confidence) || 0) - (Number(b.confidence) || 0),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 140,
      align: 'center',
      fixed: 'right',
      render: (_: any, record: DetectionRecord) => (
        <Space>
          <Tooltip title="Xem phiên">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/monitor/${encodeURIComponent(record.sessionId || '')}`)}
            />
          </Tooltip>

          <Tooltip title="Xóa bản ghi">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => { setDeletingRecord(record); setDeleteOpen(true); }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Derived data: filter by search
  const filtered = useMemo(() => {
    if (!searchText.trim()) return records;
    const q = searchText.toLowerCase();
    return records.filter(r =>
      r.id.toLowerCase().includes(q) ||
      (r.sessionId || '').toLowerCase().includes(q) ||
      String(r.emotion).toLowerCase().includes(q) ||
      (r.source || '').toLowerCase().includes(q)
    );
  }, [records, searchText]);

  const totalItems = filtered.length;
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pageSizeItems = [20, 50, 100].map(size => ({
    key: String(size),
    label: `${size} rows`,
    onClick: () => {
      setPageSize(size);
      setPage(1);
    },
  }));

  const handleBulkExport = () => {
    if (selectedRowKeys.length === 0) {
      message.info('Chưa chọn bản ghi để xuất');
      return;
    }
    const payload = records.filter(r => selectedRowKeys.includes(r.key));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detections-export-${Date.now()}.json`;
    a.click();
    message.success('Đã xuất file JSON (client-side)');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    const BASE = import.meta.env.VITE_BASE_URL || '';
    const authToken = token ?? localStorage.getItem('token') ?? localStorage.getItem('access_token') ?? localStorage.getItem('accessToken');
    if (!authToken) {
      message.error('Bạn cần đăng nhập để xóa bản ghi');
      return;
    }

    try {
      setDeleting(true);
      if (DETECTIONS_API) {
        await axios.delete(`${DETECTIONS_API}/${encodeURIComponent(deletingRecord.id)}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } else {
        // demo mode: just remove locally
      }
      setRecords(prev => prev.filter(r => r.id !== deletingRecord.id));
      message.success('Đã xóa bản ghi');
      setDeleteOpen(false);
      setDeletingRecord(null);
    } catch (err: any) {
      console.error('Delete detection failed:', err);
      message.error('Xóa bản ghi thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quản lý kết quả nhận diện</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Tìm ID / Phiên / Cảm xúc / Nguồn"
                prefix={<SearchOutlined />}
                className="w-80"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Tooltip title={!token ? 'Vui lòng đăng nhập' : 'Export selected'}>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleBulkExport}
                  disabled={!token || selectedRowKeys.length === 0}
                >
                  Xuất chọn
                </Button>
              </Tooltip>

              <Dropdown
                menu={{ items: pageSizeItems }}
                trigger={['click']}
              >
                <Button>
                  {pageSize} rows <DownOutlined />
                </Button>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" ref={scrollRef}>
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={paged}
            loading={loading}
            pagination={false}
            size="middle"
            rowKey="key"
            scroll={{ x: 1200 }}
            onChange={() => { /* sorting/filter handled client-side in columns */ }}
            className="ant-table-striped"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">Total {totalItems} records</div>

          <Pagination
            current={page}
            total={totalItems}
            pageSize={pageSize}
            showSizeChanger={false}
            onChange={(p) => setPage(p)}
          />
        </div>
      </div>

      {/* Delete confirm modal */}
      <Modal
        title="Xác nhận xóa bản ghi"
        open={deleteOpen}
        onCancel={() => { setDeleteOpen(false); setDeletingRecord(null); }}
        okText="Xóa"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelText="Hủy"
        onOk={handleDeleteConfirm}
        centered
        destroyOnClose
        maskClosable={false}
      >
        <p>
          Bạn có chắc muốn xóa bản ghi
          {deletingRecord ? ` (ID: ${deletingRecord.id}, Phiên: ${deletingRecord.sessionId || '-'})` : ''}?
        </p>
      </Modal>
    </div>
  );
};

export default DetectionManager;
