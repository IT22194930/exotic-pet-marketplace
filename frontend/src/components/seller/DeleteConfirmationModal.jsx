export default function DeleteConfirmationModal({
  show,
  onConfirm,
  onCancel,
  listingTitle,
  isDeleting,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-gradient-to-br from-[#0f1a2e] to-[#0a0f1a] border border-red-500/30 rounded-2xl shadow-[0_20px_60px_rgba(239,68,68,0.3)] max-w-md w-full p-8 animate-scaleIn">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/30">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-center text-white mb-3">
          Delete Listing?
        </h3>

        {/* Message */}
        <p className="text-center text-slate-400 mb-2">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-200">
            {listingTitle || "this listing"}
          </span>
          ?
        </p>
        <p className="text-center text-sm text-red-400 mb-8">
          This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 text-sm font-semibold text-slate-300 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 text-sm font-bold text-white rounded-lg bg-gradient-to-br from-red-600 to-red-500 border border-red-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_28px_rgba(239,68,68,0.5)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Deleting...
              </span>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
