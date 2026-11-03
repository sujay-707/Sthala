import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
export default function ListingCard({ listing }) {
  const { user } = useAuth();
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(listing._id);
  const image =
    listing.images?.[0] ||
    listing.image?.url ||
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900";
  const price = listing.pricePerNight ?? listing.price ?? 0;
  const onSave = async () => {
    if (!user) {
      window.location.assign("/login");
      return;
    }
    try {
      await toggle(listing);
    } catch (err) {
      alert(err.message);
    }
  };
  return (
    <article className="listing-card">
      <div className="image-wrap">
        <Link to={"/listings/" + listing._id}>
          <img src={image} alt={listing.title} loading="lazy" />
        </Link>
        <button
          className={"heart " + (saved ? "active" : "")}
          onClick={onSave}
          aria-label={saved ? "Remove from wishlist" : "Save listing"}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <Link to={"/listings/" + listing._id}>
        <div className="card-meta">
          <div>
            <h3>{listing.title}</h3>
            <p>
              {listing.location}
              {listing.country ? ", " + listing.country : ""}
            </p>
          </div>
          <span className="rating">
            <Star size={14} fill="currentColor" />
            {Number(listing.rating) > 0
              ? Number(listing.rating).toFixed(1)
              : "New"}
          </span>
        </div>
        <p className="price">
          <b>₹{Number(price).toLocaleString("en-IN")}</b> night
        </p>
      </Link>
    </article>
  );
}
