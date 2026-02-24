import React from "react";
import { BrowserRouter, Link } from "react-router-dom";
import Router from "./Router";
import "./index.css";

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 bg-[#080c18]/90 backdrop-blur-xl border-b border-white/[0.07] shadow-[0_2px_24px_rgba(0,0,0,0.4)]">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 no-underline select-none group">
        <span className="w-9 h-9 flex items-center justify-center text-lg rounded-[10px] bg-gradient-to-br from-emerald-500 to-amber-400 shadow-[0_4px_12px_rgba(16,185,129,0.4)] flex-shrink-0">
          🦎
        </span>
        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent font-serif">
          ExoticPets
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="px-5 py-2 text-sm font-medium text-slate-300 rounded-lg border border-transparent hover:text-white hover:border-white/10 hover:bg-white/5 transition-all duration-200 no-underline"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="px-5 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-500 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(16,185,129,0.45)] transition-all duration-200 no-underline"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0f1a] text-slate-100 font-sans">
        <Navbar />
        <Router />
      </div>
    </BrowserRouter>
  );
}
