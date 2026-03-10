import { useState } from "react";

const COMPLIANCE_URL = import.meta.env.VITE_API_GATEWAY_URL;

const CHANNEL_OPTIONS = [
  { value: "email",    label: "📧 Email",    hint: "Sends a real SMTP email to the recipient." },
  { value: "sms",      label: "📱 SMS",      hint: "Records the notification (SMS gateway not wired)." },
  { value: "in-app",   label: "🔔 In-App",   hint: "Saves notification for in-app display." },
];

export default function AdminNotifySection() {
  const token = localStorage.getItem("jwt");

  const [form, setForm] = useState({
    orderId:   "",
    channel:   "email",
    recipient: "",
    message:   "",
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

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
      if (!res.ok) throw new Error(data.details || data.error || "Request failed");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeChannel = CHANNEL_OPTIONS.find((c) => c.value === form.channel);

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-1">Compliance Service</p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">Send Notification</h1>
        <p className="text-slate-400 text-sm mt-1">
          Confirm an order and notify the buyer via their preferred channel.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur p-6 space-y-5"
        >
          <h2 className="text-lg font-bold text-slate-100 font-serif">Notification Details</h2>

          {/* Order ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Order ID
            </label>
            <input
              type="text"
              name="orderId"
              value={form.orderId}
              onChange={handleChange}
              required
              placeholder="e.g. ord-1234"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.12)] transition-all"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, channel: ch.value }))}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    form.channel === ch.value
                      ? "border-purple-500/60 bg-purple-500/15 text-purple-300"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            {activeChannel && (
              <p className="text-xs text-slate-600 mt-1.5">{activeChannel.hint}</p>
            )}
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Recipient
            </label>
            <input
              type={form.channel === "email" ? "email" : "text"}
              name="recipient"
              value={form.recipient}
              onChange={handleChange}
              required
              placeholder={form.channel === "email" ? "buyer@example.com" : "Recipient identifier"}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.12)] transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Message
            </label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Your order has been confirmed and will be shipped within 3–5 days."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.12)] transition-all resize-none"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sending…
              </span>
            ) : "Send Notification"}
          </button>
        </form>

        {/* Result */}
        <div>
          {result ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] backdrop-blur p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="text-xl font-extrabold font-serif text-emerald-300">Notification Sent</p>
                  <p className="text-slate-400 text-sm">Channel: <strong className="text-slate-200">{result.channel}</strong></p>
                </div>
              </div>

              {result.channel === "email" && (
                <div className={`px-4 py-3 rounded-xl border text-sm ${
                  result.emailSent
                    ? "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300"
                    : "border-amber-500/25 bg-amber-500/[0.05] text-amber-300"
                }`}>
                  {result.emailSent
                    ? "📧 Email delivered via SMTP"
                    : "⚠️ Email delivery failed (check SMTP config) — notification saved to DB."}
                </div>
              )}

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-2">
                <Row label="Notification ID" value={result.notification?.id} />
                <Row label="Order ID"        value={result.notification?.order_id} />
                <Row label="Recipient"       value={result.notification?.recipient} />
                <Row label="Channel"         value={result.notification?.channel} />
                <Row label="Created"         value={result.notification?.created_at
                  ? new Date(result.notification.created_at).toLocaleString()
                  : "—"} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.05] bg-[#0f1a2e]/40 backdrop-blur p-8 flex flex-col items-center justify-center h-full min-h-[280px] text-center gap-3">
              <span className="text-4xl opacity-30">🔔</span>
              <p className="text-slate-600 text-sm">
                Fill in the form and send a notification to see the delivery result here.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.05]">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">{label}</span>
      <span className="text-sm text-slate-300 font-mono">{value ?? "—"}</span>
    </div>
  );
}
