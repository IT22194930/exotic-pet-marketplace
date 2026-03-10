import { useState, useEffect } from "react";
import PetCard from "../components/PetCard";

const LISTING_URL = import.meta.env.VITE_API_GATEWAY_URL;

const ORDER_URL   = import.meta.env.VITE_API_GATEWAY_URL;

const TYPE_OPTIONS = ["All", "exotic", "livestock"];

export default function ShopPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sort, setSort]         = useState("newest");

  // Purchase state
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res  = await fetch(`${LISTING_URL}/listings`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch listings");
        setListings(data.listings || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePurchase = async (listingId) => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      setToast({ type: "error", message: "Please sign in to make a purchase." });
      return;
    }

    try {
      const res = await fetch(`${ORDER_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ listingId })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Purchase failed");
      }

      setToast({ type: "success", message: `Purchase successful! Order status: ${data.order?.status}` });
      
      // Update local listing status so the button disappears
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: "pending" } : l));

    } catch (err) {
      setToast({ type: "error", message: err.message });
    }

    // Auto-hide toast after 4s
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Filter + sort ── */
  const filtered = listings
    .filter((l) => {
      const matchType   = typeFilter === "All" || l.type === typeFilter;
      const matchSearch = !search ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.species.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    })
    .sort((a, b) => {
      if (sort === "newest")      return new Date(b.created_at) - new Date(a.created_at);
      if (sort === "oldest")      return new Date(a.created_at) - new Date(b.created_at);
      if (sort === "price_asc")   return a.price - b.price;
      if (sort === "price_desc")  return b.price - a.price;
      return 0;
    });

  const inputBase = "px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)] transition-all";

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-20 px-6 md:px-10">

      {/* ── Page header ── */}
      <div className="max-w-7xl mx-auto mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">Browse</p>
        <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight font-serif mb-2">
          Exotic Pet Shop
        </h1>
        <p className="text-slate-400 text-sm">
          {loading ? "Loading listings…" : `${filtered.length} listing${filtered.length !== 1 ? "s" : ""} available`}
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or species…"
          className={`flex-1 ${inputBase}`}
        />

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={`${inputBase} cursor-pointer capitalize`}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t} className="bg-[#1a2540] capitalize">{t}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={`${inputBase} cursor-pointer`}
        >
          <option value="newest"     className="bg-[#1a2540]">Newest First</option>
          <option value="oldest"     className="bg-[#1a2540]">Oldest First</option>
          <option value="price_asc"  className="bg-[#1a2540]">Price: Low → High</option>
          <option value="price_desc" className="bg-[#1a2540]">Price: High → Low</option>
        </select>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-slate-400 gap-3">
          <span className="w-6 h-6 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin" />
          Loading listings…
        </div>
      ) : error ? (
        <div className="max-w-7xl mx-auto flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-3">
          <span className="text-5xl">🔍</span>
          <p className="text-base font-medium">No listings match your search.</p>
          <button
            onClick={() => { setSearch(""); setTypeFilter("All"); }}
            className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((l) => (
            <PetCard key={l.id} listing={l} onPurchase={handlePurchase} />
          ))}
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-bounce-short">
          <div className={`px-5 py-4 rounded-2xl border shadow-[0_12px_48px_rgba(0,0,0,0.5)] flex items-center gap-3 ${
            toast.type === "success" 
              ? "bg-[#064e3b]/90 border-emerald-500/30 text-emerald-100 backdrop-blur" 
              : "bg-[#7f1d1d]/90 border-red-500/30 text-red-100 backdrop-blur"
          }`}>
            <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-short {
          0% { transform: translateY(20px); opacity: 0; }
          40% { transform: translateY(-4px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-bounce-short { animation: bounce-short 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
}
