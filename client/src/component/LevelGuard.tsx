import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

export default function LevelGuard() {
  const { level } = useParams();
  const user = useAppSelector((s) => s.auth.user);

  if (!user || user.level === undefined) return <Navigate to="/" replace />;

  if (Number(level) !== user.level) {
    return <Navigate to={`/dashboard/${user.level}`} replace />;
  }

  return <Outlet />;
}
