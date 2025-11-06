/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Descriptions, Spin, Tag } from 'antd';
import axios from 'axios';
import { useParams } from 'react-router-dom';

type AnyObj = Record<string, any>;

const UserDetail: React.FC = () => {
  const { id } = useParams();
  const [user, setUser] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const base = (import.meta.env.VITE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const res = await axios.get(`${base}/users/${encodeURIComponent(String(id))}`);
        if (mounted) setUser(res.data);
      } catch (e) {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  const normalized = useMemo(() => {
    const u: AnyObj = user || {};
    const uid = u?.id ?? id;
    const roleRaw = (u?.role ?? '').toString().toLowerCase();
    const role = roleRaw === 'admin' ? 'Admin' : roleRaw === 'user' ? 'Người dùng' : (u?.role ?? '-');
    const fullName = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || u?.name || `UserID: ${uid}`;
    return {
      uid,
      fullName,
      email: u?.email ?? '-',
      phoneNumber: u?.phoneNumber ?? '-',
      address: u?.address ?? '-',
      role,
      createdAt: u?.createdAt ?? null,
      updatedAt: u?.updatedAt ?? null,
    };
  }, [user, id]);

  if (loading) return <div className="p-6"><Spin /></div>;
  if (!user) return <div className="p-6">Không tìm thấy người dùng</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Người dùng #{normalized.uid}</h2>
      </div>

      <Card title="Thông tin người dùng">
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Họ và tên">{normalized.fullName}</Descriptions.Item>
          <Descriptions.Item label="Email">{normalized.email}</Descriptions.Item>
          <Descriptions.Item label="SĐT">{normalized.phoneNumber}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{normalized.address}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">{normalized.role}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">{normalized.createdAt ? new Date(normalized.createdAt).toLocaleString('vi-VN') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Cập nhật">{normalized.updatedAt ? new Date(normalized.updatedAt).toLocaleString('vi-VN') : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default UserDetail;
