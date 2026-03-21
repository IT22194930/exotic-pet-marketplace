export default function DashboardStats({ listings }) {
  const stats = [
    { label: "Total Listings", value: listings.length },
    {
      label: "Available",
      value: listings.filter((l) => l.status === "available").length,
    },
    {
      label: "Sold",
      value: listings.filter((l) => l.status === "sold").length,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl bg-[#0f1a2e]/80 border border-white/[0.07] px-5 py-5 backdrop-blur"
        >
          <p className="text-2xl font-extrabold text-slate-100 font-serif">
            {s.value}
          </p>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-0.5">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
