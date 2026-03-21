export default function DashboardHeader({
  userEmail,
  view,
  onViewChange,
  onNewListing,
}) {
  return (
    <div className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">
          Seller Dashboard
        </p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">
          Listing Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Logged in as{" "}
          <span className="text-slate-200 font-medium">{userEmail}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-white/10 bg-white/3 gap-1">
          <button
            onClick={() => onViewChange("table")}
            title="Detail view"
            className={`p-2 rounded-md transition-all duration-200 ${
              view === "table"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {/* List icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            onClick={() => onViewChange("grid")}
            title="Grid view"
            className={`p-2 rounded-md transition-all duration-200 ${
              view === "grid"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {/* Grid icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
        </div>

        <button
          onClick={onNewListing}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-linear-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(16,185,129,0.45)] transition-all duration-200"
        >
          + New Listing
        </button>
      </div>
    </div>
  );
}
