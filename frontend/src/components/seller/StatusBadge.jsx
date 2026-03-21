const STATUS_COLORS = {
  available: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sold: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[status] ?? STATUS_COLORS.available}`}
    >
      {status}
    </span>
  );
}
