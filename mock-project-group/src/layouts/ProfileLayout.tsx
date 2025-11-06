// ProfileLayout.tsx
import React, { useMemo } from "react";
import { Outlet, useLocation, useParams, Link } from "react-router-dom";
import Header from "../components/header";
import UserFeature from "../components/Profile/UserFeature";
import Footer from "../components/footer";
import { Breadcrumb } from "antd";

const ProfileLayout: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const { id } = useParams<{ id: string }>();

  // Build breadcrumb items for ERS
  const breadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode }[] = [
      { title: <Link to="/">Home</Link> },
      { title: <Link to="/profile">User Dashboard</Link> },
    ];

    // If deeper path like /profile/emotion-history or /profile/my-profile...
    if (pathnames.length > 1) {
      const last = pathnames[pathnames.length - 1];

      // Friendly mapping for common ERS profile routes
      const label = (() => {
        if (last === "my-profile" || last === "profile") return "Profile Information";
        if (last === "emotion-history") return <Link to="/profile/emotion-history">Emotion History</Link>;
        if (last === "my-sessions") return <Link to="/profile/my-sessions">My Sessions</Link>;
        if (last === "my-reports" || last === "emotion-reports") return <Link to="/profile/my-reports">Emotion Reports</Link>;
        if (last === "my-settings") return "Account Settings";
        if (pathnames[pathnames.length - 2] === "emotion-history" && id) return `Session #${id}`;
        // fallback: humanize last path segment
        return last.replace(/-/g, " ");
      })();

      items.push({ title: label });
    }

    return items;
  }, [pathnames, id]);

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <Header simulateBackend={false} onToggleSimulate={function (): void {
              throw new Error("Function not implemented.");
          } } onReset={function (): void {
              throw new Error("Function not implemented.");
          } } />
      <div className="max-w-[1440px] mx-auto p-4 w-full">
        <Breadcrumb items={breadcrumbItems} className="text-sm text-gray-600 mb-4" />

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {/* Sidebar */}
          <aside className="sm:block sm:col-span-1">
            <UserFeature />
          </aside>

          {/* Main content */}
          <main className="col-span-4 mt-6 bg-white shadow-sm rounded-xl p-4">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProfileLayout;
