export default function ListingDetailModal({ listing, onClose, onPurchase, showPurchaseButton = true }) {
  if (!listing) return null;

  const { id, title, species, type, price, status, image_url, created_at, description } = listing;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="relative max-w-3xl w-full bg-[#0f1a2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Image */}
        {image_url ? (
          <div className="w-full h-80 overflow-hidden bg-linear-to-br from-slate-900 to-slate-800">
            <img
              src={image_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-80 bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            <span className="text-8xl opacity-30">🐾</span>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {/* Status badge */}
          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border ${
                status === "available"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : status === "unavailable"
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : status === "sold"
                  ? "bg-slate-500/15 text-slate-400 border-slate-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              }`}
            >
              {status}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-slate-100 mb-2">{title}</h2>

          {/* Species & Type */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-slate-400">{species}</span>
            {type && (
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-slate-500 capitalize">
                {type}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mb-6">
            <p className="text-4xl font-bold text-emerald-400">
              ${Number(price).toLocaleString()}
            </p>
          </div>

          {/* Description */}
          {description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Description
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>
          )}

          {/* Created date */}
          <div className="mb-6">
            <p className="text-xs text-slate-500">
              Listed on {created_at ? new Date(created_at).toLocaleDateString() : "Unknown"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {showPurchaseButton && status === "available" && onPurchase && (
              <button
                onClick={() => {
                  onPurchase(id);
                  onClose();
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02]"
              >
                Purchase Now
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-white/10 text-slate-300 bg-white/4 hover:bg-white/8 font-semibold text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
}
