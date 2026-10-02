import { Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/authSlice";

export default function HomeRedirect() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;

  if (user.level === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-white font-medium">
            Your account has no level assigned. Please contact the admin.
          </p>
          <button
            onClick={() => dispatch(logout())}
            className="mt-6 rounded-lg border border-gray-700 px-4 py-2 text-white transition-colors hover:bg-slate-400"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return <Navigate to={`/dashboard/${user.level}`} replace />;
}
