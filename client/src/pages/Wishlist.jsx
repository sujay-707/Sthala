import { useWishlist } from "../context/WishlistContext";
import ListingCard from "../components/ListingCard";
export default function Wishlist() {
  const { items, loading } = useWishlist();
  return (
    <main className="page-shell">
      <div className="page-title">
        <span className="eyebrow">YOUR COLLECTION</span>
        <h1>Saved stays</h1>
        <p>All the places you want to come back to.</p>
      </div>
      {loading ? (
        <p>Loading your saved places…</p>
      ) : items.length ? (
        <div className="listing-grid">
          {items.map((l) => (
            <ListingCard key={l._id} listing={l} />
          ))}
        </div>
      ) : (
        <p>Your wishlist is waiting for its first favourite.</p>
      )}
    </main>
  );
}
