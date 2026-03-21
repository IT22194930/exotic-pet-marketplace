import { useState, useEffect, useCallback } from "react";
import { getAuthUser } from "../../utils/auth";
import PetCard from "../../components/PetCard";
import DashboardHeader from "../../components/seller/DashboardHeader";
import DashboardStats from "../../components/seller/DashboardStats";
import VerificationWarning from "../../components/seller/VerificationWarning";
import ErrorBanner from "../../components/seller/ErrorBanner";
import ListingsTable from "../../components/seller/ListingsTable";
import CreateListingModal from "../../components/seller/CreateListingModal";
import EditListingModal from "../../components/seller/EditListingModal";

const LISTING_URL = import.meta.env.VITE_API_GATEWAY_URL;

export default function SellerDashboard() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [view, setView] = useState("table");

  // Create modal
  const [showModal, setShowModal] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editListing, setEditListing] = useState(null);

  // Delete
  const [deleting, setDeleting] = useState(null);

  // Restricted species
  const [restrictedSpecies, setRestrictedSpecies] = useState([]);

  const me = getAuthUser();
  const token = localStorage.getItem("jwt");

  /* ── Load seller's own listings ── */
  const loadListings = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch(`${LISTING_URL}/listings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch listings");
      setListings(data.listings || []);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  /* ── Fetch restricted species for validation ── */
  const loadRestrictedSpecies = useCallback(async () => {
    try {
      const res = await fetch(`${LISTING_URL}/compliance/restricted-species`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRestrictedSpecies(data.map((s) => s.species?.toLowerCase() || ""));
      }
    } catch (err) {
      console.error("Failed to fetch restricted species:", err.message);
    }
  }, [token]);

  useEffect(() => {
    loadRestrictedSpecies();
  }, [loadRestrictedSpecies]);

  /* ── Delete listing ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    setApiError("");
    try {
      const res = await fetch(`${LISTING_URL}/listings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.details || data.error || "Delete failed");
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setApiError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    loadListings();
  };

  const openEditModal = (listing) => {
    setEditListing(listing);
    setShowEditModal(true);
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditListing(null);
    loadListings();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-16 px-6 md:px-10">
      <DashboardHeader
        userEmail={me?.email}
        view={view}
        onViewChange={setView}
        onNewListing={openModal}
      />

      <VerificationWarning isVerified={me?.sellerVerified} />

      <DashboardStats listings={listings} />

      <ErrorBanner error={apiError} onRetry={loadListings} />

      {/* Listings — Table or Grid */}
      {loading ? (
        <div className="max-w-6xl mx-auto flex items-center justify-center py-24 text-slate-400 gap-3">
          <span className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin inline-block" />
          Loading listings…
        </div>
      ) : view === "grid" ? (
        /* ── Grid view ── */
        <div className="max-w-6xl mx-auto">
          {listings.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              No listings yet.{" "}
              <button
                onClick={openModal}
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                Create your first listing →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((l) => (
                <PetCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Table / Detail view ── */
        <ListingsTable
          listings={listings}
          deleting={deleting}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onOpenModal={openModal}
        />
      )}

      <CreateListingModal
        showModal={showModal}
        onClose={closeModal}
        token={token}
        restrictedSpecies={restrictedSpecies}
        onSuccess={loadListings}
      />

      <EditListingModal
        showModal={showEditModal}
        listing={editListing}
        onClose={closeEditModal}
        token={token}
        restrictedSpecies={restrictedSpecies}
        onSuccess={loadListings}
      />

      <style>{`@keyframes cardIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </div>
  );
}
