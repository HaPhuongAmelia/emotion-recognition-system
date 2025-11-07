import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Card, Layout, Avatar, Typography, Space, Button, Divider, Menu } from "antd";
import {
  UserOutlined,
  HistoryOutlined,
  BellOutlined,
  LoginOutlined,
  EditOutlined,
} from "@ant-design/icons";

import Header from "../../components/header";
import Footer from "../../components/footer";
import { useAuth } from "../../contexts/AuthContext";
import { useLoginModal } from "../../contexts/LoginModalContext";

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { openLogin } = useLoginModal();
  const navigate = useNavigate();

  const handleLoginPrompt = () => {
    openLogin("login");
  };

  const menuItems = [
    {
      key: "profile",
      label: "Hồ sơ",
      icon: <UserOutlined />,
      onClick: () => navigate("/profile/my-profile"),
    },
    {
      key: "history",
      label: "Lịch sử",
      icon: <HistoryOutlined />,
      onClick: () => navigate("/profile/my-history"),
    },
    {
      key: "notifications",
      label: "Thông báo",
      icon: <BellOutlined />,
      onClick: () => navigate("/profile/my-notification"),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <Header
        simulateBackend={false}
        onToggleSimulate={() => {}}
        onReset={() => {}}
      />

      <Content style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        <Layout hasSider style={{ background: "transparent" }}>
          {/* Sidebar */}
          <Sider
            width={280}
            theme="light"
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              marginRight: 24,
              padding: "16px",
              height: "fit-content",
            }}
          >
            <Space align="center" size="middle" style={{ width: "100%" }}>
              <Avatar
                size={64}
                style={{
                  backgroundColor: "#6366F1",
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar>
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {user?.name || "Khách"}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {user?.email || "Chưa đăng nhập"}
                </Text>
              </div>
            </Space>

            <Divider style={{ margin: "16px 0" }} />

            {!user ? (
              <Button
                type="primary"
                block
                icon={<LoginOutlined />}
                onClick={handleLoginPrompt}
              >
                Đăng nhập / Đăng ký
              </Button>
            ) : (
              <>
                <Menu
                  mode="inline"
                  items={menuItems}
                  style={{
                    border: "none",
                    background: "transparent",
                    marginTop: 8,
                  }}
                />
              </>
            )}

            <Divider style={{ margin: "16px 0" }} />

            <Card
              size="small"
              title={<Text strong>Tóm tắt nhanh</Text>}
              bordered={false}
              style={{
                background: "#fafafa",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Số phiên gần đây</Text>
                <Text strong>—</Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Tổng phát hiện (cache)</Text>
                <Text strong>—</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Dữ liệu demo — cần backend thật để hiển thị.
              </Text>
            </Card>
          </Sider>

          {/* Main content */}
          <Content>
            <Card
              style={{
                borderRadius: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <Title level={4} style={{ marginBottom: 0 }}>
                    Quản lý tài khoản
                  </Title>
                  <Text type="secondary">
                    Quản lý thông tin cá nhân, lịch sử giám sát và thông báo.
                  </Text>
                </div>

                <Space>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => navigate("/profile/my-profile")}
                  >
                    Hồ sơ
                  </Button>
                  <Button
                    type="text"
                    icon={<HistoryOutlined />}
                    onClick={() => navigate("/profile/my-history")}
                  >
                    Lịch sử
                  </Button>
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    onClick={() => navigate("/profile/my-notification")}
                  >
                    Thông báo
                  </Button>
                </Space>
              </div>

              <Outlet />
            </Card>
          </Content>
        </Layout>
      </Content>

      <Footer />
    </Layout>
  );
};

export default Profile;
