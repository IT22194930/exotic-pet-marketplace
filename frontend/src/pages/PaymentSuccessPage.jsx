import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function formatLkr(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return "LKR 0.00";
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PaymentSuccessPage() {
  const q = useQuery();
  const orderId = q.get("orderId") || "—";
  const amount = q.get("amount");

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-16 px-6 md:px-10">
      <div className="max-w-xl mx-auto rounded-2xl border border-emerald-500/25 bg-[#0f1a2e]/80 backdrop-blur p-8 shadow-[0_14px_60px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">Payment Status</p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">Payment Successful</h1>

        <div className="mt-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-5 py-4">
          <p className="text-sm text-slate-300">Order ID</p>
          <p className="text-sm font-semibold text-slate-100 mt-1 break-all">{orderId}</p>

          {amount != null && (
            <>
              <p className="text-sm text-slate-300 mt-4">Amount</p>
              <p className="text-lg font-extrabold text-emerald-200 font-serif mt-1">{formatLkr(amount)}</p>
            </>
          )}
        </div>

        <div className="mt-7 flex items-center gap-3">
          <Link
            to="/buyer/dashboard"
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_6px_24px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_10px_34px_rgba(16,185,129,0.45)] transition-all duration-200 no-underline"
          >
            Go to My Orders
          </Link>
          <Link
            to="/shop"
            className="px-5 py-2.5 text-sm font-semibold text-slate-200 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-200 no-underline"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
