import { Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/authSlice";

export default function WelcomePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm text-indigo-400">Logged in</p>
        <h1 className="mt-1 text-2xl font-bold">Hi, {user.fullName}</h1>

        <dl className="mt-6 space-y-2 text-sm text-slate-300">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd className="capitalize">{user.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Level</dt>
            <dd>{user.level ?? "n/a"}</dd>
          </div>
        </dl>

        <button
          onClick={() => dispatch(logout())}
          className="mt-8 w-full rounded-lg border border-gray-700 px-4 py-2.5 font-medium text-slate-200 transition hover:bg-gray-800"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
