import { useState } from "react";
import StepIndicator from "./StepIndicator";
import SpeciesAutocomplete from "./SpeciesAutocomplete";
import UploadImage from "../UploadImage";

const EMPTY_FORM = { title: "", species: "", type: "exotic", price: "" };
const LISTING_URL = import.meta.env.VITE_API_GATEWAY_URL;

export default function CreateListingModal({
  showModal,
  onClose,
  token,
  restrictedSpecies,
  onSuccess,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdListing, setCreatedListing] = useState(null);
  const [createImageError, setCreateImageError] = useState("");

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:bg-emerald-500/[0.05] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-all";
  const labelClass =
    "block text-[0.72rem] font-semibold text-slate-400 uppercase tracking-widest mb-1.5";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    // Check if species is restricted
    if (restrictedSpecies.includes(form.species.toLowerCase())) {
      setFormError(
        "This species is restricted and cannot be listed. Contact support for more information.",
      );
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${LISTING_URL}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          species: form.species,
          type: form.type,
          price: Number(form.price),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.details || data.error || "Failed to create listing",
        );
      setForm(EMPTY_FORM);
      setCreatedListing(data.listing);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCreateImage = async () => {
    setCreateImageError("");
    try {
      const res = await fetch(`${LISTING_URL}/listings/${createdListing.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: createdListing.title,
          species: createdListing.species,
          type: createdListing.type,
          price: createdListing.price,
          removeImage: true,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.details || data.error || "Remove failed");
      setCreatedListing((prev) => ({ ...prev, image_url: null }));
    } catch (err) {
      setCreateImageError(err.message);
    }
  };

  const handleClose = () => {
    setCreatedListing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setCreateImageError("");
    onClose();
    if (onSuccess) onSuccess();
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-[#0f1a2e] border border-white/9 rounded-2xl px-8 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        style={{ animation: "cardIn 0.3s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Step indicator */}
        <StepIndicator currentStep={createdListing ? 2 : 1} />

        {!createdListing ? (
          <>
            <h2 className="text-xl font-bold text-slate-100 mb-6 font-serif">
              New Listing
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Blue-and-Gold Macaw"
                  className={inputClass}
                />
              </div>
              <SpeciesAutocomplete
                name="species"
                value={form.species}
                onChange={handleChange}
                restrictedSpecies={restrictedSpecies}
                required
                placeholder="e.g. Ara ararauna"
                className={inputClass}
                labelClassName={labelClass}
              />
              <div>
                <label className={labelClass}>Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className={`${inputClass} cursor-pointer`}
                >
                  {[
                    ["exotic", "Exotic"],
                    ["livestock", "Livestock"],
                  ].map(([val, label]) => (
                    <option key={val} value={val} className="bg-[#1a2540]">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Price (USD)</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              {formError && (
                <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                  ⚠️ {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3 hover:bg-white/[0.07] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl text-white bg-linear-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />{" "}
                      Saving…
                    </>
                  ) : (
                    "Create Listing →"
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-slate-100 mb-1 font-serif">
              Add a Photo
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              <span className="text-emerald-400 font-medium">
                Listing created!
              </span>{" "}
              Upload an image for{" "}
              <span className="text-slate-200 font-medium">
                {createdListing.title}
              </span>
              , or skip.
            </p>
            {createdListing.image_url && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 mb-4">
                <img
                  src={createdListing.image_url}
                  alt="Uploaded photo"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveCreateImage}
                  title="Remove image"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 text-slate-300 hover:text-red-400 hover:border-red-400/40 flex items-center justify-center text-base leading-none transition-all"
                >
                  ×
                </button>
              </div>
            )}
            {createImageError && (
              <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm mb-4">
                ⚠️ {createImageError}
              </div>
            )}
            <UploadImage
              listingId={createdListing.id}
              onUploaded={(u) => setCreatedListing(u)}
            />
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCreatedListing(null)}
                className="py-2.5 px-4 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3 hover:bg-white/[0.07] transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 text-sm font-semibold rounded-xl text-slate-400 border border-white/10 bg-white/3 hover:bg-white/[0.07] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white bg-linear-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
