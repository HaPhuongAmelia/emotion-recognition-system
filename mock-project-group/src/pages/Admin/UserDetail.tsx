/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Descriptions, Spin, Tag, message, Empty } from 'antd';
import axios from 'axios';
import { useParams } from 'react-router-dom';

type AnyObj = Record<string, any>;

const USERS_API =
  import.meta.env.VITE_API_USERS_URL ||
  (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL}/users` : '');

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('vi-VN');
};

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!id) {
          if (mounted) setUser(null);
          return;
        }

        if (!USERS_API) {
          // demo user nếu chưa cấu hình API
          const demoUser = {
            id,
            firstName: 'Hà',
            lastName: 'Phương',
            email: 'phuong@example.com',
            phoneNumber: '0123456789',
            address: 'Thanh Hóa, Việt Nam',
            role: Math.random() > 0.5 ? 'admin' : 'user',
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            updatedAt: new Date().toISOString(),
          };
          if (mounted) setUser(demoUser);
          return;
        }

        const base = USERS_API.replace(/\/$/, '');
        const res = await axios.get(`${base}/${encodeURIComponent(String(id))}`);
        if (mounted) setUser(res.data ?? null);
      } catch (err) {
        console.error('Failed to load user detail:', err);
        if (mounted) {
          setUser(null);
          message.error('Không thể tải thông tin người dùng');
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

  const normalized = useMemo(() => {
    const u: AnyObj = user || {};
    const uid = u.id ?? u._id ?? id ?? 'unknown';
    const fullName =
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() ||
      u.name ||
      `Người dùng #${uid}`;
    const roleRaw = (u.role ?? '').toString().toLowerCase();
    const role =
      roleRaw === 'admin'
        ? 'Admin'
        : roleRaw === 'user'
        ? 'Người dùng'
        : u.role ?? '-';

    return {
      uid,
      fullName,
      email: u.email ?? '-',
      phoneNumber: u.phoneNumber ?? '-',
      address: u.address ?? '-',
      role,
      createdAt: u.createdAt ?? null,
      updatedAt: u.updatedAt ?? null,
      raw: u,
    };
  }, [user, id]);

  if (loading) return <div className="p-6"><Spin /></div>;
  if (!user)
    return (
      <div className="p-6">
        <Card>
          <Empty description="Không tìm thấy người dùng" />
        </Card>
      </div>
    );

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Người dùng #{normalized.uid} — {normalized.fullName}
      </h2>

      <Card title="Thông tin người dùng" className="mb-4">
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Họ và tên">{normalized.fullName}</Descriptions.Item>
          <Descriptions.Item label="Email">{normalized.email}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{normalized.phoneNumber}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{normalized.address}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">
            {normalized.role === 'Admin' && <Tag color="red">Admin</Tag>}
            {normalized.role === 'Người dùng' && <Tag color="blue">Người dùng</Tag>}
            {normalized.role !== 'Admin' && normalized.role !== 'Người dùng' && <Tag>{normalized.role}</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">{formatDate(normalized.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Cập nhật gần nhất">{formatDate(normalized.updatedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Raw user metadata">
        <div style={{ maxHeight: 400, overflow: 'auto', fontSize: 13 }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(normalized.raw, null, 2)}
          </pre>
        </div>
      </Card>
    </div>
  );
};

export default UserDetail;
