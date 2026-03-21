export default function ErrorBanner({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="max-w-6xl mx-auto mb-6 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
      ⚠️ {error}
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto underline text-red-400 hover:text-red-200 text-xs"
        >
          Retry
        </button>
      )}
    </div>
  );
}
