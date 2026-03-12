import { useState } from "react";

const COMPLIANCE_URL = import.meta.env.VITE_API_GATEWAY_URL;

// -- Field config -------------------------------------------------------------
const FIELDS = [
  {
    name: "orderId",
    label: "Order ID",
    placeholder: "e.g. ord-1234",
    type: "text",
    required: true,
    hint: "The order this compliance check is tied to.",
  },
  {
    name: "species",
    label: "Species",
    placeholder: "e.g. Komodo Dragon",
    type: "text",
    required: true,
    hint: "Common or scientific name of the animal being listed.",
  },
  {
    name: "sellerId",
    label: "Seller ID",
    placeholder: "UUID of the seller",
    type: "text",
    required: true,
    hint: "The seller user UUID from the Identity Service.",
  },
  {
    name: "buyerEmail",
    label: "Buyer Email",
    placeholder: "buyer@example.com",
    type: "email",
    required: false,
    hint: "Optional � sends an approval / rejection email to this address.",
  },
];

// -- How-it-works steps -------------------------------------------------------
const STEPS = [
  {
    icon: "1",
    color: "sky",
    title: "Authentication",
    body: "Your admin JWT is validated against the Identity Service to confirm your role.",
  },
  {
    icon: "2",
    color: "amber",
    title: "Species Lookup",
    body: "The species name is cross-referenced against the restricted_species table in the database.",
  },
  {
    icon: "3",
    color: "violet",
    title: "Decision",
    body: "Unrestricted species are approved automatically. Restricted species require an admin-level token.",
  },
  {
    icon: "4",
    color: "emerald",
    title: "Notification & Audit",
    body: "A result email is dispatched (if buyer email provided) and the event is written to the audit log.",
  },
];

const STEP_COLORS = {
  sky: "bg-sky-500/10 border-sky-500/25 text-sky-400",
  amber: "bg-amber-500/10 border-amber-500/25 text-amber-400",
  violet: "bg-violet-500/10 border-violet-500/25 text-violet-400",
  emerald: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
};

// -- Component -----------------------------------------------------------------
export default function AdminComplianceSection() {
  const token = localStorage.getItem("jwt");

  const [form, setForm] = useState({
    orderId: "",
    species: "",
    sellerId: "",
    buyerEmail: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

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
      if (!res.ok)
        throw new Error(data.details || data.error || "Request failed");
      setResult(data);
      setHistory((prev) => [
        {
          ...data,
          orderId: form.orderId,
          species: form.species,
          checkedAt: new Date(),
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
  const isAllowed = result?.allowed === true;

  return (
    <>
      {/* -- Page header -- */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">
            Compliance Service
          </p>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">
            Compliance Check
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Run a compliance check against a species and order.
          </p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="mt-1 px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all"
          >
            New Check
          </button>
        )}
      </div>

      {/* -- Main grid -- */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-6 mb-6">
        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.07] bg-[#0a1628] p-6 space-y-5"
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-base">
              ?
            </span>
            <h2 className="text-base font-bold text-slate-100 font-serif">
              Check Parameters
            </h2>
          </div>

          <div className="space-y-4">
            {FIELDS.map(
              ({ name, label, placeholder, type, required, hint }) => (
                <div key={name}>
                  <label className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
                    {label}
                    {!required && (
                      <span className="ml-2 normal-case tracking-normal text-slate-700 font-normal">
                        optional
                      </span>
                    )}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/[0.02] transition-all"
                  />
                  <p className="mt-1 text-[0.65rem] text-slate-700">{hint}</p>
                </div>
              ),
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-300 text-sm">
              <span className="text-base mt-0.5">?</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.15)]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Running check�
              </>
            ) : (
              <>
                <span className="text-base leading-none">?</span> Run Compliance
                Check
              </>
            )}
          </button>
        </form>

        {/* Result panel */}
        <div className="flex flex-col gap-4">
          {result ? (
            <div
              className={`rounded-2xl border backdrop-blur p-6 flex-1 ${
                isAllowed
                  ? "border-emerald-500/25 bg-emerald-500/[0.05]"
                  : "border-red-500/25 bg-red-500/[0.05]"
              }`}
            >
              <div
                className={`flex items-center gap-3 p-4 rounded-xl mb-5 ${isAllowed ? "bg-emerald-500/10" : "bg-red-500/10"}`}
              >
                <span className="text-3xl">{isAllowed ? "?" : "?"}</span>
                <div>
                  <p
                    className={`text-xl font-extrabold font-serif leading-tight ${isAllowed ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {isAllowed ? "Approved" : "Rejected"}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {result.reason}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 mb-5">
                <ResultRow label="Order ID" value={form.orderId} mono />
                <ResultRow label="Species" value={form.species} />
                <ResultRow
                  label="Decision"
                  value={isAllowed ? "Allowed" : "Blocked"}
                  color={isAllowed ? "text-emerald-400" : "text-red-400"}
                />
                <ResultRow
                  label="Restricted"
                  value={result.restricted ? "Yes � requires admin" : "No"}
                  color={
                    result.restricted ? "text-amber-400" : "text-slate-300"
                  }
                />
                <ResultRow label="Reason" value={result.reason} />
              </div>

              {form.buyerEmail && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <span className="text-sky-400 text-sm">?</span>
                  <p className="text-xs text-slate-400">
                    Notification requested for{" "}
                    <span className="text-slate-200 font-medium">
                      {form.buyerEmail}
                    </span>
                  </p>
                </div>
              )}

              <p className="mt-3 text-[0.65rem] text-slate-700 text-center">
                This check has been recorded in the audit log.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.05] bg-[#0a1628] p-8 flex flex-col items-center justify-center flex-1 min-h-[320px] text-center gap-3">
              <span className="text-5xl opacity-[0.12]">??</span>
              <p className="text-slate-600 text-sm font-medium">
                No result yet
              </p>
              <p className="text-slate-700 text-xs max-w-[200px] leading-relaxed">
                Fill in the parameters on the left and run a check to see the
                verdict here.
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a1628] p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-700 mb-3">
                Session History
              </p>
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={`${h.orderId}-${h.checkedAt.getTime()}`}
                    className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs ${h.allowed ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {h.allowed ? "?" : "?"}
                      </span>
                      <span className="text-slate-300 text-xs truncate font-medium">
                        {h.species}
                      </span>
                      <span className="text-slate-700 text-[0.65rem] font-mono shrink-0">
                        {h.orderId}
                      </span>
                    </div>
                    <span className="text-slate-700 text-[0.65rem] shrink-0">
                      {h.checkedAt.toLocaleTimeString([], {
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

      {/* -- How it works -- */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1628] p-6">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-5">
          How it works
        </p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STEPS.map(({ icon, color, title, body }) => (
            <div key={title} className="flex gap-3">
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-lg border text-xs font-bold shrink-0 mt-0.5 ${STEP_COLORS[color]}`}
              >
                {icon}
              </span>
              <div>
                <p className="text-slate-300 text-xs font-bold mb-1">{title}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// -- Result row helper ---------------------------------------------------------
function ResultRow({ label, value, color = "text-slate-300", mono = false }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/[0.05]">
      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 shrink-0">
        {label}
      </span>
      <span
        className={`text-xs font-semibold text-right ${color} ${mono ? "font-mono" : ""}`}
      >
        {String(value)}
      </span>
    </div>
  );
}
