import React, { useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { Layout, Menu, Button, Avatar, theme } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import {
  MdDashboard,
  MdPeople,
  MdAnalytics,
  MdHistory,
  MdLogout,
  MdSettings,
} from "react-icons/md";
import { useAuth } from "../contexts/AuthContext";

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 🌟 Menu phù hợp cho hệ thống Emotion Recognition
  const menuItems = [
    {
      key: "dashboard",
      icon: <MdDashboard size={20} />,
      label: "Dashboard",
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "users",
      icon: <MdPeople size={20} />,
      label: "User Management",
      onClick: () => navigate("/admin/users"),
    },
    {
      key: "analytics",
      icon: <MdAnalytics size={20} />,
      label: "Emotion Analytics",
      onClick: () => navigate("/admin/analytics"),
    },
    {
      key: "records",
      icon: <MdHistory size={20} />,
      label: "Recognition Records",
      onClick: () => navigate("/admin/records"),
    },
    {
      key: "settings",
      icon: <MdSettings size={20} />,
      label: "System Settings",
      onClick: () => navigate("/admin/settings"),
    },
  ];

  return (
    <Layout className="h-screen">
      {/* --- Sidebar --- */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        className="flex! flex-col! h-full!"
      >
        <div className="flex h-screen flex-col justify-between border-e border-gray-100">
          {/* Logo */}
          <div className="px-4 pb-6">
            <div className="text-white text-lg font-bold text-center py-4 border-b border-gray-700">
              <Link to="/" className="text-white!">
                {!collapsed ? "Emotion System" : "ERS"}
              </Link>
            </div>

            {/* Menu */}
            <div className="flex-1! overflow-auto!">
              <Menu
                theme="dark"
                mode="inline"
                items={menuItems}
                className="flex flex-col items-center justify-center gap-4"
              />
            </div>
          </div>

          {/* Footer (User info + Logout) */}
          <div className="sticky inset-x-0 bottom-0 border-t border-gray-100">
            <div>
              <div className="p-4 flex items-center gap-3">
                <Avatar size={40} className="bg-[#1677ff]">
                  {user?.firstName?.charAt(0).toUpperCase() || "U"}
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col text-white text-sm gap-1">
                    <span className="font-semibold">
                      {user?.lastName} {user?.firstName}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {user?.email}
                    </span>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="flex items-center justify-center pb-4">
                  <Button
                    type="link"
                    icon={<MdLogout />}
                    className="bg-white! text-black! hover:bg-black! hover:text-white! border-none"
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                  >
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Sider>

      {/* --- Main Layout --- */}
      <Layout>
        <Header
          className="px-4 flex items-center"
          style={{ background: colorBgContainer }}
        >
          <Button
            type="text"
            icon={
              collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
            }
            onClick={() => setCollapsed(!collapsed)}
            className="w-12 h-12 text-base"
          />
          <h2 className="ml-4 text-lg font-semibold text-gray-700">
            Emotion Recognition Admin
          </h2>
        </Header>

        <Content className="p-4 bg-[#f5f5f5] grow overflow-y-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;