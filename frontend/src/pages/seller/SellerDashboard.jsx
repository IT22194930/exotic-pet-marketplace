import { useState, useEffect, useCallback } from "react";
import { getAuthUser } from "../../utils/auth";
import PetCard from "../../components/PetCard";
import UploadImage from "../../components/UploadImage";

const LISTING_URL = import.meta.env.VITE_API_GATEWAY_URL;

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
  const [view, setView]               = useState("table");

  // Create modal
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");
  const [createdListing, setCreatedListing] = useState(null);
  const [createImageError, setCreateImageError] = useState("");

  // Edit modal
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editListing, setEditListing]       = useState(null);
  const [editForm, setEditForm]             = useState(EMPTY_FORM);
  const [editSaving, setEditSaving]         = useState(false);
  const [editError, setEditError]           = useState("");
  const [editStep, setEditStep]             = useState(1);

  // Delete
  const [deleting, setDeleting] = useState(null);

  // Restricted species
  const [restrictedSpecies, setRestrictedSpecies] = useState([]);
  const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editShowSuggestions, setEditShowSuggestions] = useState(false);
  const [editSpeciesSuggestions, setEditSpeciesSuggestions] = useState([]);

  const me    = getAuthUser();
  const token = localStorage.getItem("jwt");

  /* ── Load seller's own listings ── */
  const loadListings = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res  = await fetch(`${LISTING_URL}/listings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch listings");
      setListings(data.listings || []);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadListings(); }, [loadListings]);

  /* ── Fetch restricted species for validation ── */
  const loadRestrictedSpecies = useCallback(async () => {
    try {
      const res = await fetch(`${LISTING_URL}/compliance/restricted-species`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRestrictedSpecies(data.map(s => s.species?.toLowerCase() || ''));
      }
    } catch (err) {
      console.error("Failed to fetch restricted species:", err.message);
    }
  }, [token]);

  useEffect(() => { loadRestrictedSpecies(); }, [loadRestrictedSpecies]);

  /* ── Filter species suggestions as user types ── */
  const filterSpeciesSuggestions = (input) => {
    if (!input.trim()) return [];
    const lower = input.toLowerCase();
    return restrictedSpecies.filter(s => s.includes(lower)).slice(0, 5);
  };

  /* ── Create listing (step 1) ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    // Check if species is restricted
    if (restrictedSpecies.includes(form.species.toLowerCase())) {
      setFormError("This species is restricted and cannot be listed. Contact support for more information.");
      setSaving(false);
      return;
    }

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
      setForm(EMPTY_FORM);
      setCreatedListing(data.listing);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openModal  = () => { setForm(EMPTY_FORM); setFormError(""); setCreatedListing(null); setShowModal(true); };
  const closeModal = async () => { setCreatedListing(null); setShowModal(false); setShowSuggestions(false); await loadListings(); };
  const handleChange = (e) => {
    const newForm = { ...form, [e.target.name]: e.target.value };
    setForm(newForm);
    if (e.target.name === "species") {
      const suggestions = filterSpeciesSuggestions(e.target.value);
      setSpeciesSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }
  };

  /* ── Edit listing ── */
  const openEditModal = (listing) => {
    setEditListing(listing);
    setEditForm({ title: listing.title, species: listing.species, type: listing.type, price: listing.price });
    setEditError("");
    setEditStep(1);
    setShowEditModal(true);
  };
  const closeEditModal = async () => {
    setShowEditModal(false);
    setEditListing(null);
    setEditStep(1);
    setEditShowSuggestions(false);
    await loadListings();
  };
  const handleEditChange = (e) => {
    const newEditForm = { ...editForm, [e.target.name]: e.target.value };
    setEditForm(newEditForm);
    if (e.target.name === "species") {
      const suggestions = filterSpeciesSuggestions(e.target.value);
      setEditSpeciesSuggestions(suggestions);
      setEditShowSuggestions(suggestions.length > 0);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError("");

    // Check if species is restricted
    if (restrictedSpecies.includes(editForm.species.toLowerCase())) {
      setEditError("This species is restricted and cannot be listed. Contact support for more information.");
      setEditSaving(false);
      return;
    }

    try {
      const res = await fetch(`${LISTING_URL}/listings/${editListing.id}`, {
        method: "PUT",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:   editForm.title,
          species: editForm.species,
          type:    editForm.type,
          price:   Number(editForm.price),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Update failed");
      setEditListing(data.listing || { ...editListing, ...editForm });
      setEditStep(2);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleRemoveCreateImage = async () => {
    setCreateImageError("");
    try {
      const res = await fetch(`${LISTING_URL}/listings/${createdListing.id}`, {
        method: "PUT",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:       createdListing.title,
          species:     createdListing.species,
          type:        createdListing.type,
          price:       createdListing.price,
          removeImage: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Remove failed");
      setCreatedListing((prev) => ({ ...prev, image_url: null }));
    } catch (err) {
      setCreateImageError(err.message);
    }
  };

  const handleRemoveEditImage = async () => {
    setEditError("");
    try {
      const res = await fetch(`${LISTING_URL}/listings/${editListing.id}`, {
        method: "PUT",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:       editListing.title,
          species:     editListing.species,
          type:        editListing.type,
          price:       editListing.price,
          removeImage: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Remove failed");
      setEditListing((prev) => ({ ...prev, image_url: null }));
    } catch (err) {
      setEditError(err.message);
    }
  };

  /* ── Delete listing ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    setApiError("");
    try {
      const res = await fetch(`${LISTING_URL}/listings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Delete failed");
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setApiError(err.message);
    } finally {
      setDeleting(null);
    }
  };

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
          <div className="flex items-center rounded-lg border border-white/10 bg-white/3gap-1">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-linear-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(16,185,129,0.45)] transition-all duration-200"
          >
            + New Listing
          </button>
        </div>
      </div>

      {/* Seller-not-verified warning */}
      {me && me.sellerVerified === false && (
        <div className="max-w-6xl mx-auto mb-6 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
          🔒 Your seller account is <strong className="mx-1">pending verification</strong> by an admin. You won’t be able to create new listings until it’s approved.
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
              <button onClick={openModal} className="text-emerald-400 hover:text-emerald-300 underline">Create your first listing →</button>
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
                  <th className="text-left px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                      No listings yet.{" "}
                      <button onClick={openModal} className="text-emerald-400 hover:text-emerald-300 underline">
                        Create your first listing →
                      </button>
                    </td>
                  </tr>
                )}
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      {l.image_url ? (
                        <a href={l.image_url} target="_blank" rel="noreferrer">
                          <img src={l.image_url} alt={l.title}
                            className="w-12 h-12 rounded-lg object-cover border border-white/10 hover:scale-105 transition-transform" />
                        </a>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/4 border border-white/10 flex items-center justify-center text-slate-600 text-lg">🐾</div>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(l)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-slate-300 bg-white/4 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(l.id)} disabled={deleting === l.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-slate-400 bg-white/4 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          {deleting === l.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create modal (2-step) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f1a2e] border border-white/9 rounded-2xl px-8 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
            style={{ animation: "cardIn 0.3s cubic-bezier(0.22,1,0.36,1)" }}>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${createdListing ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-emerald-500 border-emerald-400 text-white"}`}>1</div>
              <div className={`flex-1 h-px ${createdListing ? "bg-emerald-500/40" : "bg-white/10"}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${createdListing ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white/4 border-white/10 text-slate-500"}`}>2</div>
            </div>

            {!createdListing ? (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-6 font-serif">New Listing</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input name="title" value={form.title} onChange={handleChange} required
                      placeholder="e.g. Blue-and-Gold Macaw" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Species</label>
                    <div className="relative">
                      <input name="species" value={form.species} onChange={handleChange} required
                        placeholder="e.g. Ara ararauna" className={inputClass}
                        onFocus={() => {
                          const suggestions = filterSpeciesSuggestions(form.species);
                          setSpeciesSuggestions(suggestions);
                          setShowSuggestions(suggestions.length > 0);
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      />
                      {showSuggestions && speciesSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2f45] border border-white/10 rounded-lg shadow-lg z-10 overflow-hidden">
                          {speciesSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, species: suggestion });
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors border-b border-white/5 last:border-b-0"
                            >
                              🔒 {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal}
                      className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3r:bg-white/[0.07] transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl text-white bg-linear-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all">
                      {saving
                        ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
                        : "Create Listing →"
                      }
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-1 font-serif">Add a Photo</h2>
                <p className="text-sm text-slate-400 mb-5">
                  <span className="text-emerald-400 font-medium">Listing created!</span> Upload an image for{" "}
                  <span className="text-slate-200 font-medium">{createdListing.title}</span>, or skip.
                </p>
                {createdListing.image_url && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 mb-4">
                    <img src={createdListing.image_url} alt="Uploaded photo" className="w-full h-full object-cover" />
                    <button type="button" onClick={handleRemoveCreateImage} title="Remove image"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 text-slate-300 hover:text-red-400 hover:border-red-400/40 flex items-center justify-center text-base leading-none transition-all">
                      ×
                    </button>
                  </div>
                )}
                {createImageError && (
                  <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm mb-4">
                    ⚠️ {createImageError}
                  </div>
                )}
                <UploadImage listingId={createdListing.id} onUploaded={(u) => setCreatedListing(u)} />
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setCreatedListing(null)}
                    className="py-2.5 px-4 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3 hover:bg-white/[0.07] transition-all">
                    Back
                  </button>
                  <button type="button" onClick={closeModal}
                    className="py-2.5 px-4 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3 hover:bg-white/[0.07] transition-all">
                    Cancel
                  </button>
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white bg-linear-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all">
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit modal (2-step) ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f1a2e] border border-white/9ded-2xl px-8 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
            style={{ animation: "cardIn 0.3s cubic-bezier(0.22,1,0.36,1)" }}>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${editStep === 2 ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-emerald-500 border-emerald-400 text-white"}`}>1</div>
              <div className={`flex-1 h-px ${editStep === 2 ? "bg-emerald-500/40" : "bg-white/10"}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${editStep === 2 ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white/4 border-white/10 text-slate-500"}`}>2</div>
            </div>

            {editStep === 1 ? (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-6 font-serif">Edit Listing</h2>
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input name="title" value={editForm.title} onChange={handleEditChange} required
                      placeholder="e.g. Blue-and-Gold Macaw" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Species</label>
                    <div className="relative">
                      <input name="species" value={editForm.species} onChange={handleEditChange} required
                        placeholder="e.g. Ara ararauna" className={inputClass}
                        onFocus={() => {
                          const suggestions = filterSpeciesSuggestions(editForm.species);
                          setEditSpeciesSuggestions(suggestions);
                          setEditShowSuggestions(suggestions.length > 0);
                        }}
                        onBlur={() => setTimeout(() => setEditShowSuggestions(false), 150)}
                      />
                      {editShowSuggestions && editSpeciesSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2f45] border border-white/10 rounded-lg shadow-lg z-10 overflow-hidden">
                          {editSpeciesSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setEditForm({ ...editForm, species: suggestion });
                                setEditShowSuggestions(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors border-b border-white/5 last:border-b-0"
                            >
                              🔒 {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select name="type" value={editForm.type} onChange={handleEditChange} className={`${inputClass} cursor-pointer`}>
                      {[["exotic","Exotic"],["livestock","Livestock"]].map(([val, label]) => (
                        <option key={val} value={val} className="bg-[#1a2540]">{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Price (USD)</label>
                    <input name="price" type="number" min="0" step="0.01" value={editForm.price} onChange={handleEditChange} required
                      placeholder="0.00" className={inputClass} />
                  </div>
                  {editError && (
                    <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                      ⚠️ {editError}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeEditModal}
                      className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3r:bg-white/[0.07] transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={editSaving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl text-white bg-linear-to-brrom-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all">
                      {editSaving
                        ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
                        : "Save & Continue"
                      }
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-100 mb-1 font-serif">Update Photo</h2>
                <p className="text-sm text-slate-400 mb-5">
                  <span className="text-emerald-400 font-medium">Details saved!</span> Upload a new photo for{" "}
                  <span className="text-slate-200 font-medium">{editListing?.title}</span>, or skip.
                </p>
                {editListing?.image_url && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 mb-4">
                    <img src={editListing.image_url} alt="Current photo" className="w-full h-full object-cover" />
                    <button type="button" onClick={handleRemoveEditImage} title="Remove image"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 text-slate-300 hover:text-red-400 hover:border-red-400/40 flex items-center justify-center text-base leading-none transition-all">
                      ×
                    </button>
                  </div>
                )}
                {editError && (
                  <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm mb-4">
                    ⚠️ {editError}
                  </div>
                )}
                <UploadImage listingId={editListing?.id} onUploaded={(u) => setEditListing(u)} />
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setEditStep(1)}
                    className="py-2.5 px-4 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3 hover:bg-white/[0.07] transition-all">
                    Back
                  </button>
                  <button type="button" onClick={closeEditModal}
                    className="py-2.5 px-4 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3 hover:bg-white/[0.07] transition-all">
                    Cancel
                  </button>
                  <button type="button" onClick={closeEditModal}
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white bg-linear-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all">
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes cardIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </div>
  );
}
