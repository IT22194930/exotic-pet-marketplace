import { useState } from "react";

const COMPLIANCE_URL = import.meta.env.VITE_COMPLIANCE_SERVICE_URL;

const RESULT_STYLES = {
  allowed: "border-emerald-500/30 bg-emerald-500/[0.06]",
  blocked: "border-red-500/30 bg-red-500/[0.06]",
};

export default function AdminComplianceSection() {
  const token = localStorage.getItem("jwt");

  const [form, setForm] = useState({
    orderId:    "",
    species:    "",
    sellerId:   "",
    buyerEmail: "",
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
      const body = { ...form };
      if (!body.buyerEmail) delete body.buyerEmail;

      const res = await fetch(`${COMPLIANCE_URL}/compliance/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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

  const isAllowed = result?.allowed === true;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">Compliance Service</p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">Compliance Check</h1>
        <p className="text-slate-400 text-sm mt-1">
          Verify whether a species is allowed for an order. Sends a result email to the buyer.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur p-6 space-y-5"
        >
          <h2 className="text-lg font-bold text-slate-100 font-serif">Check Details</h2>

          <div className="space-y-4">
            {[
              { name: "orderId",  label: "Order ID",    placeholder: "e.g. ord-1234",         required: true },
              { name: "species",  label: "Species",     placeholder: "e.g. Komodo Dragon",    required: true },
              { name: "sellerId", label: "Seller ID",   placeholder: "UUID of the seller",    required: true },
              { name: "buyerEmail", label: "Buyer Email (optional — for notification)", placeholder: "buyer@example.com", required: false },
            ].map(({ name, label, placeholder, required }) => (
              <div key={name}>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                  {label}
                </label>
                <input
                  type={name === "buyerEmail" ? "email" : "text"}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  required={required}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.12)] transition-all"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Checking…
              </span>
            ) : "Run Compliance Check"}
          </button>
        </form>

        {/* Result */}
        <div>
          {result ? (
            <div className={`rounded-2xl border ${RESULT_STYLES[isAllowed ? "allowed" : "blocked"]} backdrop-blur p-6`}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">{isAllowed ? "✅" : "⛔"}</span>
                <div>
                  <p className={`text-xl font-extrabold font-serif ${isAllowed ? "text-emerald-300" : "text-red-300"}`}>
                    {isAllowed ? "Approved" : "Rejected"}
                  </p>
                  <p className="text-slate-400 text-sm">{result.reason}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Row label="Allowed"    value={result.allowed ? "Yes" : "No"} color={isAllowed ? "text-emerald-400" : "text-red-400"} />
                <Row label="Restricted" value={result.restricted ? "Yes" : "No"} color={result.restricted ? "text-amber-400" : "text-slate-300"} />
                <Row label="Reason"     value={result.reason} />
              </div>

              {form.buyerEmail && (
                <p className="mt-5 text-xs text-slate-500">
                  📧 Notification email sent to <span className="text-slate-300">{form.buyerEmail}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.05] bg-[#0f1a2e]/40 backdrop-blur p-8 flex flex-col items-center justify-center h-full min-h-[260px] text-center gap-3">
              <span className="text-4xl opacity-30">🦎</span>
              <p className="text-slate-600 text-sm">Fill in the form and run a compliance check to see the result here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0f1a2e]/60 backdrop-blur p-6">
        <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-widest">How it works</h3>
        <ul className="space-y-2 text-slate-500 text-sm list-disc list-inside">
          <li>If the species is <strong className="text-slate-400">not restricted</strong>, the order is automatically approved.</li>
          <li>If the species is <strong className="text-amber-400">restricted</strong>, only an <strong className="text-purple-400">admin</strong> token can approve it.</li>
          <li>An email notification is sent to the buyer on approval or rejection (when buyer email is provided).</li>
          <li>All checks are recorded in the audit log.</li>
        </ul>
      </div>
    </>
  );
}

function Row({ label, value, color = "text-slate-300" }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.05]">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{String(value)}</span>
    </div>
  );
}
