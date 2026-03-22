import { useState, useEffect } from "react";

const COMPLIANCE_URL = import.meta.env.VITE_API_GATEWAY_URL;

const CHANNEL_OPTIONS = [
  {
    value: "email",
    icon: "✉",
    label: "Email",
    hint: "Delivers a real SMTP email via Gmail to the recipient address.",
    color: "sky",
  },
  {
    value: "sms",
    icon: "📱",
    label: "SMS",
    hint: "Records the notification — SMS gateway not currently wired.",
    color: "amber",
  },
  {
    value: "in-app",
    icon: "🔔",
    label: "In-App",
    hint: "Saves to the notifications table for in-app display.",
    color: "violet",
  },
];

const CHANNEL_COLORS = {
  sky: {
    active: "border-sky-500/50 bg-sky-500/10 text-sky-300",
    icon: "bg-sky-500/10 border-sky-500/20 text-sky-400",
  },
  amber: {
    active: "border-amber-500/50 bg-amber-500/10 text-amber-300",
    icon: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  },
  violet: {
    active: "border-violet-500/50 bg-violet-500/10 text-violet-300",
    icon: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  },
};

const DEFAULT_MESSAGES = {
  email:
    "Your order has been confirmed! 🎉\n\nThank you for your purchase on Exotic Pet Marketplace. Your order will be processed and shipped within 3–5 business days.\n\nIf you have any questions, please contact our support team.",
  sms: "Your order has been confirmed. We'll keep you updated on shipping progress.",
  "in-app": "Your order has been confirmed and is now being processed.",
};

