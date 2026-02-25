import React, { useState, useEffect } from "react";
import { getAuthUser } from "./utils/auth";

const ORDER_URL = import.meta.env.VITE_ORDER_SERVICE_URL;

const STATUS_STYLES = {
  created:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15    text-red-400    border-red-500/30",
  pending:  "bg-amber-500/15  text-amber-400  border-amber-500/30",
  shipped:  "bg-blue-500/15   text-blue-400   border-blue-500/30",
  delivered:"bg-slate-500/15  text-slate-400  border-slate-500/30",
};

export default function BuyerDashboard() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const me = getAuthUser();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("jwt");
      try {
        const res  = await fetch(`${ORDER_URL}/orders/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || "Failed to load orders");
        setOrders(data.orders || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = [
    { label: "Total Orders",    value: orders.length },
    { label: "Created",         value: orders.filter(o => o.status === "created").length },
    { label: "Rejected",        value: orders.filter(o => o.status === "rejected").length },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-16 px-6 md:px-10">

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">Buyer Dashboard</p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">My Orders</h1>
        <p className="text-slate-400 text-sm mt-1">
          Signed in as <span className="text-slate-200 font-medium">{me?.email}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#0f1a2e]/80 border border-white/[0.07] px-5 py-5 backdrop-blur">
            <p className="text-2xl font-extrabold text-slate-100 font-serif">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-5xl mx-auto mb-6 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Orders table */}
      <div className="max-w-5xl mx-auto rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <span className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin" />
            Loading orders…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[0.72rem] uppercase tracking-widest text-slate-500">
                  <th className="text-left px-6 py-4">Species</th>
                  <th className="text-left px-6 py-4">Price</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Reason</th>
                  <th className="text-left px-6 py-4">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                      No orders yet.{" "}
                      <a href="/shop" className="text-emerald-400 hover:text-emerald-300 underline">
                        Browse the Shop →
                      </a>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-100 capitalize">{o.species || "—"}</td>
                      <td className="px-6 py-4 text-emerald-400 font-semibold">
                        {o.price != null ? `$${Number(o.price).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pending}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs max-w-xs truncate">
                        {o.reason || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {o.created_at ? new Date(o.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
