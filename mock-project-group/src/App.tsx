import { Routes, Route } from 'react-router-dom'
import './App.css'

// ==== User Pages ====
import Home from './pages/Home'
import Monitor from './pages/Monitor'                // Trang theo dõi cảm xúc (real-time)
import History from './pages/History'                // Lịch sử nhận diện
import Profile from './pages/Profile/Profile'

// ==== Layouts ====
import UserLayout from './layouts/UserLayout'
import AdminLayout from './layouts/AdminLayout'
import ProfileLayout from './layouts/ProfileLayout'

// ==== Admin Pages ====
import Dashboard from './pages/Admin/Dashboard'
import DetectionManager from './pages/Admin/DetectionManager' // Quản lý kết quả nhận diện
import ModelManager from './pages/Admin/ModelManager'         // Quản lý model AI
import UserManager from './pages/Admin/UserManager'           // Quản lý người dùng
import AdminDetectionDetail from './pages/Admin/DetectionDetail'
import AdminModelDetail from './pages/Admin/ModelDetail'
import AdminUserDetail from './pages/Admin/UserDetail'

// ==== Hệ thống / Auth ====
import NotFound from './pages/404'
import { AuthProvider } from './contexts/AuthContext'
import { LoginModalProvider } from './contexts/LoginModalContext'
import PrivateRoute from './contexts/PrivateRoute'

// ==== Profile Subpages ====
import MyProfile from './pages/Profile/MyProfile'
import MyHistory from './pages/Profile/MyHistory'
import MyNotification from './pages/Profile/MyNotification'
import DetectionDetails from './pages/Profile/DetectionDetails'

// ==== Context riêng cho dự án này ====
import { DetectionProvider } from './contexts/DetectionContext'

function App() {
  return (
    <AuthProvider>
      <LoginModalProvider>
        <DetectionProvider>
          <Routes>
            {/* ==== Layout người dùng ==== */}
            <Route path="/" element={<UserLayout />}>
              <Route index element={<Home />} />
              <Route path="monitor" element={<Monitor />} />
              <Route path="history" element={<History />} />

              <Route path="/profile" element={<ProfileLayout />}>
                <Route index element={<Profile />} />
                <Route path="my-profile" element={<MyProfile />} />
                <Route path="my-history" element={<MyHistory />} />
                <Route path="my-notification" element={<MyNotification />} />
                <Route path="my-history/:id" element={<DetectionDetails />} />
              </Route>
            </Route>

            {/* ==== Layout admin ==== */}
            <Route
              path="/admin"
              element={
                <PrivateRoute adminOnly>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="detection-manager" element={<DetectionManager />} />
              <Route path="model-manager" element={<ModelManager />} />
              <Route path="user-manager" element={<UserManager />} />
              <Route path="detections/:id" element={<AdminDetectionDetail />} />
              <Route path="models/:id" element={<AdminModelDetail />} />
              <Route path="users/:id" element={<AdminUserDetail />} />
            </Route>

            {/* ==== 404 ==== */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DetectionProvider>
      </LoginModalProvider>
    </AuthProvider>
  )
}

export default App
