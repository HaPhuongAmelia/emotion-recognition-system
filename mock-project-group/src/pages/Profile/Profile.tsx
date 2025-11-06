// Profile.tsx
import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import Header from '../../components/header';
import Footer from '../../components/footer';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginModal } from '../../contexts/LoginModalContext';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { openLogin } = useLoginModal();
  const navigate = useNavigate();

  const handleLoginPrompt = () => {
    openLogin('login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: profile card + quick actions */}
          <aside className="col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center text-2xl font-semibold text-indigo-700">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-800">{user?.name || 'Khách'}</div>
                  <div className="text-sm text-gray-500">{user?.email || 'Chưa đăng nhập'}</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {!user ? (
                  <button
                    onClick={handleLoginPrompt}
                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Đăng nhập / Đăng ký
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/profile/my-profile')}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-800 rounded-lg"
                    >
                      Chỉnh sửa thông tin
                    </button>
                    <button
                      onClick={() => navigate('/profile/my-history')}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-800 rounded-lg"
                    >
                      Xem lịch sử phiên
                    </button>
                    <button
                      onClick={() => navigate('/profile/my-notification')}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-800 rounded-lg"
                    >
                      Thông báo
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tóm tắt nhanh</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Số phiên gần đây</span>
                  <span className="font-semibold">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tổng phát hiện (cache)</span>
                  <span className="font-semibold">—</span>
                </div>
                <div className="text-xs text-gray-400">Dữ liệu demo — kết nối backend để hiển thị số liệu thật.</div>
              </div>
            </div>
          </aside>

          {/* Right: main content area (Outlet) */}
          <section className="col-span-1 lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Quản lý tài khoản</h2>
                  <p className="text-sm text-gray-500">Quản lý thông tin cá nhân, lịch sử giám sát và thông báo.</p>
                </div>

                <nav className="flex items-center gap-2">
                  <Link
                    to="/profile/my-profile"
                    className="text-sm px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Hồ sơ
                  </Link>
                  <Link
                    to="/profile/my-history"
                    className="text-sm px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Lịch sử
                  </Link>
                  <Link
                    to="/profile/my-notification"
                    className="text-sm px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Thông báo
                  </Link>
                </nav>
              </div>

              {/* Outlet sẽ render các trang con (MyProfile, MyHistory, MyNotification) */}
              <div className="mt-4">
                <Outlet />
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
