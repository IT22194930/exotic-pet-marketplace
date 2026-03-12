import { useState, useEffect, useCallback } from "react";

const COMPLIANCE_URL = import.meta.env.VITE_API_GATEWAY_URL;

// Safely parse a fetch response (handles HTML error pages)
const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 200) || `HTTP ${res.status}` };
  }
};

export default function AdminRestrictedSpeciesSection() {
  const token = localStorage.getItem("jwt");

  const [species, setSpecies] = useState([]);
  const [spLoading, setSpLoading] = useState(false);
  const [spError, setSpError] = useState("");
  const [addForm, setAddForm] = useState({ species: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ species: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSpecies = useCallback(async () => {
    setSpLoading(true);
    setSpError("");
    try {
      const res = await fetch(
        `${COMPLIANCE_URL}/compliance/restricted-species`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSpecies(data);
    } catch (err) {
      setSpError(err.message);
    } finally {
      setSpLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSpecies();
  }, [fetchSpecies]);

  const handleAddSpecies = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setSpError("");
    try {
      const res = await fetch(
        `${COMPLIANCE_URL}/compliance/restricted-species`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ species: addForm.species }),
        },
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAddForm({ species: "" });
      fetchSpecies();
    } catch (err) {
      setSpError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setEditForm({ species: row.species });
  };

  const handleUpdateSpecies = async () => {
    setEditLoading(true);
    setSpError("");
    try {
      const res = await fetch(
        `${COMPLIANCE_URL}/compliance/restricted-species/${editId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ species: editForm.species }),
        },
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEditId(null);
      fetchSpecies();
    } catch (err) {
      setSpError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSpecies = async (id) => {
    setDeleteLoading(true);
    setSpError("");
    try {
      const res = await fetch(
        `${COMPLIANCE_URL}/compliance/restricted-species/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDeleteId(null);
      fetchSpecies();
    } catch (err) {
      setSpError(err.message);
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">
            Compliance Service
          </p>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">
            Restricted Species
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage the species that require admin approval before sale.
          </p>
        </div>
        <button
          onClick={fetchSpecies}
          disabled={spLoading}
          className="mt-1 px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all disabled:opacity-50"
        >
          {spLoading ? "Loading…" : "↺ Refresh"}
        </button>
      </div>

      {/* ── Error banner ── */}
      {spError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-300 text-sm mb-6">
          <span className="text-base mt-0.5">⚠</span>
          <span className="flex-1">{spError}</span>
          <button
            onClick={() => setSpError("")}
            className="text-red-400 hover:text-red-200 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Add form ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a1628] p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-base">
            +
          </span>
          <h2 className="text-base font-bold text-slate-100 font-serif">
            Add New Species
          </h2>
        </div>
        <form onSubmit={handleAddSpecies} className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
              Species Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={addForm.species}
              onChange={(e) => setAddForm({ species: e.target.value })}
              required
              placeholder="e.g. Komodo Dragon"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={addLoading}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.15)]"
            >
              {addLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span>+</span> Add Species
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Species table ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a1628] p-6">
        {spLoading && species.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-600 text-sm gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-slate-700 border-t-slate-400 animate-spin" />
            Loading…
          </div>
        ) : species.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span className="text-5xl opacity-10">🦎</span>
            <p className="text-slate-500 text-sm font-medium">
              No restricted species yet
            </p>
            <p className="text-slate-700 text-xs leading-relaxed">
              Use the form above to add the first species to the registry.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-700 mb-4">
              {species.length} {species.length === 1 ? "entry" : "entries"}
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600 w-12">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      Species
                    </th>
                    <th className="text-right px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {species.map((row, idx) =>
                    editId === row.id ? (
                      <tr
                        key={row.id}
                        className="border-b border-white/[0.04] bg-amber-500/[0.04]"
                      >
                        <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.species}
                            onChange={(e) =>
                              setEditForm({ species: e.target.value })
                            }
                            autoFocus
                            required
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-amber-500/40 text-slate-200 text-sm focus:outline-none focus:border-amber-500/70 transition-all"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleUpdateSpecies}
                              disabled={editLoading}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
                            >
                              {editLoading ? (
                                <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={row.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium">
                          {row.species}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {deleteId === row.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-red-400">
                                Confirm?
                              </span>
                              <button
                                onClick={() => handleDeleteSpecies(row.id)}
                                disabled={deleteLoading}
                                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1"
                              >
                                {deleteLoading ? (
                                  <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                                ) : (
                                  "Yes, Delete"
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(row)}
                                className="px-3 py-1.5 rounded-lg border border-amber-500/25 text-amber-400 hover:bg-amber-500/10 font-semibold text-xs transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteId(row.id)}
                                className="px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10 font-semibold text-xs transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
