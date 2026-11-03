
import React from "react";
import { createRoot } from "react-dom/client";

import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";

import Header from "./components/Header";
import Home from "./pages/Home";
import Search from "./pages/Search";
import ListingDetails from "./pages/ListingDetails";
import Auth from "./pages/Auth";
import Wishlist from "./pages/Wishlist";
import Reservations from "./pages/Reservations";
import ProtectedRoute from "./components/ProtectedRoute";
import Checkout from "./pages/Checkout";
import Footer from "./components/Footer";

import "./styles.css";

function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Header />

          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/search" element={<Search />} />

            <Route
              path="/listings/:id"
              element={<ListingDetails />}
            />

            <Route
              path="/login"
              element={<Auth mode="login" />}
            />

            <Route
              path="/register"
              element={<Auth mode="register" />}
            />

            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reservations"
              element={
                <ProtectedRoute>
                  <Reservations />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <main className="page-shell">
                  <h1>Page not found</h1>
                </main>
              }
            />

            <Route
              path="/checkout/:id"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
          </Routes>

          <Footer/>
        </BrowserRouter>
      </WishlistProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
