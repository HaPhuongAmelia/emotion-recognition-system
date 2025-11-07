// Login.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Card, Form, Input, Button, Checkbox, Typography, Divider, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const { Title, Text } = Typography;

type LoginFormValues = {
  email: string;
  password: string;
  remember?: boolean;
};

const AUTH_API =
  import.meta.env.VITE_API_AUTH_URL ??
  (import.meta.env.VITE_BASE_URL ? `${import.meta.env.VITE_BASE_URL.replace(/\/$/, "")}/auth` : "");

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user came from a protected route, it might set location.state.from
  const from = (location.state as any)?.from ?? null;

  const handleFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      // Demo mode if no auth API configured
      if (!AUTH_API) {
        await new Promise((r) => setTimeout(r, 700));
        const demoUser = {
          id: "demo-1",
          email: values.email,
          firstName: "Demo",
          lastName: "User",
          role: values.email === "admin@demo" ? "admin" : "user",
        };
        // fake token (only for demo)
        const fakeToken = btoa(
          JSON.stringify({
            sub: demoUser.id,
            email: demoUser.email,
            role: demoUser.role,
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
          })
        );
        const fakeRefresh = btoa("refresh-" + Date.now());
        auth.login({ user: demoUser, token: fakeToken, refreshToken: fakeRefresh });
        message.success("Đăng nhập thành công (demo)");
        if (demoUser.role === "admin") navigate("/admin");
        else navigate((from as string) || "/profile");
        return;
      }

      // Real API: POST {AUTH_API}/login
      const endpoint = `${AUTH_API.replace(/\/$/, "")}/login`;
      const payload = { email: values.email.trim(), password: values.password };
      const res = await axios.post(endpoint, payload, { headers: { "Content-Type": "application/json" } });

      const data = res.data ?? {};
      // Support various response shapes
      const token = data.token ?? data.accessToken ?? data.access_token ?? null;
      const refreshToken = data.refreshToken ?? data.refresh ?? null;
      const user = data.user ?? data.profile ?? data.data?.user ?? undefined;

      if (!token) {
        // Some APIs might return token in nested object
        message.error("Máy chủ chưa trả access token — không thể đăng nhập");
        setLoading(false);
        return;
      }

      // Call auth.login with the standardized payload
      auth.login({ user: user ?? undefined, token, refreshToken: refreshToken ?? undefined });

      message.success("Đăng nhập thành công");
      // If user object contains role=admin, redirect to admin dashboard
      const role = (user?.role ?? undefined) as any;
      if (role && (role === "admin" || (Array.isArray(role) && role.includes("admin")))) {
        navigate("/admin");
      } else {
        navigate((from as string) || "/profile");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      const msg = err?.response?.data?.message || err?.message || "Đăng nhập thất bại";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6">
      <Card style={{ width: 480, borderRadius: 12, boxShadow: "0 6px 24px rgba(15,23,42,0.08)" }}>
        <div className="text-center mb-4">
          <Title level={3} style={{ marginBottom: 0 }}>
            Đăng nhập — Emotion Recognition System
          </Title>
          <Text type="secondary">Đăng nhập để xem lịch sử, phiên và báo cáo cảm xúc</Text>
        </div>

        <Form name="login" layout="vertical" onFinish={handleFinish} initialValues={{ remember: true }}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>

          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Ghi nhớ đăng nhập</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>

          <div className="flex items-center justify-between">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
            <div>
              <Text type="secondary">Chưa có tài khoản?</Text>{" "}
              <Link to="/register">Đăng ký</Link>
            </div>
          </div>
        </Form>

        <Divider>Hoặc</Divider>

        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => {
              const demoUser = { id: "demo-admin", email: "admin@demo", firstName: "Admin", role: "admin" };
              const fakeToken = btoa(
                JSON.stringify({
                  sub: demoUser.id,
                  email: demoUser.email,
                  role: demoUser.role,
                  exp: Math.floor(Date.now() / 1000) + 3600,
                })
              );
              auth.login({ user: demoUser, token: fakeToken, refreshToken: btoa("refresh-demo") });
              message.success("Đăng nhập dưới dạng demo admin");
              navigate("/admin");
            }}
          >
            Demo Admin
          </Button>

          <Button
            onClick={() => {
              const demoUser = { id: "demo-user", email: "user@demo", firstName: "User", role: "user" };
              const fakeToken = btoa(
                JSON.stringify({
                  sub: demoUser.id,
                  email: demoUser.email,
                  role: demoUser.role,
                  exp: Math.floor(Date.now() / 1000) + 3600,
                })
              );
              auth.login({ user: demoUser, token: fakeToken, refreshToken: btoa("refresh-demo") });
              message.success("Đăng nhập dưới dạng demo user");
              navigate("/profile");
            }}
          >
            Demo User
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
