import { useState, useEffect, useCallback, useRef } from "react";

const COMPLIANCE_URL = import.meta.env.VITE_API_GATEWAY_URL;

// ── Action metadata ──────────────────────────────────────────────────────────
const ACTION_META = {
  COMPLIANCE_APPROVED: { color: "emerald", icon: "✓", label: "Approved" },
  COMPLIANCE_REJECTED: { color: "red", icon: "✕", label: "Rejected" },
  COMPLIANCE_CHECK_REQUESTED: {
    color: "sky",
    icon: "⟳",
    label: "Check Requested",
  },
  COMPLIANCE_CHECK_FAILED_DB: { color: "red", icon: "!", label: "DB Failure" },
  NOTIFY_REQUESTED: { color: "violet", icon: "↗", label: "Notify Queued" },
  NOTIFY_SENT: { color: "emerald", icon: "✓", label: "Notify Sent" },
  NOTIFY_EMAIL_SENT: { color: "emerald", icon: "✉", label: "Email Sent" },
  NOTIFY_EMAIL_FAILED: { color: "red", icon: "✉", label: "Email Failed" },
  NOTIFY_FAILED_DB: { color: "red", icon: "!", label: "Notify DB Error" },
};

const COLOR_MAP = {
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-400",
    stat: "text-emerald-400",
  },
  red: {
    badge: "bg-red-500/10 text-red-400 border-red-500/25",
    dot: "bg-red-400",
    stat: "text-red-400",
  },
  sky: {
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/25",
    dot: "bg-sky-400",
    stat: "text-sky-400",
  },
  violet: {
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/25",
    dot: "bg-violet-400",
    stat: "text-violet-400",
  },
  slate: {
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/25",
    dot: "bg-slate-500",
    stat: "text-slate-400",
  },
};

function getColor(action) {
  return COLOR_MAP[ACTION_META[action]?.color] || COLOR_MAP.slate;
}

// ── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}

// ── ActionBadge ──────────────────────────────────────────────────────────────
function ActionBadge({ action }) {
  const meta = ACTION_META[action];
  const color = getColor(action);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold border ${color.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
      {meta?.label || action}
    </span>
  );
}

