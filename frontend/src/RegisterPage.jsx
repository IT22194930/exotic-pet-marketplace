import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const ROLES = [
  { value: "buyer",  label: "🛒 Buyer — I want to buy exotic pets" },
  { value: "seller", label: "🏪 Seller — I want to list exotic pets" },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", role: "buyer" });
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_IDENTITY_SERVICE_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password, role: form.role }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        setSuccess("Account created! Redirecting to login…");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch {
      setError("Network error — please check your connection.");
    }
    setLoading(false);
  };

  const inputClass =
    "w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:bg-emerald-500/[0.05] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-all duration-200";
  const labelClass =
    "block text-[0.75rem] font-semibold text-slate-400 uppercase tracking-widest mb-2";

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16 overflow-hidden bg-[#0a0f1a]">

      {/* bg blobs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(ellipse_50%_40%_at_70%_80%,rgba(245,158,11,0.08),transparent_60%)] pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[440px] bg-[#0f1a2e]/85 backdrop-blur-2xl border border-white/[0.07] rounded-3xl px-10 py-12 shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.05)]"
        style={{ animation: "cardIn 0.4s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 text-2xl rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.35)] mb-5">
            🦎
          </div>
          <h1 className="text-[2rem] font-extrabold tracking-tight text-slate-100 font-serif mb-2">
            Create account
          </h1>
          <p className="text-sm text-slate-400">Join thousands of exotic pet enthusiasts</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="reg-email" className={labelClass}>Email Address</label>
            <input id="reg-email" name="email" type="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com"
              required autoComplete="email" className={inputClass} />
          </div>

          <div>
            <label htmlFor="reg-password" className={labelClass}>Password</label>
            <input id="reg-password" name="password" type="password" value={form.password}
              onChange={handleChange} placeholder="Min. 8 characters"
              required autoComplete="new-password" className={inputClass} />
          </div>

          <div>
            <label htmlFor="reg-confirm" className={labelClass}>Confirm Password</label>
            <input id="reg-confirm" name="confirm" type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password"
              required autoComplete="new-password" className={inputClass} />
          </div>

          <div>
            <label htmlFor="reg-role" className={labelClass}>I am a…</label>
            <select id="reg-role" name="role" value={form.role}
              onChange={handleChange} required
              className={`${inputClass} cursor-pointer appearance-none`}
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#1a2540] text-slate-100">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-4 mt-2 rounded-xl text-base font-bold text-white bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_24px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                Creating account…
              </>
            ) : (
              "Create Account →"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm leading-relaxed" role="alert">
            <span className="flex-shrink-0">⚠️</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mt-5 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm leading-relaxed" role="alert">
            <span className="flex-shrink-0">✅</span>
            {success}
          </div>
        )}

        <p className="mt-7 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-400 font-semibold hover:text-amber-300 transition-colors no-underline">
            Sign in instead
          </Link>
        </p>
      </div>

      <style>{`@keyframes cardIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </div>
  );
}
