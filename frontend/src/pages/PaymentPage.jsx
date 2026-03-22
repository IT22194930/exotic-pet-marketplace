import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

function formatUSD(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return "USD 0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function formatCardNumber(raw) {
  const digits = onlyDigits(raw).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function maskCvv(raw) {
  const digits = onlyDigits(raw).slice(0, 4);
  return digits.replace(/\d/g, "•");
}

function normalizeName(raw) {
  return String(raw || "").replace(/\s+/g, " ");
}

function validate(values) {
  const errors = {};

  // Card holder name
  const name = normalizeName(values.cardHolderName).trim();
  if (!name) errors.cardHolderName = "Card holder name is required.";
  else if (name.length < 3) errors.cardHolderName = "Minimum 3 characters required.";
  else if (!/^[A-Za-z ]+$/.test(name)) errors.cardHolderName = "Only letters and spaces are allowed.";

  // Card number
  const numberDigits = onlyDigits(values.cardNumber);
  if (!numberDigits) errors.cardNumber = "Card number is required.";
  else if (!/^\d{16}$/.test(numberDigits)) errors.cardNumber = "Card number must be exactly 16 digits.";

  // Expiry MM/YY (future)
  const exp = String(values.expiryDate || "").trim();
  const m = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!exp) errors.expiryDate = "Expiry date is required.";
  else if (!m) errors.expiryDate = "Use MM/YY format.";
  else {
    const month = Number(m[1]);
    const year2 = Number(m[2]);
    if (month < 1 || month > 12) errors.expiryDate = "Month must be between 01 and 12.";
    else {
      const year = 2000 + year2;
      const expiry = new Date(year, month, 0, 23, 59, 59, 999);
      if (expiry.getTime() <= Date.now()) errors.expiryDate = "Card is expired. Use a future date.";
    }
  }

  // CVV 3-4 digits
  const cvvDigits = onlyDigits(values.cvv);
  if (!cvvDigits) errors.cvv = "CVV is required.";
  else if (!/^\d{3,4}$/.test(cvvDigits)) errors.cvv = "CVV must be 3 or 4 digits.";

  return errors;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState("");

  const [method, setMethod] = useState("online"); // 'online' | 'cod'

  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoadingOrder(true);
      setOrderError("");
      setOrder(null);

      const token = localStorage.getItem("jwt");
      if (!token) {
        setLoadingOrder(false);
        setOrderError("Please sign in to continue to payment.");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || "Failed to load order");
        setOrder(data);
      } catch (err) {
        setOrderError(err.message);
      } finally {
        setLoadingOrder(false);
      }
    };

    if (API_URL && orderId) load();
  }, [orderId]);

  const summary = useMemo(() => {
    if (!order) return { items: [], total: 0 };

    // Current Order Service returns a single order row (single listing).
    const unit = Number(order.price || 0);
    const item = {
      name: order.title || "Item",
      quantity: 1,
      unitPrice: unit,
      subtotal: unit,
    };
    return {
      items: [item],
      total: item.subtotal,
    };
  }, [order]);

  const amountText = formatUSD(summary.total);

  const formValues = useMemo(
    () => ({ cardHolderName, cardNumber, expiryDate, cvv }),
    [cardHolderName, cardNumber, expiryDate, cvv],
  );

  const errors = useMemo(() => {
    if (method !== "online") return {};
    return validate(formValues);
  }, [formValues, method]);

  const isFormValid = method === "cod" || Object.keys(errors).length === 0;
  const canSubmit = !loadingOrder && !orderError && !!order && !submitting && isFormValid;

  const inputBase =
    "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)] transition-all";

  const showErr = (key) => method === "online" && touched[key] && errors[key];

  const handlePay = async () => {
    setSubmitError("");

    if (!order) return;

    // Client-side validation gate
    if (method === "online") {
      const nextTouched = { cardHolderName: true, cardNumber: true, expiryDate: true, cvv: true };
      setTouched(nextTouched);
      const e = validate(formValues);
      if (Object.keys(e).length > 0) return;
    }

    const token = localStorage.getItem("jwt");
    if (!token) {
      setSubmitError("Please sign in to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId,
        method,
        ...(method === "online"
          ? {
              cardHolderName: normalizeName(cardHolderName).trim(),
              cardNumber: onlyDigits(cardNumber),
              expiryDate: String(expiryDate || "").trim(),
              cvv: onlyDigits(cvv),
            }
          : {}),
      };

      const res = await fetch(`${API_URL}/payments/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.details || data.error || "Payment failed");

      navigate(`/payment/success?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(data.amount ?? summary.total))}`);
    } catch (err) {
      navigate(`/payment/failed?orderId=${encodeURIComponent(orderId)}`);
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-16 px-6 md:px-10">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">Checkout</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight font-serif">
          Payment
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review your order, select a payment method, and confirm.
        </p>

        {/* Order summary */}
        <div className="mt-8 rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.07] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-100">Order Summary</p>
              <p className="text-xs text-slate-500 mt-0.5">Order ID: {orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Amount</p>
              <p className="text-lg font-extrabold text-emerald-300 font-serif">{amountText}</p>
            </div>
          </div>

          {loadingOrder ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <span className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin" />
              Loading order…
            </div>
          ) : orderError ? (
            <div className="px-6 py-5">
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                ⚠️ {orderError}
              </div>
              <div className="mt-4 text-sm text-slate-500">
                If you are not signed in, please log in first.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[0.72rem] uppercase tracking-widest text-slate-500">
                    <th className="text-left px-6 py-4">Item Name</th>
                    <th className="text-left px-6 py-4">Quantity</th>
                    <th className="text-left px-6 py-4">Unit Price</th>
                    <th className="text-left px-6 py-4">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-100">{it.name}</td>
                      <td className="px-6 py-4 text-slate-300">{it.quantity}</td>
                      <td className="px-6 py-4 text-slate-300">{formatUSD(it.unitPrice)}</td>
                      <td className="px-6 py-4 text-emerald-300 font-semibold">{formatUSD(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-6 py-5 flex items-center justify-end">
                <div className="w-full sm:w-[420px] rounded-2xl bg-white/3 border border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total Amount</span>
                    <span className="text-slate-100 font-semibold">{amountText}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Amount is calculated automatically and cannot be edited.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment method selection */}
        <div className="mt-8 rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur px-6 py-6">
          <p className="text-sm font-semibold text-slate-100">Payment Method</p>
          <p className="text-xs text-slate-500 mt-1">Choose one option to continue.</p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`cursor-pointer rounded-2xl border px-5 py-5 transition-all ${
              method === "online" ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/3 hover:bg-white/4"
            }`}>
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="payment-method"
                  value="online"
                  checked={method === "online"}
                  onChange={() => setMethod("online")}
                  className="mt-1 accent-emerald-500"
                />
                <div>
                  <p className="text-slate-100 font-semibold">Online Payment</p>
                  <p className="text-xs text-slate-500 mt-1">Pay securely using a debit/credit card.</p>
                </div>
              </div>
            </label>

            <label className={`cursor-pointer rounded-2xl border px-5 py-5 transition-all ${
              method === "cod" ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/3 hover:bg-white/4"
            }`}>
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="payment-method"
                  value="cod"
                  checked={method === "cod"}
                  onChange={() => setMethod("cod")}
                  className="mt-1 accent-emerald-500"
                />
                <div>
                  <p className="text-slate-100 font-semibold">Cash on Delivery</p>
                  <p className="text-xs text-slate-500 mt-1">No card details needed. Confirm the order directly.</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Online payment section */}
        {method === "online" && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: card preview */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur p-6">
              <p className="text-sm font-semibold text-slate-100">Card Preview</p>
              <p className="text-xs text-slate-500 mt-1">Updates in real time as you type.</p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-700/30 to-amber-300/10 p-6 shadow-[0_14px_60px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-200/80">Debit / Credit</span>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-200/80">Secure</span>
                </div>

                <div className="mt-6 text-xl md:text-2xl font-semibold tracking-widest text-slate-100">
                  {(formatCardNumber(cardNumber) || "1234 5678 9012 3456")}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-widest text-slate-200/70">Card Holder</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100 truncate">
                      {(normalizeName(cardHolderName).trim().toUpperCase() || "CARD HOLDER")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.7rem] uppercase tracking-widest text-slate-200/70">Expiry</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {(expiryDate || "MM/YY")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-widest text-slate-200/70">CVV</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{maskCvv(cvv) || "•••"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.7rem] uppercase tracking-widest text-slate-200/70">Amount</p>
                    <p className="mt-1 text-sm font-extrabold text-emerald-200 font-serif">{amountText}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: card form */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur p-6">
              <p className="text-sm font-semibold text-slate-100">Card Details</p>
              <p className="text-xs text-slate-500 mt-1">All fields are required for online payment.</p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Card Holder Name</label>
                  <input
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, cardHolderName: true }))}
                    placeholder="e.g., JOHN DOE"
                    className={inputBase}
                    autoComplete="cc-name"
                  />
                  {showErr("cardHolderName") && (
                    <p className="mt-1.5 text-xs text-red-300">{errors.cardHolderName}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Card Number</label>
                  <input
                    value={formatCardNumber(cardNumber)}
                    onChange={(e) => setCardNumber(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, cardNumber: true }))}
                    placeholder="1234 5678 9012 3456"
                    className={inputBase}
                    inputMode="numeric"
                    autoComplete="cc-number"
                  />
                  {showErr("cardNumber") && (
                    <p className="mt-1.5 text-xs text-red-300">{errors.cardNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Expiry Date</label>
                    <input
                      value={expiryDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        // allow digits and '/'
                        const cleaned = v.replace(/[^0-9/]/g, "").slice(0, 5);
                        // basic auto slash after 2 digits
                        let next = cleaned;
                        if (/^\d{2}$/.test(cleaned) && !cleaned.includes("/")) next = `${cleaned}/`;
                        setExpiryDate(next);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, expiryDate: true }))}
                      placeholder="MM/YY"
                      className={inputBase}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                    />
                    {showErr("expiryDate") && (
                      <p className="mt-1.5 text-xs text-red-300">{errors.expiryDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">CVV</label>
                    <input
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      onBlur={() => setTouched((t) => ({ ...t, cvv: true }))}
                      placeholder="***"
                      className={inputBase}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                    />
                    {showErr("cvv") && (
                      <p className="mt-1.5 text-xs text-red-300">{errors.cvv}</p>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className="mt-2 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                    ⚠️ {submitError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pay button */}
        <div className="mt-8 flex items-center justify-end">
          <button
            onClick={handlePay}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-3 px-7 py-3.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_6px_24px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_10px_34px_rgba(16,185,129,0.45)] transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {submitting && (
              <span className="w-4 h-4 rounded-full border-2 border-emerald-200/60 border-t-white animate-spin" />
            )}
            {method === "cod" ? "Confirm Order" : `Pay ${amountText}`}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          {method === "online"
            ? "Pay button is enabled only when all card fields are valid."
            : "Card form is hidden for Cash on Delivery."}
        </p>
      </div>
    </div>
  );
}
