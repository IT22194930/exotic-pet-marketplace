export default function LogoutConfirmationModal({ show, onConfirm, onCancel }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-gradient-to-br from-[#0f1a2e] to-[#0a0f1a] border border-amber-500/30 rounded-2xl shadow-[0_20px_60px_rgba(245,158,11,0.3)] max-w-md w-full p-8 animate-scaleIn">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-full bg-amber-500/10 border border-amber-500/30">
          <svg
            className="w-8 h-8 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-center text-white mb-3">
          Logout
        </h3>

        {/* Message */}
        <p className="text-center text-slate-400 mb-8">
          Are you sure you want to logout from your account?
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 text-sm font-semibold text-slate-300 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 text-sm font-bold text-white rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 border border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Logout
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
