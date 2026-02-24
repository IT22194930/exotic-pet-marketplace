import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import RegisterPage from "./RegisterPage";
import LoginPage from "./LoginPage";

export default function Router() {
  return (
    <Routes>
      <Route path="/"         element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login"    element={<LoginPage />} />
    </Routes>
  );
}
