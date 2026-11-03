
import { useEffect, useState } from "react";
import { request } from "../services/api";
import ListingCard from "../components/ListingCard";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  "All stays",
  "Beachfront",
  "Cabins",
  "Amazing views",
  "Countryside",
  "Design",
  "Tiny homes",
];

export default function Home() {
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState("All stays");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    request(
      "/listings?limit=24&q=" +
        encodeURIComponent(category === "All stays" ? "" : category),
    )
      .then((d) => setListings(d.listings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            YOUR NEXT CHAPTER STARTS HERE
          </span>

          <h1>
            Find a place
            <br />
            to <em>belong.</em>
          </h1>

          <p>
            Thoughtfully picked stays for the trips you'll remember.
          </p>

          <Link className="hero-cta" to="/search">
            Explore stays <ArrowRight size={17} />
          </Link>
        </div>

        <div className="hero-photo">
          <img
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1400"
            alt="Warm modern holiday home"
          />

          <span className="photo-caption">
            Somewhere worth slowing down.
          </span>
        </div>
      </section>

      <section className="discovery">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE STHALA COLLECTION</span>

            <h2>Stays that stay with you</h2>

            <p>
              Places picked for the way you want to travel.
            </p>
          </div>

          <Link to="/search" className="text-link">
            View all <ArrowRight size={16} />
          </Link>
        </div>

        <div className="categories">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">
            Finding beautiful places…
          </div>
        ) : (
          <div className="listing-grid">
            {listings.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
