import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme, Avatar } from "antd";
import {
    MdDashboard,
    MdPeople,
    MdBook,
    MdShoppingCart,
    MdCategory,
    MdLogout,
} from "react-icons/md";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();

    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const menuItems = [
        {
            key: "dashboard",
            icon: <MdDashboard size={20} />,
            label: "Dashboard",
            onClick: () => navigate("/admin/"),
        },
        {
            key: "users",
            icon: <MdPeople size={20} />,
            label: "Quản lý người dùng",
            onClick: () => navigate("/admin/user-manager"),
        },
        {
            key: "books",
            icon: <MdBook size={20} />,
            label: "Quản lý sách",
            onClick: () => navigate("/admin/book-manager"),
        },
        {
            key: "orders",
            icon: <MdShoppingCart size={20} />,
            label: "Quản lý đơn hàng",
            onClick: () => navigate("/admin/order-manager"),
        },
        {
            key: "categories",
            icon: <MdCategory size={20} />,
            label: "Quản lý danh mục",
            onClick: () => navigate("/admin/category-manager"),
        },
    ];

    return (
        <Layout className="h-screen">
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={250}
                className="!flex !flex-col !h-full"
            >
                <div className="flex h-screen flex-col justify-between border-e border-gray-100">
                    <div className="px-4 pb-6">
                        <div className="text-white text-lg font-bold text-center py-4 border-b border-gray-700">
                            <Link to="/" className="!text-white">{!collapsed ? "Admin Panel" : "Admin"}</Link>
                        </div>

                        <div className="!flex-1 !overflow-auto">
                            <Menu theme="dark" mode="inline" items={menuItems}
                                className="flex flex-col items-center justify-center gap-4"
                            />
                        </div>
                    </div>

                    <div className="sticky inset-x-0 bottom-0 border-t border-gray-100">
                        <div>
                            <div className="p-4 flex items-center gap-3">
                                <Avatar size={40} className="!bg-[#87d068]">
                                    {user?.firstName?.charAt(0).toUpperCase() || "A"}
                                </Avatar>
                                {!collapsed && (
                                    <div className="flex flex-col text-white text-sm gap-1">
                                        <span className="font-semibold">{user?.lastName} {user?.firstName}</span>
                                        <span className="text-gray-400 text-xs">{user?.email}</span>
                                    </div>
                                )}
                            </div>

                            {!collapsed && (
                                <div className="flex items-center justify-center pb-4">
                                    <Button
                                        type="link"
                                        icon={<MdLogout />}
                                        className="!bg-white !text-black hover:!bg-black hover:!text-white !border-none"
                                        onClick={() => {
                                            logout();
                                            navigate("/");
                                        }}
                                    >
                                        Đăng xuất
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Sider>

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
                        className="!w-[48px] !h-[48px] !text-base"
                    />
                </Header>

                <Content className="p-4 bg-[#f5f5f5] flex-grow overflow-y-auto">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;
