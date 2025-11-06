import { Outlet, useLocation, useParams } from "react-router-dom"
import Header from "../components/header"
import UserFeature from "../components/Profile/UserFeature"
import Footer from "../components/footer"
import { Breadcrumb } from "antd"


const ProfileLayout = () => {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);
    const { id } = useParams<{ id: string }>();

    // Dynamic breadcrumb items based on the route
    const breadcrumbItems = [
        { title: <a href="/">Trang chủ</a> },
        { title: <a href="/profile">Quản lý tài khoản</a> },
        ...(pathnames.length > 1
            ? [
                {
                    title: (() => {
                        switch (pathnames[pathnames.length - 1]) {
                            case "my-orders":
                                return <a href="/profile/my-orders">Quản lý đơn hàng</a>;
                            case "my-profile":
                                return "Thông tin tài khoản";
                            case "my-notification":
                                return "Thông báo của tôi";
                            default:
                                // For /my-orders/:id, use "Mã đơn hàng #id"
                                if (pathnames[pathnames.length - 2] === "my-orders" && id) {
                                    return `Mã đơn hàng #${id}`;
                                }
                                return pathnames[pathnames.length - 1];
                        }
                    })(),
                },
            ]
            : []),
    ];

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col">
            <Header />
            <div className="max-w-[1440px] mx-auto p-4">
                <Breadcrumb items={breadcrumbItems} className="text-sm text-gray-600 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    <div className="sm:block sm:col-span-1">
                        <UserFeature />
                    </div>
                    <div className="col-span-4 mt-6">
                        <Outlet />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default ProfileLayout