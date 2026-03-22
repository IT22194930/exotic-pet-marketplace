import React from "react";

const STATUS_COLORS = {
  available: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  unavailable: "bg-red-500/15 text-red-400 border-red-500/30",
  sold:      "bg-slate-500/15  text-slate-400  border-slate-500/30",
  pending:   "bg-amber-500/15  text-amber-400  border-amber-500/30",
  cancelled: "bg-slate-500/15  text-slate-400  border-slate-500/30",
};

export default function PetCard({ listing, onPurchase, onClick }) {
  const { id, title, species, type, price, status, image_url, created_at } = listing;

  const [purchasing, setPurchasing] = React.useState(false);

  const handleBuyClick = async (e) => {
    e.stopPropagation(); // Prevent card click when purchasing
    if (!onPurchase) return;
    setPurchasing(true);
    await onPurchase(id);
    setPurchasing(false);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(listing);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group flex flex-col bg-[#0f1a2e]/80 backdrop-blur border border-white/[0.07] rounded-2xl overflow-hidden hover:-translate-y-1.5 hover:border-emerald-500/30 hover:shadow-[0_20px_48px_rgba(16,185,129,0.12)] transition-all duration-300 cursor-pointer"
    >

      {/* Image */}
      <div className="relative w-full h-44 bg-[#0a1120] overflow-hidden shrink-0">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-700">
            <span className="text-4xl">🐾</span>
            <span className="text-xs font-medium tracking-wide uppercase">No Image</span>
          </div>
        )}

        {/* Status badge overlaid on image */}
        <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[status] ?? STATUS_COLORS.available}`}>
          {status}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-base font-bold text-slate-100 mb-1 leading-snug line-clamp-2">
          {title}
        </h3>

        <p className="text-xs text-slate-500 mb-4">
          {species}
          {type && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 border border-white/6 capitalize">
              {type}
            </span>
          )}
        </p>

        {/* Footer row */}
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <span className="text-lg font-extrabold text-emerald-400 font-serif block leading-none">
              ${Number(price).toLocaleString()}
            </span>
            {created_at && (
              <span className="text-[0.65rem] text-slate-500 font-medium">
                {new Date(created_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {onPurchase && status === "available" && (
            <button
              onClick={handleBuyClick}
              disabled={purchasing}
              className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-linear-to-br from-emerald-600 to-emerald-500 border border-emerald-500/30 hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
            >
              {purchasing ? "Processing…" : "Purchase"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
