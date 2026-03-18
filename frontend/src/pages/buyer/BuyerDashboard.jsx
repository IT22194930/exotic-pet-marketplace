import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthUser } from "../../utils/auth";

const ORDER_URL = import.meta.env.VITE_API_GATEWAY_URL;

const STATUS_STYLES = {
  created:   "bg-emerald-500/15 text-emerald-400  border-emerald-500/30",
  rejected:  "bg-red-500/15    text-red-400     border-red-500/30",
  cancelled: "bg-slate-500/15  text-slate-400   border-slate-500/30",
  pending:   "bg-amber-500/15  text-amber-400   border-amber-500/30",
  shipped:   "bg-blue-500/15   text-blue-400    border-blue-500/30",
  delivered: "bg-teal-500/15   text-teal-400    border-teal-500/30",
};

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [toast, setToast]       = useState(null);   // { type, message }
  const [cancelling, setCancelling] = useState(null); // order id being cancelled

  const me = getAuthUser();

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

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

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    const token = localStorage.getItem("jwt");
    setCancelling(orderId);
    try {
      const res = await fetch(`${ORDER_URL}/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Cancellation failed");

      // Update order in local state without refetching
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: "cancelled", reason: "Cancelled by buyer" } : o)
      );
      showToast("success", "Order cancelled. The listing is now available again.");
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setCancelling(null);
    }
  };

  const handlePay = (orderId) => {
    navigate(`/payment/${orderId}`);
  };

  const stats = [
    { label: "Total Orders",    value: orders.length },
    { label: "Active",          value: orders.filter(o => o.status === "created").length },
    { label: "Cancelled",       value: orders.filter(o => o.status === "cancelled").length },
  ];

  const payButtonClass = "px-3.5 py-1.5 text-xs font-semibold rounded-lg border text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.07] hover:bg-emerald-500/15 transition-all disabled:opacity-50";
  const cancelButtonClass = "px-3.5 py-1.5 text-xs font-semibold rounded-lg border text-red-300 border-red-500/20 bg-red-500/[0.06] hover:bg-red-500/10 transition-all disabled:opacity-50";

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
                  <th className="text-left px-6 py-4">Title</th>
                  <th className="text-left px-6 py-4">Species</th>
                  <th className="text-left px-6 py-4">Price</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Reason</th>
                  <th className="text-left px-6 py-4">Placed</th>
                  <th className="text-left px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      No orders yet.{" "}
                      <Link to="/shop" className="text-emerald-400 hover:text-emerald-300 underline">
                        Browse the Shop →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-100">{o.title || "—"}</td>
                      <td className="px-6 py-4 text-slate-300 capitalize">{o.species || "—"}</td>
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
                      <td className="px-6 py-4">
                        {o.status === "created" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePay(o.id)}
                              disabled={cancelling === o.id}
                              className={payButtonClass}
                            >
                              Pay
                            </button>
                            <button
                              onClick={() => handleCancel(o.id)}
                              disabled={cancelling === o.id}
                              className={cancelButtonClass}
                            >
                              {cancelling === o.id ? "Cancelling…" : "Cancel"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
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
