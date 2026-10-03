import { useState, type SyntheticEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Alert from "../component/Alert";
import AuthLayout from "../component/AuthLayout";
import Button from "../component/Button";
import PasswordField from "../component/PasswordField";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { api, errorMessage } from "../lib/api";
import { HOME_PATH } from "../lib/constants";
import { useAppSelector } from "../store/hooks";

export default function ResetPasswordPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useTimedMessage(5000);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (user) return <Navigate to={HOME_PATH} replace />;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Your password must be at least 8 characters."
      footer={
        <Link
          to="/login"
          className="font-medium text-white hover:text-slate-300"
        >
          Back to login
        </Link>
      }
    >
      {done ? (
        <div className="space-y-5">
          <Alert variant="success">
            Your password has been reset. You can now log in.
          </Alert>
          <Link
            to="/login"
            className="block rounded-lg bg-blue-600 px-4 py-2.5 text-center font-semibold text-white transition hover:bg-blue-500"
          >
            Go to login
          </Link>
        </div>
      ) : !token ? (
        <div className="space-y-5">
          <Alert>This password reset link is missing or invalid.</Alert>
          <Link
            to="/forgot-password"
            className="block rounded-lg bg-blue-600 px-4 py-2.5 text-center font-semibold text-white transition hover:bg-blue-500"
          >
            Request another reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <PasswordField
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Enter the password again"
            minLength={8}
            maxLength={72}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <Button type="submit" loading={loading}>
            {loading ? "Resetting password..." : "Reset password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
