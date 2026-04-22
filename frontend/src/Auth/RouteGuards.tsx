import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

const AuthLoading = () => null;

export const RequireAuthRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/enter" replace />;
  }

  return <Outlet />;
};

export const GuestOnlyRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};
