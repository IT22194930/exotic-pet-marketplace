import { useState, useEffect } from "react";
import { getAuthUser } from "../../utils/auth";

const IDENTITY_URL = import.meta.env.VITE_IDENTITY_SERVICE_URL;

const ROLE_COLORS = {
  admin:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  seller: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  buyer:  "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

export default function AdminDashboard() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [toast, setToast]       = useState(null);
  const [actionId, setActionId] = useState(null); // id of user being acted on

  const me = getAuthUser();
  const token = localStorage.getItem("jwt");

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch all users ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${IDENTITY_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || "Failed to fetch users");
        setUsers(data.users || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Verify seller ──
  const handleVerify = async (userId) => {
    setActionId(userId);
    try {
      const res = await fetch(`${IDENTITY_URL}/sellers/${userId}/verify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to verify seller");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, seller_verified: true } : u));
      showToast("success", "Seller verified successfully!");
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setActionId(null);
    }
  };

  // ── Change role ──
  const handleRoleChange = async (userId, newRole) => {
    setActionId(userId);
    try {
      const res = await fetch(`${IDENTITY_URL}/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to change role");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast("success", `Role changed to ${newRole}`);
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setActionId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-16 px-6 md:px-10">

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-1">Admin Dashboard</p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">User Management</h1>
        <p className="text-slate-400 text-sm mt-1">
          Signed in as <span className="text-slate-200 font-medium">{me?.email}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users",       value: users.length },
          { label: "Sellers",           value: users.filter(u => u.role === "seller").length },
          { label: "Verified Sellers",  value: users.filter(u => u.role === "seller" && u.seller_verified).length },
          { label: "Pending Verify",    value: users.filter(u => u.role === "seller" && !u.seller_verified).length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#0f1a2e]/80 border border-white/[0.07] px-5 py-5 backdrop-blur">
            <p className="text-2xl font-extrabold text-slate-100 font-serif">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.15)] transition-all"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
        >
          <option value="all"    className="bg-[#1a2540]">All Roles</option>
          <option value="buyer"  className="bg-[#1a2540]">Buyers</option>
          <option value="seller" className="bg-[#1a2540]">Sellers</option>
          <option value="admin"  className="bg-[#1a2540]">Admins</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-6xl mx-auto mb-6 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="max-w-6xl mx-auto rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <span className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-purple-400 animate-spin" />
            Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[0.72rem] uppercase tracking-widest text-slate-500">
                  <th className="text-left px-6 py-4">Email</th>
                  <th className="text-left px-6 py-4">Role</th>
                  <th className="text-left px-6 py-4">Seller Status</th>
                  <th className="text-left px-6 py-4">Joined</th>
                  <th className="text-right px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No users match your filters.
                    </td>
                  </tr>
                )}
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-slate-100 font-medium">{u.email}</td>

                    {/* Role select */}
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={actionId === u.id}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer bg-transparent focus:outline-none disabled:opacity-50 ${ROLE_COLORS[u.role]}`}
                      >
                        <option value="buyer"  className="bg-[#1a2540] text-slate-100">buyer</option>
                        <option value="seller" className="bg-[#1a2540] text-slate-100">seller</option>
                        <option value="admin"  className="bg-[#1a2540] text-slate-100">admin</option>
                      </select>
                    </td>

                    {/* Seller verification */}
                    <td className="px-6 py-4">
                      {u.role === "seller" ? (
                        u.seller_verified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-500/15 text-amber-400 border-amber-500/30">
                            ⏳ Pending
                          </span>
                        )
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {u.role === "seller" && !u.seller_verified && (
                        <button
                          onClick={() => handleVerify(u.id)}
                          disabled={actionId === u.id}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.07] hover:bg-emerald-500/15 transition-all disabled:opacity-50"
                        >
                          {actionId === u.id ? "Verifying…" : "✓ Verify Seller"}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className={`px-5 py-4 rounded-2xl border shadow-[0_12px_48px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur ${
            toast.type === "success"
              ? "bg-[#064e3b]/90 border-emerald-500/30 text-emerald-100"
              : "bg-[#7f1d1d]/90 border-red-500/30 text-red-100"
          }`}>
            <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