export default function AdminNotifySection() {
  const token = localStorage.getItem("jwt");

  const [form, setForm] = useState({
    orderId: "",
    channel: "email",
    recipient: "",
    message: DEFAULT_MESSAGES["email"],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [errorAll, setErrorAll] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleChannelChange = (ch) =>
    setForm((prev) => ({
      ...prev,
      channel: ch,
      message:
        prev.message === DEFAULT_MESSAGES[prev.channel]
          ? DEFAULT_MESSAGES[ch]
          : prev.message,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${COMPLIANCE_URL}/notify/order-confirmed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.details || data.error || "Request failed");
      setResult(data);
      setHistory((prev) => [
        {
          id: `${form.orderId}-${Date.now()}`,
          orderId: form.orderId,
          channel: form.channel,
          recipient: form.recipient,
          emailSent: data.emailSent,
          sentAt: new Date(),
        },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  const fetchAllNotifications = async (page = 1) => {
    setLoadingAll(true);
    setErrorAll("");
    try {
      const res = await fetch(
        `${COMPLIANCE_URL}/notify/all?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.details || data.error || "Failed to fetch");
      setAllNotifications(data.notifications);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setErrorAll(err.message);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    fetchAllNotifications(1);
  }, []);

  const handleDeleteNotification = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${COMPLIANCE_URL}/notify/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to delete");
      setAllNotifications((prev) => prev.filter((n) => n.id !== id));
      setPagination((prev) => ({
        ...prev,
        total: prev.total - 1,
        pages: Math.ceil((prev.total - 1) / prev.limit),
      }));
      setConfirmDelete(null);
    } catch (err) {
      setErrorAll(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const activeChannel = CHANNEL_OPTIONS.find((c) => c.value === form.channel);
  const charCount = form.message.length;

  return (
    <>
      {/*  Header  */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1">
            Compliance Service
          </p>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">
            Send Notification
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Confirm an order and dispatch a message to the buyer via their
            preferred channel.
          </p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="mt-1 px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all"
          >
            New Notification
          </button>
        )}
      </div>

      {/*  Main grid  */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6 mb-6">
        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.07] bg-[#0a1628] p-6 space-y-5"
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-base">
              ↗
            </span>
            <h2 className="text-base font-bold text-slate-100 font-serif">
              Notification Details
            </h2>
          </div>

          {/* Order ID */}
          <div>
            <label className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
              Order ID
            </label>
            <input
              type="text"
              name="orderId"
              value={form.orderId}
              onChange={handleChange}
              required
              placeholder="e.g. ord-1234"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/[0.02] transition-all"
            />
            <p className="mt-1 text-[0.65rem] text-slate-700">
              The order this notification is tied to.
            </p>
          </div>

          {/* Channel selector */}
          <div>
            <label
              id="delivery-channel-label"
              className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-2"
            >
              Delivery Channel
            </label>
            <div
              role="group"
              aria-labelledby="delivery-channel-label"
              className="grid grid-cols-3 gap-2"
            >
              {CHANNEL_OPTIONS.map((ch) => {
                const colors = CHANNEL_COLORS[ch.color];
                const active = form.channel === ch.value;
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => handleChannelChange(ch.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                      active
                        ? colors.active
                        : "border-white/[0.08] bg-white/[0.02] text-slate-500 hover:border-white/15 hover:text-slate-400"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-lg border text-sm ${active ? colors.icon : "bg-white/[0.03] border-white/[0.07] text-slate-600"}`}
                    >
                      {ch.icon}
                    </span>
                    {ch.label}
                  </button>
                );
              })}
            </div>
            {activeChannel && (
              <p className="text-[0.65rem] text-slate-700 mt-1.5">
                {activeChannel.hint}
              </p>
            )}
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
              Recipient
            </label>
            <input
              type={form.channel === "email" ? "email" : "text"}
              name="recipient"
              value={form.recipient}
              onChange={handleChange}
              required
              placeholder={
                form.channel === "email"
                  ? "buyer@example.com"
                  : "Recipient identifier"
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/[0.02] transition-all"
            />
            <p className="mt-1 text-[0.65rem] text-slate-700">
              {form.channel === "email"
                ? "The buyer's email address for SMTP delivery."
                : "User ID or handle for the notification target."}
            </p>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label
                htmlFor="message"
                className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600"
              >
                Message
              </label>
              <span
                className={`text-[0.65rem] font-mono ${charCount > 500 ? "text-amber-500" : "text-slate-700"}`}
              >
                {charCount} chars
              </span>
            </div>
            <textarea
              id="message"
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/[0.02] transition-all resize-none leading-relaxed"
            />
            <p className="mt-1 text-[0.65rem] text-slate-700">
              Plain text body sent to the recipient.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-sm">
              <span className="text-base mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-700 hover:bg-violet-600 active:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(139,92,246,0.15)]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <span className="text-base leading-none">↗</span>
                Send Notification
              </>
            )}
          </button>
        </form>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Result */}
          {result ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-6 space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="text-xl font-extrabold font-serif text-emerald-300 leading-tight">
                    Notification Sent
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Delivered via{" "}
                    <span className="text-slate-200 font-semibold capitalize">
                      {result.channel}
                    </span>
                  </p>
                </div>
              </div>

              {/* Email delivery status */}
              {result.channel === "email" && (
                <div
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
                    result.emailSent
                      ? "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300"
                      : "border-amber-500/25 bg-amber-500/[0.05] text-amber-300"
                  }`}
                >
                  <span>{result.emailSent ? "✉" : "⚠"}</span>
                  <span className="text-xs font-medium">
                    {result.emailSent
                      ? "Email delivered via SMTP successfully."
                      : "SMTP delivery failed — notification saved to DB. Check mailer config."}
                  </span>
                </div>
              )}

              {/* Detail rows */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
                <ResultRow
                  label="Notification ID"
                  value={result.notification?.id}
                  mono
                />
                <ResultRow
                  label="Order ID"
                  value={result.notification?.order_id}
                  mono
                />
                <ResultRow
                  label="Recipient"
                  value={result.notification?.recipient}
                />
                <ResultRow
                  label="Channel"
                  value={result.notification?.channel}
                />
                <ResultRow
                  label="Created"
                  value={
                    result.notification?.created_at
                      ? new Date(
                          result.notification.created_at,
                        ).toLocaleString()
                      : "—"
                  }
                />
              </div>

              <p className="text-[0.65rem] text-slate-700 text-center">
                This notification has been recorded in the database.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.05] bg-[#0a1628] p-8 flex flex-col items-center justify-center flex-1 min-h-[300px] text-center gap-3">
              <span className="text-5xl opacity-[0.12]">🔔</span>
              <p className="text-slate-600 text-sm font-medium">
                No result yet
              </p>
              <p className="text-slate-700 text-xs max-w-[200px] leading-relaxed">
                Fill in the form and send a notification to see the delivery
                result here.
              </p>
            </div>
          )}

          {/* Session history */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a1628] p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-700 mb-3">
                Session History
              </p>
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs ${Boolean(h.emailSent) ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {Boolean(h.emailSent) ? "✓" : "⚠"}
                      </span>
                      <span className="text-slate-400 text-[0.65rem] font-mono shrink-0 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md">
                        {h.channel}
                      </span>
                      <span className="text-slate-300 text-xs truncate">
                        {h.recipient}
                      </span>
                    </div>
                    <span className="text-slate-700 text-[0.65rem] shrink-0">
                      {h.sentAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/*  All Notifications Section  */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a1628] p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-serif">
              📋 All Notifications
            </h2>
            <p className="text-slate-600 text-xs mt-1">
              Browse all notifications sent via the system
            </p>
          </div>
          <button
            onClick={() => fetchAllNotifications(1)}
            disabled={loadingAll}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-violet-700/20 border border-violet-500/30 text-violet-300 hover:bg-violet-700/30 disabled:opacity-50 transition-all"
          >
            {loadingAll ? "Loading…" : "Refresh"}
          </button>
        </div>

        {errorAll && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-sm mb-4">
            <span className="text-base mt-0.5">⚠</span>
            <span>{errorAll}</span>
          </div>
        )}

        {!loadingAll && allNotifications.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-600 text-sm">
              No notifications yet. Click "Refresh" to load notifications.
            </p>
          </div>
        )}

        {loadingAll && (
          <div className="text-center py-8">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          </div>
        )}

        {allNotifications.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      ID
                    </th>
                    <th className="text-left py-3 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      Channel
                    </th>
                    <th className="text-left py-3 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      Recipient
                    </th>
                    <th className="text-left py-3 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      Created
                    </th>
                    <th className="text-left py-3 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allNotifications.map((notif) => (
                    <tr
                      key={notif.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-400 font-mono text-xs">
                        {notif.id.substring(0, 8)}…
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {notif.order_id || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${
                            notif.channel === "email"
                              ? "bg-sky-500/20 text-sky-300"
                              : notif.channel === "sms"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-violet-500/20 text-violet-300"
                          }`}
                        >
                          {notif.channel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-xs truncate max-w-[200px]">
                        {notif.recipient}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs whitespace-nowrap">
                        {notif.created_at
                          ? new Date(notif.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setConfirmDelete(notif.id)}
                          disabled={deletingId === notif.id}
                          className="px-2.5 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                        >
                          {deletingId === notif.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-slate-600">
                Page {currentPage} of {pagination.pages} ({pagination.total}{" "}
                total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchAllNotifications(currentPage - 1)}
                  disabled={currentPage === 1 || loadingAll}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchAllNotifications(currentPage + 1)}
                  disabled={currentPage === pagination.pages || loadingAll}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl border border-red-500/30 bg-[#0a1628] p-6 max-w-sm">
            <h3 className="text-lg font-bold text-red-300 mb-2">Delete Notification?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to permanently delete this notification? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingId === confirmDelete}
                className="px-4 py-2 text-sm rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNotification(confirmDelete)}
                disabled={deletingId === confirmDelete}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold transition-all"
              >
                {deletingId === confirmDelete ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  Channel info cards  */}
      <div className="grid sm:grid-cols-3 gap-4">
        {CHANNEL_OPTIONS.map(({ value, icon, label, hint, color }) => {
          const colors = CHANNEL_COLORS[color];
          const active = form.channel === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleChannelChange(value)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                active
                  ? `${colors.active} shadow-[0_0_0_1px_inset]`
                  : "border-white/[0.06] bg-[#0a1628] hover:border-white/10"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border text-base mb-3 ${colors.icon}`}
              >
                {icon}
              </span>
              <p className="text-sm font-bold text-slate-200 mb-1">{label}</p>
              <p className="text-[0.65rem] text-slate-600 leading-relaxed">
                {hint}
              </p>
            </button>
          );
        })}
      </div>
    </>
  );
}

//  Result row helper
function ResultRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/[0.05]">
      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 shrink-0">
        {label}
      </span>
      <span
        className={`text-xs text-slate-300 text-right break-all ${mono ? "font-mono" : "font-medium"}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
