import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import AuthLayout from "../component/AuthLayout";
import TextField from "../component/TextField";
import PasswordField from "../component/PasswordField";
import Button from "../component/Button";
import Alert from "../component/Alert";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { errorMessage } from "../lib/api";
import { HOME_PATH } from "../lib/constants";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { login } from "../store/authSlice";
import { useToast } from "../hooks/useToast";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const showToast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useTimedMessage(4000);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={HOME_PATH} replace />;

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
      showToast("You're signed in. Welcome back.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your level's materials."
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-white hover:text-slate-300"
          >
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="-mt-2 text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-blue-300 hover:text-white"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={loading}>
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
