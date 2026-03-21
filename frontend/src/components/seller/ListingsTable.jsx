import StatusBadge from "./StatusBadge";

export default function ListingsTable({
  listings,
  deleting,
  onEdit,
  onDelete,
  onOpenModal,
}) {
  return (
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
                <td
                  colSpan={8}
                  className="px-6 py-16 text-center text-slate-500"
                >
                  No listings yet.{" "}
                  <button
                    onClick={onOpenModal}
                    className="text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Create your first listing →
                  </button>
                </td>
              </tr>
            )}
            {listings.map((l) => (
              <tr
                key={l.id}
                className="border-b border-white/4 hover:bg-white/2 transition-colors"
              >
                <td className="px-4 py-3">
                  {l.image_url ? (
                    <a href={l.image_url} target="_blank" rel="noreferrer">
                      <img
                        src={l.image_url}
                        alt={l.title}
                        className="w-12 h-12 rounded-lg object-cover border border-white/10 hover:scale-105 transition-transform"
                      />
                    </a>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/4 border border-white/10 flex items-center justify-center text-slate-600 text-lg">
                      🐾
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-100">
                  {l.title}
                </td>
                <td className="px-6 py-4 text-slate-300">{l.species}</td>
                <td className="px-6 py-4 text-slate-400 capitalize">
                  {l.type}
                </td>
                <td className="px-6 py-4 text-emerald-400 font-semibold">
                  ${Number(l.price).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={l.status} />
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {l.created_at
                    ? new Date(l.created_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(l)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-slate-300 bg-white/4 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(l.id)}
                      disabled={deleting === l.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-slate-400 bg-white/4 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
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
  );
}
