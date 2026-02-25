import React, { useState, useEffect, useCallback } from "react";
import { getAuthUser } from "./utils/auth";
import PetCard from "./PetCard";

const LISTING_URL  = import.meta.env.VITE_LISTING_SERVICE_URL;
const IDENTITY_URL = import.meta.env.VITE_IDENTITY_SERVICE_URL;

const STATUS_COLORS = {
  available: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sold:      "bg-slate-500/15 text-slate-400 border-slate-500/30",
  pending:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const EMPTY_FORM = { title: "", species: "", type: "exotic", price: "" };

export default function SellerDashboard() {
  const [listings, setListings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [apiError, setApiError]       = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [view, setView]               = useState("table");
  const [verified, setVerified]       = useState(null);   // null = loading, true/false

  const me = getAuthUser();
  const token = localStorage.getItem("jwt");

  // ── Check seller verification status ──
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const res = await fetch(`${IDENTITY_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVerified(!!data.sellerVerified);
      } catch {
        setVerified(false);
      }
    };
    checkVerification();
  }, []);

  /* ── Fetch all listings, then filter to this seller's ── */
  const loadListings = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res  = await fetch(`${LISTING_URL}/listings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch listings");
      // Filter to only this seller's listings
      const mine = (data.listings || []).filter((l) => l.seller_id === me?.id);
      setListings(mine);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, [me?.id]);

  useEffect(() => { loadListings(); }, [loadListings]);

  /* ── Create listing ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      const res  = await fetch(`${LISTING_URL}/listings`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:   form.title,
          species: form.species,
          type:    form.type,
          price:   Number(form.price),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to create listing");
      setFormSuccess("Listing created!");
      setForm(EMPTY_FORM);
      await loadListings();
      setTimeout(() => { setShowModal(false); setFormSuccess(""); }, 1000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openModal  = () => { setForm(EMPTY_FORM); setFormError(""); setFormSuccess(""); setShowModal(true); };
  const closeModal = () => setShowModal(false);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:bg-emerald-500/[0.05] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-all";
  const labelClass = "block text-[0.72rem] font-semibold text-slate-400 uppercase tracking-widest mb-1.5";

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-16 px-6 md:px-10">

      {/* Page header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">Seller Dashboard</p>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">Listing Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            Logged in as <span className="text-slate-200 font-medium">{me?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-1 gap-1">
            <button
              onClick={() => setView("table")}
              title="Detail view"
              className={`p-2 rounded-md transition-all duration-200 ${
                view === "table"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {/* List icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              onClick={() => setView("grid")}
              title="Grid view"
              className={`p-2 rounded-md transition-all duration-200 ${
                view === "grid"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {/* Grid icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>

          <button
            onClick={openModal}
            disabled={verified === false}
            title={verified === false ? "Your account must be verified first" : ""}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(16,185,129,0.45)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            + New Listing
          </button>
        </div>
      </div>

      {/* Verification banner */}
      {verified === false && (
        <div className="max-w-6xl mx-auto mb-6 flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="text-amber-200 font-semibold text-sm">Account Pending Verification</p>
            <p className="text-amber-400/70 text-xs mt-0.5">An admin must verify your seller account before you can create listings. You can view your existing listings below.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Listings", value: listings.length },
          { label: "Available",      value: listings.filter(l => l.status === "available").length },
          { label: "Sold",           value: listings.filter(l => l.status === "sold").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#0f1a2e]/80 border border-white/[0.07] px-5 py-5 backdrop-blur">
            <p className="text-2xl font-extrabold text-slate-100 font-serif">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {apiError && (
        <div className="max-w-6xl mx-auto mb-6 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          ⚠️ {apiError}
          <button onClick={loadListings} className="ml-auto underline text-red-400 hover:text-red-200 text-xs">Retry</button>
        </div>
      )}

      {/* Listings — Table or Grid */}
      {loading ? (
        <div className="max-w-6xl mx-auto flex items-center justify-center py-24 text-slate-400 gap-3">
          <span className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin inline-block" />
          Loading listings…
        </div>
      ) : view === "grid" ? (
        /* ── Grid view ── */
        <div className="max-w-6xl mx-auto">
          {listings.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              No listings yet.{" "}
              {verified === false
                ? <span className="text-amber-400">Your account must be verified by an admin first.</span>
                : <button onClick={openModal} className="text-emerald-400 hover:text-emerald-300 underline">Create your first listing →</button>
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((l) => <PetCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      ) : (
        /* ── Table / Detail view ── */
        <div className="max-w-6xl mx-auto rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[0.72rem] uppercase tracking-widest text-slate-500">
                  <th className="text-left px-6 py-4">Image</th>
                  <th className="text-left px-6 py-4">Title</th>
                  <th className="text-left px-6 py-4">Species</th>
                  <th className="text-left px-6 py-4">Type</th>
                  <th className="text-left px-6 py-4">Price</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      No listings yet.{" "}
                      {verified === false
                        ? <span className="text-amber-400">Your account must be verified by an admin first.</span>
                        : <button onClick={openModal} className="text-emerald-400 hover:text-emerald-300 underline">Create your first listing →</button>
                      }
                    </td>
                  </tr>
                )}
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      {l.image_url ? (
                        <a href={l.image_url} target="_blank" rel="noreferrer">
                          <img src={l.image_url} alt={l.title}
                            className="w-12 h-12 rounded-lg object-cover border border-white/10 hover:scale-105 transition-transform" />
                        </a>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-600 text-lg">🐾</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-100">{l.title}</td>
                    <td className="px-6 py-4 text-slate-300">{l.species}</td>
                    <td className="px-6 py-4 text-slate-400 capitalize">{l.type}</td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">${Number(l.price).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[l.status] ?? STATUS_COLORS.available}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md bg-[#0f1a2e] border border-white/[0.09] rounded-2xl px-8 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
            style={{ animation: "cardIn 0.3s cubic-bezier(0.22,1,0.36,1)" }}
          >
            <h2 className="text-xl font-bold text-slate-100 mb-6 font-serif">New Listing</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input name="title" value={form.title} onChange={handleChange} required
                  placeholder="e.g. Blue-and-Gold Macaw" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Species</label>
                <input name="species" value={form.species} onChange={handleChange} required
                  placeholder="e.g. Ara ararauna" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select name="type" value={form.type} onChange={handleChange} className={`${inputClass} cursor-pointer`}>
                  {[["exotic","Exotic"],["livestock","Livestock"]].map(([val, label]) => (
                    <option key={val} value={val} className="bg-[#1a2540]">{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Price (USD)</label>
                <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required
                  placeholder="0.00" className={inputClass} />
              </div>

              {formError && (
                <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                  ⚠️ {formError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm">
                  ✅ {formSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all">
                  {saving
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
                    : "Create Listing"
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes cardIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </div>
  );
}
