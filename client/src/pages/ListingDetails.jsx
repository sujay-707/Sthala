
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  MapPin,
  Star,
  Users,
  BedDouble,
  Bath,
} from "lucide-react";

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [bookingMessage, setBookingMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Today's date in the user's local timezone.
  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Calculate the earliest permitted checkout date.
  const getMinimumCheckout = () => {
    if (!checkIn) return getToday();

    const date = new Date(`${checkIn}T00:00:00`);
    date.setDate(date.getDate() + 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Fetch property details.
  useEffect(() => {
    request("/listings/" + id)
      .then((data) => setItem(data.listing))
      .catch((err) => setError(err.message));
  }, [id]);

  // Handle check-in changes.
  const handleCheckInChange = (value) => {
    setCheckIn(value);

    if (checkOut && checkOut <= value) {
      setCheckOut("");
    }

    setBookingMessage("");
  };

  // Handle checkout date changes.
  const handleCheckOutChange = (value) => {
    setCheckOut(value);
    setBookingMessage("");
  };

  // Handle reservation and redirect to checkout.
  const reserve = async (e) => {
    e.preventDefault();

    if (!user) {
      setBookingMessage("Please log in to reserve this stay.");
      return;
    }

    if (!checkIn || !checkOut) {
      setBookingMessage("Please select both check-in and check-out dates.");
      return;
    }

    if (checkIn < getToday()) {
      setBookingMessage("Check-in cannot be in the past.");
      return;
    }

    if (checkOut <= checkIn) {
      setBookingMessage(
        "Check-out must be at least one day after check-in."
      );
      return;
    }

    if (
      !Number.isInteger(Number(guests)) ||
      Number(guests) < 1 ||
      Number(guests) > (item.maxGuests || 2)
    ) {
      setBookingMessage("Please select a valid number of guests.");
      return;
    }

    setBusy(true);
    setBookingMessage("");

    try {
      const data = await request("/reservations", {
        method: "POST",
        body: JSON.stringify({
          listingId: id,
          checkIn,
          checkOut,
          guests: Number(guests),
        }),
      });

      // The reservation is pending until demo payment succeeds.
      navigate("/checkout/" + data.reservation._id);
    } catch (err) {
      setBookingMessage(
        err.message || "Unable to continue. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return <main className="page-shell">{error}</main>;
  }

  if (!item) {
    return <main className="page-shell">Loading property…</main>;
  }

  const images = item.images?.length
    ? item.images
    : [item.image?.url].filter(Boolean);

  const pricePerNight = Number(
    item.pricePerNight ?? item.price ?? 0
  );

  return (
    <main className="page-shell details">
      <Link to="/search" className="text-link">
        ← Back to stays
      </Link>

      <h1>{item.title}</h1>

      <p className="location-line">
        <MapPin size={16} />
        {item.location}, {item.country}
        <span>·</span>
        <Star size={15} />
        {item.rating || "New"} ({item.reviewCount || 0} reviews)
      </p>

      <div className="gallery">
        {images.slice(0, 5).map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={item.title + " " + (i + 1)}
          />
        ))}
      </div>

      <div className="details-layout">
        <section>
          <h2>About this place</h2>
          <p>{item.description}</p>

          <div className="facts">
            <span>
              <Users />
              {item.maxGuests || 2} guests
            </span>

            <span>
              <BedDouble />
              {item.bedrooms || 1} bedrooms
            </span>

            <span>
              <Bath />
              {item.bathrooms || 1} bathrooms
            </span>
          </div>

          <h2>What this place offers</h2>

          <div className="amenities">
            {(item.amenities || []).map((amenity) => (
              <span key={amenity}>{amenity}</span>
            ))}
          </div>
        </section>

        <aside className="booking-box">
          <h2>
            ₹{pricePerNight.toLocaleString("en-IN")}{" "}
            <small>/ night</small>
          </h2>

          <form onSubmit={reserve} className="booking-form">
            <label>
              Check-in

              <input
                required
                type="date"
                min={getToday()}
                value={checkIn}
                onChange={(e) =>
                  handleCheckInChange(e.target.value)
                }
              />
            </label>

            <label>
              Check-out

              <input
                required
                type="date"
                min={getMinimumCheckout()}
                value={checkOut}
                onChange={(e) =>
                  handleCheckOutChange(e.target.value)
                }
              />
            </label>

            <label>
              Guests

              <input
                required
                type="number"
                min="1"
                max={item.maxGuests || 2}
                step="1"
                value={guests}
                onChange={(e) => {
                  setGuests(e.target.value);
                  setBookingMessage("");
                }}
              />
            </label>

            <button
              type="submit"
              className="hero-cta"
              disabled={busy}
            >
              {busy ? "Checking availability…" : "Reserve your stay"}
            </button>

            {bookingMessage && (
              <p className="booking-message">
                {bookingMessage}
              </p>
            )}
          </form>

          <small>
            Continue to Sthala Demo Checkout. No real payment is collected.
          </small>
        </aside>
      </div>
    </main>
  );
}
