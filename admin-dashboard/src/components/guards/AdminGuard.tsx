import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminGuard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const normalizedRole = user?.role?.toLowerCase().trim();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || (normalizedRole !== "admin" && normalizedRole !== "administrator")) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AdminGuard;