// ── Detail cell ──────────────────────────────────────────────────────────────
function DetailCell({ details }) {
  const [open, setOpen] = useState(false);
  if (!details || Object.keys(details).length === 0) {
    return <span className="text-slate-700 text-xs">—</span>;
  }
  const entries = Object.entries(details);
  const preview = entries.slice(0, 1).map(([k, v]) => (
    <span key={k} className="text-slate-500 text-xs">
      <span className="text-slate-600">{k}:</span>{" "}
      <span className="text-slate-400 font-mono">
        {String(v).slice(0, 32)}
        {String(v).length > 32 ? "…" : ""}
      </span>
    </span>
  ));

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {preview}
        {entries.length > 1 && (
          <button
            onClick={() => setOpen((p) => !p)}
            className="text-[0.65rem] font-semibold text-sky-500 hover:text-sky-400 transition-colors"
          >
            {open ? "▲ less" : `▼ +${entries.length - 1} more`}
          </button>
        )}
      </div>
      {open && (
        <pre className="mt-2 p-2.5 rounded-lg bg-black/30 border border-white/[0.05] text-[0.65rem] text-slate-400 font-mono whitespace-pre-wrap break-all leading-relaxed max-w-xs">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Delete confirmation modal ────────────────────────────────────────────────
function DeleteModal({ orderId, onConfirm, onCancel, loading }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    modalRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      prev?.focus();
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0f1a2e] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] focus:outline-none"
      >
        <div className="flex items-start gap-4 mb-5">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-lg shrink-0">
            ⚠
          </span>
          <div>
            <p className="text-slate-100 font-bold text-sm">
              Delete Audit Logs
            </p>
            <p className="text-slate-400 text-xs mt-1">
              This will permanently delete all audit logs for order{" "}
              <span className="text-slate-200 font-mono">{orderId}</span>. This
              action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-all flex items-center gap-2"
          >
            {loading && (
              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, action, color }) {
  const c = COLOR_MAP[color] || COLOR_MAP.slate;
  return (
    <div className="rounded-2xl bg-[#0a1628] border border-white/[0.06] px-5 py-4 flex flex-col gap-1 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-2xl font-extrabold font-serif ${c.stat}`}>
          {value}
        </span>
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      </div>
      <p
        className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 truncate"
        title={action || label}
      >
        {label}
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminAuditSection() {
  const [action, setAction] = useState("");
  const [orderId, setOrderId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({});
  const [totalStats, setTotalStats] = useState(0);
  const [actionTypes, setActionTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // orderId to delete
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load stats + action types ──
  const loadMeta = useCallback(async () => {
    const token = localStorage.getItem("jwt");
    setStatsLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`${COMPLIANCE_URL}/audit/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${COMPLIANCE_URL}/audit/logs/actions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const sData = await sRes.json();
      const aData = await aRes.json();
      if (sRes.ok) {
        setStats(sData.stats || {});
        setTotalStats(sData.total || 0);
      }
      if (aRes.ok) setActionTypes(aData.actions || []);
    } catch {
      /* non-fatal */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // ── Load logs ──
  const fetchLogs = useCallback(
    async (pg = 1, silent = false) => {
      const token = localStorage.getItem("jwt");
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: pg, limit: 25 });
        if (action) params.set("action", action);
        if (orderId) params.set("order_id", orderId);
        if (from) params.set("from", new Date(from).toISOString());
        if (to) params.set("to", new Date(to).toISOString());

        const res = await fetch(`${COMPLIANCE_URL}/audit/logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.details || data.error || "Failed to fetch logs");
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setPage(pg);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [action, orderId, from, to],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchLogs(1);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleClear = () => {
    setAction("");
    setOrderId("");
    setFrom("");
    setTo("");
    // defer to let state settle
    setTimeout(() => fetchLogs(1), 0);
  };

  const handleRefresh = () => {
    loadMeta();
    fetchLogs(page, true);
  };

  // ── Delete ──
  const handleDeleteConfirm = async () => {
    const token = localStorage.getItem("jwt");
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `${COMPLIANCE_URL}/audit/orders/${deleteTarget}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      showToast("success", `Deleted logs for order ${deleteTarget}`);
      setDeleteTarget(null);
      fetchLogs(page, true);
      loadMeta();
    } catch (err) {
      showToast("error", err.message);
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── CSV export ──
  const handleExport = () => {
    if (!logs.length) return;
    const header = ["id", "action", "order_id", "details", "created_at"];
    const rows = logs.map((l) => [
      l.id,
      l.action,
      l.order_id || "",
      l.details ? JSON.stringify(l.details) : "",
      l.created_at || "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = action || orderId || from || to;

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1">
            Compliance Service
          </p>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">
            Audit Logs
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Immutable trail of all system events — compliance checks,
            notifications, and errors.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh"
          className="mt-1 p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-sky-400 hover:border-sky-500/30 hover:bg-sky-500/[0.06] transition-all disabled:opacity-40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          >
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 mb-8">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#0a1628] border border-white/[0.06] px-5 py-4 animate-pulse"
            >
              <div className="h-7 w-12 rounded-lg bg-white/[0.04] mb-2" />
              <div className="h-2.5 w-20 rounded bg-white/[0.03]" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Events" value={totalStats} color="sky" />
            {Object.entries(stats).map(([k, v]) => {
              const meta = ACTION_META[k];
              return (
                <StatCard
                  key={k}
                  label={meta?.label || k}
                  value={v}
                  action={k}
                  color={ACTION_META[k]?.color || "slate"}
                />
              );
            })}
          </>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a1628] backdrop-blur p-5 mb-5">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-3">
            {/* Action */}
            <div>
              <label
                htmlFor="filter-action"
                className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5"
              >
                Action
              </label>
              <select
                id="filter-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-sm focus:outline-none focus:border-sky-500/50 transition-all cursor-pointer"
              >
                <option value="" className="bg-[#0f1a2e]">
                  All Actions
                </option>
                {actionTypes.map((a) => (
                  <option key={a} value={a} className="bg-[#0f1a2e]">
                    {ACTION_META[a]?.label || a}
                  </option>
                ))}
              </select>
            </div>

            {/* Order ID */}
            <div>
              <label
                htmlFor="filter-order-id"
                className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5"
              >
                Order ID
              </label>
              <input
                id="filter-order-id"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ord-1234"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-sky-500/50 transition-all"
              />
            </div>

            {/* From */}
            <div>
              <label
                htmlFor="filter-from"
                className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5"
              >
                From
              </label>
              <input
                id="filter-from"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 text-sm focus:outline-none focus:border-sky-500/50 transition-all"
              />
            </div>

            {/* To */}
            <div>
              <label
                htmlFor="filter-to"
                className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5"
              >
                To
              </label>
              <input
                id="filter-to"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 text-sm focus:outline-none focus:border-sky-500/50 transition-all"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col justify-end gap-2">
              <button
                type="submit"
                className="w-full px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all"
              >
                Search
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full px-4 py-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.05]">
              {action && (
                <Chip
                  label={`Action: ${ACTION_META[action]?.label || action}`}
                  onRemove={() => setAction("")}
                />
              )}
              {orderId && (
                <Chip
                  label={`Order: ${orderId}`}
                  onRemove={() => setOrderId("")}
                />
              )}
              {from && (
                <Chip
                  label={`From: ${new Date(from).toLocaleString()}`}
                  onRemove={() => setFrom("")}
                />
              )}
              {to && (
                <Chip
                  label={`To: ${new Date(to).toLocaleString()}`}
                  onRemove={() => setTo("")}
                />
              )}
            </div>
          )}
        </form>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-sm">
          <span className="text-lg">⚠</span>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-300 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Table toolbar ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-600 text-xs">
          {loading ? (
            "Loading…"
          ) : (
            <>
              Showing{" "}
              <span className="text-slate-400 font-semibold">
                {logs.length}
              </span>{" "}
              of <span className="text-slate-400 font-semibold">{total}</span>{" "}
              entries
            </>
          )}
        </p>
        <button
          onClick={handleExport}
          disabled={!logs.length}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20 text-xs font-semibold transition-all disabled:opacity-30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#070d1a] overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.3)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-500">
            <span className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-sky-400 animate-spin" />
            <p className="text-sm">Loading audit logs…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Action", "Order ID", "Details", "Timestamp", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-5 py-3.5 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 ${h === "" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                        <span className="text-4xl opacity-20">📋</span>
                        <p className="text-slate-600 text-sm">
                          No audit logs found.
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleClear}
                            className="text-sky-500 hover:text-sky-400 text-xs font-semibold transition-colors"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={`group hover:bg-white/[0.02] transition-colors ${idx % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                    >
                      {/* Action */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <ActionBadge action={log.action} />
                      </td>

                      {/* Order ID */}
                      <td className="px-5 py-4">
                        {log.order_id ? (
                          <span className="font-mono text-xs text-slate-300 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg">
                            {log.order_id}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-5 py-4 max-w-sm">
                        <DetailCell details={log.details} />
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-300 text-xs font-medium">
                            {relativeTime(log.created_at)}
                          </span>
                          <span className="text-slate-600 text-[0.65rem]">
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : ""}
                          </span>
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="px-5 py-4 text-right">
                        {log.order_id && (
                          <button
                            onClick={() => setDeleteTarget(log.order_id)}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-[0.65rem] font-semibold rounded-lg border text-red-400 border-red-500/20 bg-red-500/[0.06] hover:bg-red-500/15 transition-all"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-slate-600 text-xs">
            Page <span className="text-slate-400 font-semibold">{page}</span> of{" "}
            <span className="text-slate-400 font-semibold">{pages}</span>{" "}
            &mdash;{" "}
            <span className="text-slate-400 font-semibold">{total}</span> total
            entries
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchLogs(1)}
              disabled={page <= 1}
              className="px-2.5 py-2 text-xs rounded-xl border border-white/[0.08] text-slate-500 hover:text-slate-200 disabled:opacity-25 transition-all"
              title="First page"
            >
              «
            </button>
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20 disabled:opacity-25 transition-all"
            >
              ← Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, pages - 6)) + i;
              return p <= pages ? (
                <button
                  key={p}
                  onClick={() => fetchLogs(p)}
                  className={`w-8 h-8 text-xs font-semibold rounded-xl border transition-all ${
                    p === page
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                      : "border-white/[0.08] text-slate-500 hover:text-slate-200 hover:border-white/20"
                  }`}
                >
                  {p}
                </button>
              ) : null;
            })}

            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= pages}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20 disabled:opacity-25 transition-all"
            >
              Next →
            </button>
            <button
              onClick={() => fetchLogs(pages)}
              disabled={page >= pages}
              className="px-2.5 py-2 text-xs rounded-xl border border-white/[0.08] text-slate-500 hover:text-slate-200 disabled:opacity-25 transition-all"
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <DeleteModal
          orderId={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
          <div
            className={`px-5 py-4 rounded-2xl border shadow-[0_12px_48px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur pointer-events-auto ${
              toast.type === "success"
                ? "bg-[#064e3b]/90 border-emerald-500/30 text-emerald-100"
                : "bg-[#7f1d1d]/90 border-red-500/30 text-red-100"
            }`}
          >
            <span className="text-xl">
              {toast.type === "success" ? "✅" : "⚠️"}
            </span>
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
    </>
  );
}

// ── Filter chip ──────────────────────────────────────────────────────────────
function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[0.65rem] font-semibold">
      {label}
      <button
        onClick={onRemove}
        className="text-sky-600 hover:text-sky-300 transition-colors leading-none"
      >
        ✕
      </button>
    </span>
  );
}
