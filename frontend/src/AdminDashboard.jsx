import React, { useState } from "react";

const ROLE_COLORS = {
  admin:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  seller: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  buyer:  "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

const STATUS_COLORS = {
  Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Banned: "bg-red-500/15 text-red-400 border-red-500/30",
};

const INITIAL_USERS = [
  { id: 1, email: "alice@example.com",   role: "buyer",  status: "Active", joined: "2025-01-10" },
  { id: 2, email: "bob@example.com",     role: "seller", status: "Active", joined: "2025-02-14" },
  { id: 3, email: "charlie@example.com", role: "seller", status: "Banned", joined: "2025-03-05" },
  { id: 4, email: "diana@example.com",   role: "buyer",  status: "Active", joined: "2025-04-20" },
  { id: 5, email: "evan@example.com",    role: "admin",  status: "Active", joined: "2024-12-01" },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const toggleBan = (id) =>
    setUsers(users.map((u) => u.id === id ? { ...u, status: u.status === "Active" ? "Banned" : "Active" } : u));

  const changeRole = (id, role) =>
    setUsers(users.map((u) => u.id === id ? { ...u, role } : u));

  const filtered = users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-16 px-6 md:px-10">

      {/* Page header */}
      <div className="max-w-6xl mx-auto mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-1">Admin Dashboard</p>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-serif">User Management</h1>
        <p className="text-slate-400 text-sm mt-1">Manage all platform users, roles, and account status.</p>
      </div>

      {/* Stats row */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users",  value: users.length },
          { label: "Admins",       value: users.filter(u=>u.role==="admin").length },
          { label: "Sellers",      value: users.filter(u=>u.role==="seller").length },
          { label: "Active",       value: users.filter(u=>u.status==="Active").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#0f1a2e]/80 border border-white/[0.07] px-5 py-5 backdrop-blur">
            <p className="text-2xl font-extrabold text-slate-100 font-serif">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.15)] transition-all"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
        >
          <option value="all"    className="bg-[#1a2540]">All Roles</option>
          <option value="buyer"  className="bg-[#1a2540]">Buyers</option>
          <option value="seller" className="bg-[#1a2540]">Sellers</option>
          <option value="admin"  className="bg-[#1a2540]">Admins</option>
        </select>
      </div>

      {/* Table */}
      <div className="max-w-6xl mx-auto rounded-2xl border border-white/[0.07] bg-[#0f1a2e]/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-[0.72rem] uppercase tracking-widest text-slate-500">
                <th className="text-left px-6 py-4">Email</th>
                <th className="text-left px-6 py-4">Role</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Joined</th>
                <th className="text-right px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No users match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-slate-100 font-medium">{u.email}</td>

                  {/* Role inline select */}
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer bg-transparent focus:outline-none ${ROLE_COLORS[u.role]}`}
                    >
                      <option value="buyer"  className="bg-[#1a2540] text-slate-100">buyer</option>
                      <option value="seller" className="bg-[#1a2540] text-slate-100">seller</option>
                      <option value="admin"  className="bg-[#1a2540] text-slate-100">admin</option>
                    </select>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[u.status]}`}>
                      {u.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-500">{u.joined}</td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleBan(u.id)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        u.status === "Active"
                          ? "text-red-400 border-red-500/20 bg-red-500/[0.07] hover:bg-red-500/15"
                          : "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.07] hover:bg-emerald-500/15"
                      }`}
                    >
                      {u.status === "Active" ? "Ban" : "Unban"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
