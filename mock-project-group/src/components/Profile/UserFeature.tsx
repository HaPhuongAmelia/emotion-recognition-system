import React from "react";
import avatarProfile from "../../assets/avatar-profile.svg";
import { useAuth } from "../../contexts/AuthContext";
import { FaUser, FaHistory, FaCog, FaSignOutAlt } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";

const UserFeature: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split("/").pop();

  const features = [
    {
      key: "my-profile",
      label: "Thông tin tài khoản",
      icon: <FaUser />,
      path: "/profile/my-profile",
    },
    {
      key: "emotion-history",
      label: "Lịch sử nhận diện cảm xúc",
      icon: <FaHistory />,
      path: "/profile/emotion-history",
    },
    {
      key: "my-settings",
      label: "Cài đặt tài khoản",
      icon: <FaCog />,
      path: "/profile/my-settings",
    },
  ];

  return (
    <div className="flex flex-col space-y-3 mt-4">
      {/* User Info */}
      <div className="flex sm:flex-row md:flex-col lg:flex-row items-center p-3 bg-white rounded-lg shadow">
        <div className="w-16 h-16 flex items-center justify-center">
          <img
            src={avatarProfile}
            alt="AvatarProfile"
            className="w-12 h-12 rounded-full"
          />
        </div>
        <div className="ml-0 lg:ml-4 mt-2 lg:mt-0">
          <p className="text-sm text-gray-500">Tài khoản của</p>
          <h1 className="text-lg font-semibold text-gray-800">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {features.map((feature) => (
          <Link
            key={feature.key}
            to={feature.path}
            className={`flex items-center px-4 py-3 hover:bg-gray-50 transition-colors ${
              currentPath === feature.key ? "text-blue-600 font-semibold" : "text-gray-700"
            }`}
          >
            <div className="w-8 h-8 flex items-center justify-center text-lg">
              {feature.icon}
            </div>
            <span className="ml-3 text-sm">{feature.label}</span>
          </Link>
        ))}

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="flex items-center w-full px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 flex items-center justify-center text-lg">
            <FaSignOutAlt />
          </div>
          <span className="ml-3 text-sm">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default UserFeature;
