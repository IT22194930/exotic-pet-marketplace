import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage        from "./pages/HomePage";
import RegisterPage    from "./pages/RegisterPage";
import LoginPage       from "./pages/LoginPage";
import ShopPage        from "./pages/ShopPage";
import PaymentPage     from "./pages/PaymentPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentFailedPage  from "./pages/PaymentFailedPage";
import BuyerDashboard  from "./pages/buyer/BuyerDashboard";
import SellerDashboard from "./pages/seller/SellerDashboard";
import AdminDashboard  from "./pages/admin/AdminDashboard";

export default function Router() {
  return (
    <Routes>
      <Route path="/"                 element={<HomePage />} />
      <Route path="/shop"             element={<ShopPage />} />
      <Route path="/register"         element={<RegisterPage />} />
      <Route path="/login"            element={<LoginPage />} />
      <Route path="/buyer/dashboard"  element={<BuyerDashboard />} />
      <Route path="/orders"           element={<Navigate to="/buyer/dashboard" replace />} />
      <Route path="/payment/:orderId" element={<PaymentPage />} />
      <Route path="/payment/success"  element={<PaymentSuccessPage />} />
      <Route path="/payment/failed"   element={<PaymentFailedPage />} />
      <Route path="/seller/dashboard" element={<SellerDashboard />} />
      <Route path="/admin/dashboard"  element={<AdminDashboard />} />
    </Routes>
  );
}
