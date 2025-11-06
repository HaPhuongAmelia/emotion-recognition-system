/* eslint-disable @typescript-eslint/no-explicit-any */
// UserManager.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Tooltip,
  Space,
  Input,
  Modal,
  Form,
  Select,
  message,
  Dropdown,
} from "antd";
import {
  SearchOutlined,
  ExportOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDragScroll } from "../../hooks/useDragScroll";
import { useAuth } from "../../contexts/AuthContext";
import { useLoginModal } from "../../contexts/LoginModalContext";

interface UserData {
  key: string;
  stt: number;
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  role: "Admin" | "User";
  organization?: string;
  totalSessions?: number;
  totalDetections?: number;
  lastActive?: string; // ISO
  createdAt?: string;
  updatedAt?: string;
}

const roles: UserData["role"][] = ["Admin", "User"];

const UserManager: React.FC = () => {
  const BASE_URL = import.meta.env.VITE_API_USERS_URL || import.meta.env.VITE_BASE_URL || "";
  const [users, setUsers] = useState<UserData[]>([]);
  const { token } = useAuth();
  const { openLogin } = useLoginModal();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useDragScroll(scrollRef as unknown as React.RefObject<HTMLElement | null>);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(15);

  // load users (demo if no API)
  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      try {
        const res = BASE_URL
          ? await axios.get(`${BASE_URL}${BASE_URL.includes("/users") ? "" : "/users"}`)
          : null;

        let data: any[] = [];
        if (res && Array.isArray(res.data)) data = res.data;
        else if (!BASE_URL) {
          // demo users
          data = Array.from({ length: 18 }).map((_, i) => ({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            phoneNumber: `09${10000000 + i}`,
            role: i % 6 === 0 ? "admin" : "user",
            organization: i % 3 === 0 ? "Retail" : "Support",
            totalSessions: Math.floor(Math.random() * 120),
            totalDetections: Math.floor(Math.random() * 2000),
            lastActive: new Date(Date.now() - i * 3600_000).toISOString(),
            createdAt: new Date(Date.now() - (i + 5) * 86400000).toISOString(),
          }));
        }

        if (!mounted) return;

        const rows: UserData[] = data.map((u: any, idx: number) => {
          const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
          return {
            key: String(u.id ?? idx),
            stt: idx + 1,
            id: u.id ?? idx + 1,
            name: u.name ?? (fullName || "Unknown"),
            email: u.email ?? "",
            phone: u.phoneNumber ?? u.phone ?? "",
                  role: (String(u.role || "user").toLowerCase() === "admin") ? "Admin" : "User",
                  organization: u.organization ?? u.org ?? "",
                  totalSessions: u.totalSessions ?? u.sessionCount ?? 0,
                  totalDetections: u.totalDetections ?? u.detectionsCount ?? 0,
                  lastActive: u.lastActive ?? u.last_seen ?? u.updatedAt ?? u.createdAt,
                  createdAt: u.createdAt ?? u.registeredAt ?? new Date().toISOString(),
          };
        });

        setUsers(rows);
      } catch (err) {
        console.error("Error fetching users:", err);
        message.error("Không thể tải danh sách người dùng");
      }
    };

    fetchUsers();
    return () => { mounted = false; };
  }, [BASE_URL]);

  const roleToColor = (role: UserData["role"]) => (role === "Admin" ? "red" : "green");
  const mapRoleToApi = (role: UserData["role"]) => (role === "Admin" ? "admin" : "user");

  const handleOpenEdit = (row: UserData) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      email: row.email,
      phone: row.phone,
      organization: row.organization,
      role: row.role,
    });
    setEditOpen(true);
  };

  const handleSubmitEdit = async () => {
    try {
      const values = await form.validateFields();
      if (!editing) return;

      const authToken = token ?? localStorage.getItem("token") ?? localStorage.getItem("access_token");
      if (!authToken) {
        message.info("Vui lòng đăng nhập để cập nhật người dùng");
        openLogin("login");
        return;
      }
      const headers = { Authorization: `Bearer ${authToken}` };

      const payload = {
        name: values.name,
        email: values.email,
        phoneNumber: values.phone,
        organization: values.organization,
        role: mapRoleToApi(values.role),
        updatedAt: new Date().toISOString(),
      };

      if (BASE_URL) {
        await axios.patch(`${BASE_URL}/users/${editing.id}`, payload, { headers });
      }
      setUsers(prev => prev.map(u => (String(u.id) === String(editing.id) ? { ...u, ...payload, role: values.role } : u)));
      message.success("Cập nhật người dùng thành công");
      setEditOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (err: any) {
      if (err?.response) {
        message.error(err.response?.data?.message || "Cập nhật thất bại");
      } else {
        // validation error handled by form
      }
    }
  };

  const handleDelete = (row: UserData) => {
    Modal.confirm({
      title: "Xóa người dùng?",
      content: `Bạn có chắc muốn xóa người dùng "${row.name}" (ID: ${row.id})?`,
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const authToken = token ?? localStorage.getItem("token") ?? localStorage.getItem("access_token");
          if (!authToken) {
            message.info("Vui lòng đăng nhập để xóa người dùng");
            openLogin("login");
            return;
          }
          const headers = { Authorization: `Bearer ${authToken}` };
          if (BASE_URL) {
            await axios.delete(`${BASE_URL}/users/${row.id}`, { headers });
          }
          setUsers(prev => prev.filter(u => String(u.id) !== String(row.id)));
          message.success("Đã xóa người dùng");
        } catch (err: any) {
          console.error("Delete user error:", err);
          message.error(err?.response?.data?.message || "Xóa thất bại");
        }
      },
    });
  };

  // search helpers
  const normalize = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d");
  const digitsOnly = (s: string) => (s || "").replace(/\D+/g, "");

  const filteredUsers = useMemo(() => {
    const q = (search || "").trim();
    if (!q) return users;
    const qNorm = normalize(q);
    const qDigits = digitsOnly(q);
    return users
      .filter((u) => {
        const name = normalize(u.name || "");
        const email = (u.email || "").toLowerCase();
        const phone = digitsOnly(u.phone || "");
        return (
          (name && name.includes(qNorm)) ||
          (email && email.includes(qNorm)) ||
          (qDigits && phone.includes(qDigits))
        );
      })
      .map((u, idx) => ({ ...u, stt: idx + 1 }));
  }, [users, search]);

  const exportAll = () => {
    if (filteredUsers.length === 0) {
      message.info("Không có dữ liệu để xuất");
      return;
    }
    const payload = filteredUsers;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${Date.now()}.json`;
    a.click();
    message.success("Đã xuất file JSON (client-side)");
  };

  const userColumns: ColumnsType<UserData> = [
    { title: "STT", dataIndex: "stt", key: "stt", width: 60, align: "center", fixed: "left" },
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 120,
      fixed: "left",
      render: (text: any) => <a className="text-blue-500">{text}</a>,
      sorter: (a, b) => String(a.id).localeCompare(String(b.id)),
    },
    { title: "Tên", dataIndex: "name", key: "name", width: 220, fixed: "left" },
    { title: "Email", dataIndex: "email", key: "email", width: 220, ellipsis: true },
    { title: "SĐT", dataIndex: "phone", key: "phone", width: 140 },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 120,
      sorter: (a, b) => (a.role === b.role ? 0 : a.role === "Admin" ? -1 : 1),
      render: (role) => <Tag color={roleToColor(role)}>{role}</Tag>,
    },
    { title: "Tổ chức", dataIndex: "organization", key: "organization", width: 160 },
    {
      title: "Phiên",
      dataIndex: "totalSessions",
      key: "totalSessions",
      width: 100,
      render: (v) => v ?? 0,
      sorter: (a, b) => (Number(a.totalSessions ?? 0) - Number(b.totalSessions ?? 0)),
    },
    {
      title: "Phát hiện",
      dataIndex: "totalDetections",
      key: "totalDetections",
      width: 120,
      render: (v) => v ?? 0,
      sorter: (a, b) => (Number(a.totalDetections ?? 0) - Number(b.totalDetections ?? 0)),
    },
    {
      title: "Hoạt động gần nhất",
      dataIndex: "lastActive",
      key: "lastActive",
      width: 180,
      render: (val?: string) => (val ? new Date(val).toLocaleString() : "-"),
      sorter: (a, b) => (new Date(a.lastActive || 0).getTime() - new Date(b.lastActive || 0).getTime()),
    },
    {
      title: "Hành động",
      key: "action",
      width: 140,
      align: "center",
      fixed: "right",
      render: (_: any, row: UserData) => (
        <Space>
          <Tooltip title="Xem người dùng">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/users/${encodeURIComponent(String(row.id))}`)}
            />
          </Tooltip>

          <Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              onClick={() => handleOpenEdit(row)}
              icon={<EditOutlined />}
            />
          </Tooltip>

          <Tooltip title="Xóa">
            <Button
              type="text"
              size="small"
              onClick={() => handleDelete(row)}
              icon={<DeleteOutlined />}
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quản lý người dùng</h2>

        <div className="flex items-center gap-3">
          <Dropdown
            menu={{
              items: [
                { key: "15", label: "15 rows", onClick: () => setPageSize(15) },
                { key: "25", label: "25 rows", onClick: () => setPageSize(25) },
                { key: "50", label: "50 rows", onClick: () => setPageSize(50) },
              ],
            }}
          >
            <Button>
              {pageSize} rows <DownOutlined />
            </Button>
          </Dropdown>

          <Tooltip title="Export (JSON)">
            <Button icon={<ExportOutlined />} onClick={exportAll} />
          </Tooltip>

          <Tooltip title={!token ? "Vui lòng đăng nhập" : "Thêm người dùng"}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (!token) {
                  message.info("Vui lòng đăng nhập để tạo người dùng");
                  openLogin("login");
                  return;
                }
                createForm.resetFields();
                setCreateOpen(true);
              }}
            >
              Thêm mới
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Tìm theo tên, email hoặc số điện thoại"
          prefix={<SearchOutlined />}
          className="w-96"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto p-4" ref={scrollRef}>
          <Table
            columns={userColumns}
            dataSource={filteredUsers}
            pagination={{ pageSize }}
            rowKey="key"
            scroll={{ x: "max-content" }}
            bordered
            size="middle"
          />
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        title={editing ? `Sửa người dùng ${editing.name}` : "Sửa người dùng"}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSubmitEdit}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
        maskClosable={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Họ & Tên" rules={[{ required: true, message: "Vui lòng nhập tên" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email không hợp lệ" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="organization" label="Tổ chức / Phòng ban">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select options={roles.map(r => ({ label: r, value: r }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title="Thêm người dùng"
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        okText="Tạo"
        cancelText="Hủy"
        destroyOnClose
        maskClosable={false}
        onOk={async () => {
          try {
            const values = await createForm.validateFields();
            const authToken = token ?? localStorage.getItem("token") ?? localStorage.getItem("access_token");
            if (!authToken) {
              message.info("Vui lòng đăng nhập để tạo người dùng");
              openLogin("login");
              return;
            }
            const headers = { Authorization: `Bearer ${authToken}` };
            const now = new Date().toISOString();
            const payload: any = {
              name: values.name,
              email: values.email,
              password: values.password, // server is expected to hash
              phoneNumber: values.phone,
              organization: values.organization,
              role: mapRoleToApi(values.role),
              createdAt: now,
              updatedAt: now,
            };

            let createdUser: any = payload;
            if (BASE_URL) {
              // Prefer /register if available
              try {
                const res = await axios.post(`${BASE_URL}/register`, payload, { headers });
                createdUser = res.data?.user ?? res.data;
              } catch {
                const res2 = await axios.post(`${BASE_URL}/users`, payload, { headers });
                createdUser = res2.data ?? payload;
              }
            } else {
              // demo: create locally
              createdUser = { ...payload, id: `local-${Date.now()}` };
            }

            const newRow: UserData = {
              key: String(createdUser.id ?? Math.random()),
              stt: users.length + 1,
              id: createdUser.id ?? users.length + 1,
              name: createdUser.name,
              email: createdUser.email,
              phone: createdUser.phoneNumber ?? createdUser.phone,
              role: (String(createdUser.role || "user").toLowerCase() === "admin") ? "Admin" : "User",
              organization: createdUser.organization ?? "",
              totalSessions: createdUser.totalSessions ?? 0,
              totalDetections: createdUser.totalDetections ?? 0,
              lastActive: createdUser.lastActive ?? now,
              createdAt: createdUser.createdAt ?? now,
              updatedAt: createdUser.updatedAt ?? now,
            };

            setUsers(prev => [...prev, newRow]);
            message.success("Thêm người dùng thành công");
            setCreateOpen(false);
            createForm.resetFields();
          } catch (err: any) {
            if (axios.isAxiosError(err)) {
              message.error(err.response?.data?.message || "Thêm mới thất bại");
            }
          }
        }}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="Họ & Tên" rules={[{ required: true, message: "Vui lòng nhập tên" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email không hợp lệ" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 8, message: "Mật khẩu tối thiểu 8 ký tự" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="organization" label="Tổ chức / Phòng ban">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" initialValue={"User"} rules={[{ required: true }]}>
            <Select options={roles.map(r => ({ label: r, value: r }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManager;
