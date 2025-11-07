/* eslint-disable @typescript-eslint/no-unused-vars */
// ModelManager.tsx
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
  Form,
  message,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  ExportOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import { useAuth } from '../../contexts/AuthContext';
import { useDragScroll } from '../../hooks/useDragScroll';
import { useNavigate } from 'react-router-dom';

type ModelMetrics = {
  accuracy?: number;
  loss?: number;
  [key: string]: any;
};

type ModelData = {
  key: string;
  stt: number;
  id: string;
  name: string;
  version?: string;
  framework?: string;
  status?: 'active' | 'inactive' | 'training' | string;
  metrics?: ModelMetrics;
  createdAt?: string;
  lastTrained?: string;
  description?: string;
};

const ModelManager: React.FC = () => {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [form] = Form.useForm();
  const { token, user } = useAuth();
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<ModelData | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deletingRecord, setDeletingRecord] = useState<ModelData | null>(null);
  const [sortField, setSortField] = useState<keyof ModelData | undefined>();
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(null);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useDragScroll(scrollRef as unknown as React.RefObject<HTMLElement | null>);

  const MODELS_API = import.meta.env.VITE_API_MODELS_URL || (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL}/models` : '');

  useEffect(() => {
    let mounted = true;

    const fetchModels = async () => {
      try {
        setLoading(true);
        if (!MODELS_API) {
          // demo models
          const demo: ModelData[] = Array.from({ length: 12 }).map((_, i) => {
            const acc = +(0.7 + Math.random() * 0.25).toFixed(3);
            const status = i % 5 === 0 ? 'training' : (i % 3 === 0 ? 'inactive' : 'active');
            const framework = i % 2 === 0 ? 'TensorFlow' : 'PyTorch';
            const v = `v${1 + Math.floor(i / 3)}.${i % 3}`;
            const created = new Date(Date.now() - i * 86400000).toISOString();
            return {
              key: `demo-${i + 1}`,
              stt: i + 1,
              id: `model-${i + 1}`,
              name: `EmotionNet-${i + 1}`,
              version: v,
              framework,
              status,
              metrics: { accuracy: acc },
              createdAt: created,
              lastTrained: created,
              description: 'Demo model for emotion recognition',
            } as ModelData;
          });
          if (mounted) setModels(demo);
        } else {
          const res = await axios.get(MODELS_API, { params: { _limit: 1000 } });
          const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.items) ? res.data.items : []);
          const normalized: ModelData[] = list.map((m: any, idx: number) => ({
            key: String(m.id ?? m._id ?? idx),
            stt: idx + 1,
            id: String(m.id ?? m._id ?? idx),
            name: m.name ?? m.modelName ?? 'Unnamed',
            version: m.version ?? m.tag ?? 'v1.0',
            framework: m.framework ?? m.engine ?? 'unknown',
            status: m.status ?? 'inactive',
            metrics: m.metrics ?? m.stats ?? {},
            createdAt: m.createdAt ?? m.created_at ?? new Date().toISOString(),
            lastTrained: m.lastTrained ?? m.trainedAt ?? null,
            description: m.description ?? '',
          }));
          if (mounted) setModels(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
        message.error('Không thể tải danh sách model');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchModels();
    return () => { mounted = false; };
  }, [MODELS_API]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<ModelData> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const columns: ColumnsType<ModelData> = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      width: 80,
      align: 'center',
      fixed: 'left',
    },
    {
      title: 'Model ID',
      dataIndex: 'id',
      key: 'id',
      width: 160,
      fixed: 'left',
      sorter: true,
      sortOrder: sortField === 'id' ? sortOrder ?? undefined : undefined,
      render: (text: string, record: ModelData) => (
        <a onClick={() => navigate(`/admin/models/${encodeURIComponent(record.id)}`)} className="text-blue-600">{text}</a>
      ),
    },
    {
      title: 'Tên model',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      fixed: 'left',
      render: (n: string) => <div className="font-medium">{n}</div>,
    },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      key: 'version',
      width: 120,
    },
    {
      title: 'Framework',
      dataIndex: 'framework',
      key: 'framework',
      width: 140,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => {
        if (s === 'active') return <Tag color="success">Hoạt động</Tag>;
        if (s === 'training') return <Tag color="warning">Đang training</Tag>;
        return <Tag>Không hoạt động</Tag>;
      },
      filters: [
        { text: 'Hoạt động', value: 'active' },
        { text: 'Đang training', value: 'training' },
        { text: 'Không hoạt động', value: 'inactive' },
      ],
      onFilter: (value, record) => String(record.status) === String(value),
    },
    {
      title: 'Accuracy',
      dataIndex: ['metrics'],
      key: 'accuracy',
      width: 120,
      render: (m: ModelMetrics) => `${Math.round(((m?.accuracy ?? 0) * 100))}%`,
      sorter: (a, b) => (Number(a.metrics?.accuracy ?? 0) - Number(b.metrics?.accuracy ?? 0)),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      sortOrder: sortField === 'createdAt' ? sortOrder ?? undefined : undefined,
      render: (d: string) => {
        try {
          const dt = new Date(d);
          return isNaN(dt.getTime()) ? d : dt.toLocaleString();
        } catch { return d; }
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 160,
      align: 'center',
      fixed: 'right',
      render: (_: any, record: ModelData) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/models/${encodeURIComponent(record.id)}`)}
            />
          </Tooltip>

          <Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                editForm.setFieldsValue({
                  name: record.name,
                  version: record.version,
                  framework: record.framework,
                  status: record.status,
                });
                setEditOpen(true);
              }}
              disabled={!token && !localStorage.getItem('token')}
            />
          </Tooltip>

          <Tooltip title="Xóa">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => { setDeletingRecord(record); setDeleteOpen(true); }}
              disabled={!token && !localStorage.getItem('token')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Derived data: search + pagination
  const filteredModels = useMemo(() => {
    if (!searchText.trim()) return models;
    const q = searchText.toLowerCase();
    return models.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.framework || '').toLowerCase().includes(q) ||
      (m.version || '').toLowerCase().includes(q)
    );
  }, [models, searchText]);

  const sortedModels = useMemo(() => {
    if (!sortField || !sortOrder) return filteredModels;
    const list = [...filteredModels];
    const dir = sortOrder === 'ascend' ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      // basic numeric/date/lexicographic sort
      if (sortField === 'id') {
        const nA = Number(String(av).replace(/[^\d]/g, '')) || 0;
        const nB = Number(String(bv).replace(/[^\d]/g, '')) || 0;
        return (nA - nB) * dir;
      }
      if (sortField === 'createdAt') {
        const tA = Date.parse(String(av));
        const tB = Date.parse(String(bv));
        return ((isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB)) * dir;
      }
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return list.map((m, idx) => ({ ...m, stt: idx + 1 }));
  }, [filteredModels, sortField, sortOrder]);

  const totalItems = sortedModels.length;
  const pagedModels = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedModels.slice(start, start + pageSize);
  }, [sortedModels, page, pageSize]);

  const pageSizeItems = [15, 25, 50, 100].map(size => ({
    key: String(size),
    label: `${size} rows`,
    onClick: () => { setPageSize(size); setPage(1); },
  }));

  const handleCreateSubmit = async (values: any) => {
    const BASE_URL = import.meta.env.VITE_BASE_URL || '';
    const authToken = token ?? localStorage.getItem('token');
    if (!authToken) {
      message.error('Bạn cần đăng nhập để tạo model');
      return;
    }

    const payload = {
      name: String(values.name).trim(),
      version: String(values.version || 'v1.0'),
      framework: String(values.framework || 'TensorFlow'),
      status: String(values.status || 'inactive'),
      metrics: values.metrics ?? {},
      description: String(values.description || ''),
      createdAt: new Date().toISOString(),
      createdBy: user?.id ?? null,
    };

    try {
      setCreateLoading(true);
      if (MODELS_API) {
        const res = await axios.post(MODELS_API, payload, { headers: { Authorization: `Bearer ${authToken}` } });
        const created = res.data;
        message.success('Tạo model thành công');
        const nextStt = models.length > 0 ? Math.max(...models.map(m => m.stt)) + 1 : 1;
        const newRow: ModelData = {
          key: String(created.id ?? created._id ?? payload.name + '-' + Date.now()),
          stt: nextStt,
          id: String(created.id ?? created._id ?? payload.name + '-' + Date.now()),
          name: payload.name,
          version: payload.version,
          framework: payload.framework,
          status: payload.status,
          metrics: payload.metrics,
          createdAt: created.createdAt ?? payload.createdAt,
          lastTrained: created.lastTrained ?? null,
          description: payload.description,
        };
        setModels(prev => [...prev, newRow]);
      } else {
        // demo: add locally
        const nextStt = models.length > 0 ? Math.max(...models.map(m => m.stt)) + 1 : 1;
        const newRow: ModelData = {
          key: `local-${Date.now()}`,
          stt: nextStt,
          id: `local-${Date.now()}`,
          name: payload.name,
          version: payload.version,
          framework: payload.framework,
          status: payload.status,
          metrics: payload.metrics,
          createdAt: payload.createdAt,
          description: payload.description,
        };
        setModels(prev => [...prev, newRow]);
        message.success('Tạo model (demo) thành công');
      }

      form.resetFields();
      setCreateOpen(false);
    } catch (err: any) {
      console.error('Create model failed:', err);
      const status = err?.response?.status;
      const data = err?.response?.data;
      message.error(`Tạo model thất bại${status ? ` (${status})` : ''}${data?.message ? ` - ${data.message}` : ''}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSubmit = async (values: any) => {
    if (!editing) return;
    const BASE_URL = import.meta.env.VITE_BASE_URL || '';
    const authToken = token ?? localStorage.getItem('token');
    if (!authToken) {
      message.error('Bạn cần đăng nhập để cập nhật model');
      return;
    }

    const payload = {
      name: String(values.name || editing.name).trim(),
      version: String(values.version || editing.version || 'v1.0'),
      framework: String(values.framework || editing.framework || 'TensorFlow'),
      status: String(values.status || editing.status || 'inactive'),
      description: String(values.description || editing.description || ''),
    };

    try {
      setEditLoading(true);
      if (MODELS_API) {
        await axios.put(`${MODELS_API}/${encodeURIComponent(editing.id)}`, payload, { headers: { Authorization: `Bearer ${authToken}` } });
      }
      setModels(prev => prev.map(m => m.id === editing.id ? { ...m, ...payload } : m));
      message.success('Cập nhật model thành công');
      setEditOpen(false);
      setEditing(null);
      editForm.resetFields();
    } catch (err: any) {
      console.error('Update model failed:', err);
      message.error('Cập nhật model thất bại');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    const authToken = token ?? localStorage.getItem('token');
    if (!authToken) {
      message.error('Bạn cần đăng nhập để xóa model');
      return;
    }

    try {
      setDeleting(true);
      if (MODELS_API) {
        await axios.delete(`${MODELS_API}/${encodeURIComponent(deletingRecord.id)}`, { headers: { Authorization: `Bearer ${authToken}` } });
      }
      setModels(prev => prev.filter(c => c.id !== deletingRecord.id));
      message.success('Xóa model thành công');
      setDeleteOpen(false);
      setDeletingRecord(null);
    } catch (err: any) {
      console.error('Delete model failed:', err);
      message.error('Xóa model thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedRowKeys.length === 0) {
      message.info('Chưa chọn model để xuất');
      return;
    }
    const payload = models.filter(m => selectedRowKeys.includes(m.key));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `models-export-${Date.now()}.json`;
    a.click();
    message.success('Đã xuất file JSON (client-side)');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quản lý Model AI</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Tìm theo ID / Tên / Framework / Phiên bản"
                prefix={<SearchOutlined className="text-gray-400" />}
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

              <Tooltip title={(!token && !localStorage.getItem('token')) ? 'Vui lòng đăng nhập' : ''}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className="flex items-center bg-blue-500 hover:bg-blue-600"
                  onClick={() => setCreateOpen(true)}
                  disabled={!token && !localStorage.getItem('token')}
                >
                  Thêm model
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" ref={scrollRef}>
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={pagedModels}
            loading={loading}
            pagination={false}
            size="middle"
            onChange={(pagination, filters, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter;
              if (s && 'field' in s) {
                const f = s.field as keyof ModelData;
                setSortField(f);
                setSortOrder((s.order as any) || null);
                setPage(1);
              }
            }}
            scroll={{ x: 1200 }}
            className="ant-table-striped"
            rowKey="key"
          />
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <Dropdown menu={{ items: pageSizeItems }} trigger={["click"]}>
              <Button className="flex items-center">
                {pageSize} rows
                <DownOutlined className="ml-1 text-xs" />
              </Button>
            </Dropdown>
            <span className="text-sm text-gray-500">Total {totalItems} items</span>
          </div>

          <Pagination
            current={page}
            total={totalItems}
            pageSize={pageSize}
            showSizeChanger={false}
            showQuickJumper={false}
            className="flex items-center"
            onChange={(p) => setPage(p)}
          />
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        title="Thêm Model mới"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={createLoading}
        onOk={() => form.submit()}
        destroyOnClose
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
        >
          <Form.Item
            name="name"
            label="Tên model"
            rules={[{ required: true, message: 'Vui lòng nhập tên model' }]}
          >
            <Input placeholder="VD: EmotionNet-v2" />
          </Form.Item>

          <Form.Item name="version" label="Phiên bản">
            <Input placeholder="VD: v1.0" />
          </Form.Item>

          <Form.Item name="framework" label="Framework">
            <Input placeholder="VD: TensorFlow / PyTorch" />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái">
            <Input placeholder="active | inactive | training" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả ngắn">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Sửa Model ${editing?.id ?? ''}`}
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditing(null); }}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={editLoading}
        onOk={() => editForm.submit()}
        destroyOnClose
        maskClosable={false}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="name"
            label="Tên model"
            rules={[{ required: true, message: 'Vui lòng nhập tên model' }]}
          >
            <Input placeholder="Tên model" />
          </Form.Item>

          <Form.Item name="version" label="Phiên bản">
            <Input placeholder="Phiên bản" />
          </Form.Item>

          <Form.Item name="framework" label="Framework">
            <Input placeholder="Framework" />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái">
            <Input placeholder="active | inactive | training" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả ngắn">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Xác nhận xóa"
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
          Bạn có chắc muốn xóa model
          {deletingRecord ? ` "${deletingRecord.name}" (ID: ${deletingRecord.id})` : ''}?
        </p>
        <p className="text-red-500 text-sm mt-2">
          <strong>Lưu ý:</strong> Hành động này có thể xóa các bản ghi liên quan (deploy, lịch sử).
        </p>
      </Modal>
    </div>
  );
};

export default ModelManager;
