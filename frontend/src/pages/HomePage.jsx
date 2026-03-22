import { Link } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

const features = [
  {
    icon: "🦜",
    title: "Rare Exotic Birds",
    desc: "Discover stunning parrots, toucans, and rare avian species from certified breeders worldwide.",
  },
  {
    icon: "🐍",
    title: "Premium Reptiles",
    desc: "From ball pythons to chameleons — find your perfect scaled companion with full health guarantees.",
  },
  {
    icon: "🦊",
    title: "Exotic Mammals",
    desc: "Sugar gliders, fennec foxes, hedgehogs and more, from trusted licensed sellers near you.",
  },
  {
    icon: "🛡️",
    title: "Verified Sellers",
    desc: "Every listing is backed by our rigorous seller verification and animal welfare certification.",
  },
  {
    icon: "🚚",
    title: "Safe Delivery",
    desc: "Stress-free, IATA-compliant live animal transport with real-time tracking to your door.",
  },
  {
    icon: "💬",
    title: "Expert Support",
    desc: "Our team of exotic animal specialists is available 24/7 before and after your purchase.",
  },
];

const stats = [
  { value: "12,000+", label: "Verified Listings" },
  { value: "3,500+", label: "Trusted Sellers" },
  { value: "95%", label: "Happy Buyers" },
  { value: "60+", label: "Countries" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/*  HERO  */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-36 pb-20 overflow-hidden">
        {/* bg gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.18),transparent_70%),radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(245,158,11,0.10),transparent_60%),linear-gradient(180deg,#0a0f1a_0%,#0d1526_100%)] pointer-events-none" />

        {/* animated glowing orbs */}
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-emerald-500/20 blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-100px] right-[10%] w-[340px] h-[340px] rounded-full bg-amber-400/10 blur-[80px] pointer-events-none" />

        {/* grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          }}
        />

        {/* content */}
        <div className="relative z-10 max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
            The Premier Exotic Pet Marketplace
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-[4.2rem] font-extrabold leading-[1.1] tracking-tight text-slate-100 font-serif mb-6">
            Find Your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent">
              Extraordinary
            </span>
            <br />
            Companion Today
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            Connect with verified sellers of rare and exotic pets from around
            the world. Safe, legal, and ethically sourced - your dream companion
            is waiting.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {isAuthenticated() ? (
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold text-white bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_24px_rgba(16,185,129,0.35)] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(16,185,129,0.5)] transition-all duration-200 no-underline"
              >
                Shop →
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold text-white bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_24px_rgba(16,185,129,0.35)] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(16,185,129,0.5)] transition-all duration-200 no-underline"
                >
                  Start Exploring →
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-slate-100 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 transition-all duration-200 no-underline"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/*  STATS STRIP  */}
      <div className="flex flex-wrap justify-center border-t border-white/[0.07] bg-[#0a0f1a]/60 backdrop-blur-sm">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col items-center text-center px-10 md:px-14 py-9 ${
              i < stats.length - 1 ? "border-r border-white/[0.07]" : ""
            }`}
          >
            <span className="text-3xl font-extrabold font-serif bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent">
              {s.value}
            </span>
            <span className="mt-1 text-[0.72rem] font-semibold tracking-widest uppercase text-slate-500">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/*  FEATURES  */}
      <section className="border-t border-white/[0.07] bg-[#0f1726] py-20 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-[#0f1a2e]/80 backdrop-blur border border-white/[0.07] rounded-2xl p-8 hover:-translate-y-2 hover:border-emerald-500/30 hover:shadow-[0_20px_48px_rgba(16,185,129,0.12)] transition-all duration-300"
            >
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
