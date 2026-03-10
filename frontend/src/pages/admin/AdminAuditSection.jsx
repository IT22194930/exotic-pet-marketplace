import { useState, useEffect, useCallback } from "react";

const COMPLIANCE_URL = import.meta.env.VITE_API_GATEWAY_URL;

const ACTION_COLORS = {
  COMPLIANCE_APPROVED:        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  COMPLIANCE_REJECTED:        "bg-red-500/15 text-red-400 border-red-500/30",
  COMPLIANCE_CHECK_REQUESTED: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  COMPLIANCE_CHECK_FAILED_DB: "bg-red-500/15 text-red-400 border-red-500/30",
  NOTIFY_REQUESTED:           "bg-purple-500/15 text-purple-400 border-purple-500/30",
  NOTIFY_SENT:                "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  NOTIFY_EMAIL_SENT:          "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  NOTIFY_EMAIL_FAILED:        "bg-red-500/15 text-red-400 border-red-500/30",
  NOTIFY_FAILED_DB:           "bg-red-500/15 text-red-400 border-red-500/30",
};

function ActionBadge({ action }) {
  const cls = ACTION_COLORS[action] || "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold border whitespace-nowrap ${cls}`}>
      {action}
    </span>
  );
}

export default function AdminAuditSection() {
  // ── Filters ──
  const [action, setAction]   = useState("");
  const [orderId, setOrderId] = useState("");
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");
  const [page, setPage]       = useState(1);

  // ── Data ──
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [stats, setStats]       = useState({});
  const [actionTypes, setActionTypes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError]       = useState("");

  // ── Load stats + action types on mount ──
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    const loadMeta = async () => {
      setStatsLoading(true);
      try {
        const [sRes, aRes] = await Promise.all([
          fetch(`${COMPLIANCE_URL}/audit/stats`,        { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${COMPLIANCE_URL}/audit/logs/actions`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const sData = await sRes.json();
        const aData = await aRes.json();
        if (sRes.ok) setStats(sData.stats || {});
        if (aRes.ok) setActionTypes(aData.actions || []);
      } catch {/* non-fatal */} finally {
        setStatsLoading(false);
      }
    };
    loadMeta();
  }, []);

  // ── Load logs ──
  const fetchLogs = useCallback(async (pg = 1) => {
    const token = localStorage.getItem("jwt");
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: pg, limit: 25 });
      if (action)  params.set("action",   action);
      if (orderId) params.set("order_id", orderId);
      if (from)    params.set("from",     from);
      if (to)      params.set("to",       to);

      const res = await fetch(`${COMPLIANCE_URL}/audit/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to fetch logs");
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(pg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [action, orderId, from, to]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(1); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleDelete = async (oid) => {
    const token = localStorage.getItem("jwt");
    if (!window.confirm(`Delete all audit logs for order ${oid}?`)) return;
    try {
      const res = await fetch(`${COMPLIANCE_URL}/audit/orders/${oid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      fetchLogs(page);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1">Compliance Service</p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">Audit Logs</h1>
        <p className="text-slate-400 text-sm mt-1">Browse, filter, and manage all system audit entries.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {statsLoading ? (
          <div className="col-span-4 text-slate-500 text-sm py-4">Loading stats…</div>
        ) : (
          <>
            <div className="rounded-2xl bg-[#0f1a2e]/80 border border-white/[0.07] px-5 py-4 backdrop-blur">
              <p className="text-2xl font-extrabold text-slate-100 font-serif">{total}</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-0.5">Total Logs</p>
            </div>
            {Object.entries(stats).slice(0, 7).map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-[#0f1a2e]/80 border border-white/[0.07] px-5 py-4 backdrop-blur">
                <p className="text-2xl font-extrabold text-slate-100 font-serif">{v}</p>
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500 mt-0.5 truncate">{k}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
        >
          <option value="" className="bg-[#1a2540]">All Actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a} className="bg-[#1a2540]">{a}</option>
          ))}
        </select>

        <input
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order ID…"
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-sky-500 transition-all"
        />
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-sky-500 transition-all"
        />
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-sky-500 transition-all"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-5 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <span className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-sky-400 animate-spin" />
            Loading logs…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[0.72rem] uppercase tracking-widest text-slate-500">
                  <th className="text-left px-6 py-4">Action</th>
                  <th className="text-left px-6 py-4">Order ID</th>
                  <th className="text-left px-6 py-4">Details</th>
                  <th className="text-left px-6 py-4">Timestamp</th>
                  <th className="text-right px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No logs found.
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                      {log.order_id || <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-xs">
                      <pre className="whitespace-pre-wrap break-all font-mono leading-relaxed">
                        {log.details ? JSON.stringify(log.details, null, 2) : "—"}
                      </pre>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.order_id && (
                        <button
                          onClick={() => handleDelete(log.order_id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border text-red-400 border-red-500/20 bg-red-500/[0.07] hover:bg-red-500/15 transition-all"
                        >
                          Delete Order Logs
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-slate-500 text-xs">
            Page {page} of {pages} &mdash; {total} total entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-300 hover:bg-white/[0.04] disabled:opacity-30 transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= pages}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-300 hover:bg-white/[0.04] disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
