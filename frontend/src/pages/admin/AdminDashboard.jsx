import { useState } from "react";
import AdminUsersSection from "./AdminUsersSection";
import AdminAuditSection from "./AdminAuditSection";
import AdminComplianceSection from "./AdminComplianceSection";
import AdminRestrictedSpeciesSection from "./AdminRestrictedSpeciesSection";
import AdminNotifySection from "./AdminNotifySection";

// ── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: "users",
    label: "User Management",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M7.5 6.5C7.5 8.981 9.519 11 12 11s4.5-2.019 4.5-4.5S14.481 2 12 2 7.5 4.019 7.5 6.5zM20 21h1v-1c0-3.859-3.141-7-7-7h-4c-3.86 0-7 3.141-7 7v1h17z" />
      </svg>
    ),
    accent: "purple",
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
    accent: "sky",
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z" />
      </svg>
    ),
    accent: "emerald",
  },
  {
    id: "species",
    label: "Restricted Species",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
      </svg>
    ),
    accent: "amber",
  },
  {
    id: "notify",
    label: "Notify",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>
    ),
    accent: "purple",
  },
];

// ── Accent helpers ───────────────────────────────────────────────────────────
const ACCENT_ACTIVE = {
  purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};
const ACCENT_DOT = {
  purple: "bg-purple-400",
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
};

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("users");
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection);

  const navigate = (id) => {
    setActiveSection(id);
    setMobileOpen(false);
  };

  // ── Sidebar inner nav (desktop, respects collapsed state) ────────────────
  const SidebarNav = () => (
    <nav className="flex-1 py-4 overflow-y-auto">
      <ul className="space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => navigate(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? ACCENT_ACTIVE[item.accent]
                    : "text-slate-400 border-transparent hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
                {isActive && sidebarOpen && (
                  <span
                    className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${ACCENT_DOT[item.accent]}`}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex">
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen bg-[#070d1a] border-r border-white/[0.07] transition-all duration-300 shrink-0 ${
          sidebarOpen ? "w-60" : "w-16"
        }`}
      >
        {/* Logo bar + collapse toggle */}
        <div
          className={`flex items-center border-b border-white/[0.07] h-16 shrink-0 ${
            sidebarOpen ? "px-4 justify-between" : "justify-center"
          }`}
        >
          {sidebarOpen && (
            <span className="text-slate-100 font-bold text-sm tracking-tight font-serif truncate">
              🐾 Admin Panel
            </span>
          )}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
          >
            {sidebarOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            )}
          </button>
        </div>

        <SidebarNav />

        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-white/[0.07]">
            <p className="text-[0.65rem] uppercase tracking-widest text-slate-700">
              Exotic Pet Marketplace
            </p>
          </div>
        )}
      </aside>

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 flex flex-col bg-[#070d1a] border-r border-white/[0.07] transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.07] shrink-0">
          <span className="text-slate-100 font-bold text-sm tracking-tight font-serif">
            🐾 Admin Panel
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Mobile nav — always fully expanded */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      isActive
                        ? ACCENT_ACTIVE[item.accent]
                        : "text-slate-400 border-transparent hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span
                        className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${ACCENT_DOT[item.accent]}`}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.07]">
          <p className="text-[0.65rem] uppercase tracking-widest text-slate-700">
            Exotic Pet Marketplace
          </p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#070d1a]/90 backdrop-blur border-b border-white/[0.07] flex items-center px-4 md:px-6 gap-4">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Admin</span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-100 font-semibold">
              {currentNav?.label}
            </span>
          </div>

          <div className="flex-1" />

          {/* Active section badge */}
          <span
            className={`hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
              ACCENT_ACTIVE[currentNav?.accent || "purple"]
            }`}
          >
            {currentNav?.label}
          </span>
        </header>

        {/* Section content */}
        <div className="flex-1 p-6 md:p-10 max-w-screen-xl mx-auto w-full">
          {activeSection === "users" && <AdminUsersSection />}
          {activeSection === "audit" && <AdminAuditSection />}
          {activeSection === "compliance" && <AdminComplianceSection />}
          {activeSection === "species" && <AdminRestrictedSpeciesSection />}
          {activeSection === "notify" && <AdminNotifySection />}
        </div>
      </main>
    </div>
  );
}
