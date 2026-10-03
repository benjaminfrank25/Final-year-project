import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { fetchMe } from "./store/authSlice";
import Spinner from "./component/Spinner";
import ProtectedRoute from "./component/ProtectedRoute";
import LevelGuard from "./component/LevelGuard";
import HomeRedirect from "./pages/HomeRedirect";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import RepDashboardPage from "./pages/RepDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

export default function App() {
  const dispatch = useAppDispatch();
  const initializing = useAppSelector((s) => s.auth.initializing);

  // On first load, ask the server if the cookie is still valid
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  if (initializing) {
    return (
      <div
        style={{ colorScheme: "light" }}
        className="flex min-h-screen items-center justify-center bg-white text-blue-600"
      >
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute roles={["student", "rep"]} />}>
        <Route path="/dashboard/:level" element={<LevelGuard />}>
          <Route index element={<StudentDashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["rep"]} />}>
        <Route path="/rep" element={<RepDashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
