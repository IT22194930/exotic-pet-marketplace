import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./HomePage";
import RegisterPage from "./RegisterPage";
import LoginPage from "./LoginPage";
import ShopPage from "./ShopPage";
import BuyerDashboard from "./BuyerDashboard";
import SellerDashboard from "./SellerDashboard";
import AdminDashboard from "./AdminDashboard";

export default function Router() {
  return (
    <Routes>
      <Route path="/"                 element={<HomePage />} />
      <Route path="/shop"             element={<ShopPage />} />
      <Route path="/register"         element={<RegisterPage />} />
      <Route path="/login"            element={<LoginPage />} />
      <Route path="/buyer/dashboard"  element={<BuyerDashboard />} />
      <Route path="/orders"           element={<Navigate to="/buyer/dashboard" replace />} />
      <Route path="/seller/dashboard" element={<SellerDashboard />} />
      <Route path="/admin/dashboard"  element={<AdminDashboard />} />
    </Routes>
  );
}
