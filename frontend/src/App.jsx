import React from "react";
import { BrowserRouter } from "react-router-dom";
import Navbar from "./Navbar";
import Router from "./Router";
import "./index.css";

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
