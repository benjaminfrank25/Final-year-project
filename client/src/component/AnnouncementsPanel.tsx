import { useState, type FormEvent } from "react";
import { Bell, CircleAlert, Megaphone, RefreshCw, Send } from "lucide-react";
import type { Announcement } from "../types";
import { formatDate } from "../lib/format";
import { inputClass, labelClass } from "../lib/ui";
import { useToast } from "../hooks/useToast";
import { errorMessage } from "../lib/api";
import Notice from "./Notice";
import Spinner from "./Spinner";
import { useTimedMessage } from "../hooks/useTimedMessage";

type AnnouncementsPanelProps = {
  announcements: Announcement[];
  loading: boolean;
  error: string;
  reload: () => void;
  mode: "admin" | "student";
  create?: (title: string, message: string) => Promise<Announcement>;
};

export default function AnnouncementsPanel({
  announcements,
  loading,
  error,
  reload,
  mode,
  create,
}: AnnouncementsPanelProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useTimedMessage(5000);
  const showToast = useToast();
  const isAdmin = mode === "admin";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!create) return;
    setBusy(true);
    try {
      await create(title.trim(), message.trim());
      setTitle("");
      setMessage("");
      setActionError("");
      showToast("Announcement sent to all active students.");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {isAdmin && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Megaphone size={20} className="text-blue-600" />
              Send an announcement
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              This will appear on every active student and course rep dashboard,
              across all levels.
            </p>
          </div>

          {actionError && (
            <div className="mb-4">
              <Notice>{actionError}</Notice>
            </div>
          )}

          <div className="space-y-4">
            <label className={labelClass}>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
                className={`${inputClass} mt-1.5`}
                placeholder="Announcement title"
              />
            </label>

            <label className={labelClass}>
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
                required
                rows={4}
                className={`${inputClass} mt-1.5 resize-y`}
                placeholder="Write a message for students..."
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Spinner size={16} /> : <Send size={16} />}
            Send to students
          </button>
        </form>
      )}

      <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Bell size={20} className="text-blue-600" />
          {isAdmin ? "Recent announcements" : "Announcements"}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-8 text-blue-600">
            <Spinner size={24} />
            <p className="text-sm">Loading announcements...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <CircleAlert size={28} className="text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <p className="rounded-xl bg-blue-50 p-5 text-sm text-blue-900/70">
            No announcements yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((announcement) => (
              <li
                key={announcement.id}
                className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    {announcement.level !== undefined && (
                      <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {announcement.level} Level
                      </span>
                    )}
                  </div>
                  <time
                    dateTime={announcement.createdAt}
                    className="shrink-0 text-xs text-gray-500"
                  >
                    {formatDate(announcement.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {announcement.message}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  Posted by {announcement.createdByName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
