import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import AuthLayout from "../component/AuthLayout";
import TextField from "../component/TextField";
import PasswordField from "../component/PasswordField";
import SelectField from "../component/SelectField";
import Button from "../component/Button";
import Alert from "../component/Alert";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { api, errorMessage } from "../lib/api";
import { HOME_PATH, LEVELS } from "../lib/constants";
import { useAppSelector } from "../store/hooks";
import { useToast } from "../hooks/useToast";

export default function RegisterPage() {
  const user = useAppSelector((s) => s.auth.user);
  const showToast = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useTimedMessage(4000);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (user) return <Navigate to={HOME_PATH} replace />;

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!level) {
      setError("Please select your level");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await api<unknown>("/auth/register", {
        method: "POST",
        body: {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          level: Number(level),
        },
      });
      showToast("Registration complete. Your account is awaiting approval.");
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout
        title="You're registered"
        subtitle="One more step before you can log in."
        footer={
          <Link
            to="/login"
            className="font-medium text-white-400 hover:text-white-300"
          >
            Back to login
          </Link>
        }
      >
        <Alert variant="success">
          Registration successful. An admin needs to approve your account before
          you can log in.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register with your level. An admin will approve it."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-white hover:text-slate-300"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

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

        <SelectField
          label="Level"
          name="level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          required
        >
          <option value="">Select your level</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l} Level
            </option>
          ))}
        </SelectField>

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <PasswordField
          label="Confirm password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <Button type="submit" loading={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
