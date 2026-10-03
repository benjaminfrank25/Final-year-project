import { useState, type SyntheticEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import Alert from "../component/Alert";
import AuthLayout from "../component/AuthLayout";
import Button from "../component/Button";
import TextField from "../component/TextField";
import { api, errorMessage } from "../lib/api";
import { HOME_PATH } from "../lib/constants";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { useAppSelector } from "../store/hooks";

export default function ForgotPasswordPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [email, setEmail] = useState("");
  const [error, setError] = useTimedMessage(5000);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (user) return <Navigate to={HOME_PATH} replace />;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <Link
          to="/login"
          className="font-medium text-white hover:text-slate-300"
        >
          Back to login
        </Link>
      }
    >
      {sent ? (
        <Alert variant="success">
          If an account exists for that email, a password reset link has been
          sent. Check your inbox.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" loading={loading}>
            {loading ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
