import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { request } from "../services/api";
import ListingCard from "../components/ListingCard";
export default function Search() {
  const [params] = useSearchParams();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    type: "",
    guests: "",
    bedrooms: "",
    amenities: "",
    rating: "",
    sort: "popular",
  });
  const [q, setQ] = useState(params.get("q") || "");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ q, ...filters });
    Object.keys(filters).forEach((k) => !filters[k] && p.delete(k));
    request("/listings?" + p)
      .then((d) => setItems(d.listings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, filters]);
  const update = (key, value) =>
    setFilters((old) => ({ ...old, [key]: value }));
  return (
    <main className="page-shell">
      <div className="page-title">
        <span className="eyebrow">DISCOVER</span>
        <h1>Find your somewhere.</h1>
        <p>Search stays by destination, price and the details that matter.</p>
      </div>
      <div className="filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Destination or property name"
        />
        <input
          type="number"
          min="0"
          placeholder="Min ₹"
          value={filters.minPrice}
          onChange={(e) => update("minPrice", e.target.value)}
        />
        <input
          type="number"
          min="0"
          placeholder="Max ₹"
          value={filters.maxPrice}
          onChange={(e) => update("maxPrice", e.target.value)}
        />
        <select
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
        >
          <option value="">Any property</option>
          {["Apartment", "Villa", "Cabin", "House", "Hotel"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={filters.guests}
          onChange={(e) => update("guests", e.target.value)}
        >
          <option value="">Any guests</option>
          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n}+ guests
            </option>
          ))}
        </select>
        <select
          value={filters.bedrooms}
          onChange={(e) => update("bedrooms", e.target.value)}
        >
          <option value="">Any bedrooms</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ bedrooms
            </option>
          ))}
        </select>
        <select
          value={filters.rating}
          onChange={(e) => update("rating", e.target.value)}
        >
          <option value="">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
        <input
          value={filters.amenities}
          onChange={(e) => update("amenities", e.target.value)}
          placeholder="Amenities (comma-separated)"
        />
        <select
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="popular">Most popular</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>
      <p className="result-count">{items.length} places to stay</p>
      {loading ? (
        <p>Loading stays…</p>
      ) : items.length ? (
        <div className="listing-grid">
          {items.map((l) => (
            <ListingCard key={l._id} listing={l} />
          ))}
        </div>
      ) : (
        <p>No stays match these filters. Try widening your search.</p>
      )}
    </main>
  );
}
