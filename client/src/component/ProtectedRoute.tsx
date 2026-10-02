import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "../types";
import { useAppSelector } from "../store/hooks";

type ProtectedRouteProps = {
  roles?: Role[];
};

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const user = useAppSelector((s) => s.auth.user);

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
