import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request } from "../services/api";
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  CheckCircle2,
  XCircle,
  LoaderCircle,
} from "lucide-react";

const methods = [
  { id: "upi", label: "UPI", detail: "Google Pay, PhonePe, Paytm", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", detail: "Visa, Mastercard, RuPay", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", detail: "All major banks (demo)", icon: Building2 },
  { id: "wallet", label: "Wallet", detail: "Demo wallet payment", icon: Wallet },
];

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [method, setMethod] = useState("upi");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    request("/reservations/" + id)
      .then((data) => {
        setReservation(data.reservation);

        if (data.reservation.status !== "pending") {
          setError("This booking is no longer awaiting payment.");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const simulatePayment = async (outcome) => {
    if (!reservation || paying) return;

    setPaying(true);
    setError("");
    setResult(null);

    // Small delay to demonstrate a payment-processing screen.
    await new Promise((resolve) => setTimeout(resolve, 1400));

    try {
      const data = await request(`/reservations/${id}/mock-payment`, {
        method: "POST",
        body: JSON.stringify({
          outcome,
          paymentMethod: method,
        }),
      });

      setReservation(data.reservation);
      setResult({
        success: data.success,
        message: data.message,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <main className="page-shell">Loading checkout…</main>;
  }

  if (!reservation) {
    return (
      <main className="page-shell">
        <h2>Unable to load checkout</h2>
        <p>{error}</p>
        <Link to="/search">Back to stays</Link>
      </main>
    );
  }

  const listing = reservation.listingId;
  const price = Number(reservation.totalPrice || 0);

  return (
    <main className="page-shell sthala-checkout">
      <Link to={`/listings/${listing?._id}`} className="text-link">
        <ArrowLeft size={16} /> Back to property
      </Link>

      <div className="checkout-heading">
        <span className="checkout-eyebrow">STHALA CHECKOUT</span>
        <h1>Complete your booking</h1>
        <p>One more step before your next stay.</p>
      </div>

      <div className="checkout-layout">
        <section className="payment-panel">
          {result?.success ? (
            <div className="payment-result success">
              <CheckCircle2 size={54} />
              <h2>Booking confirmed!</h2>
              <p>{result.message}</p>
              <p>
                Booking reference: <strong>{reservation.bookingReference}</strong>
              </p>
              <button
                className="hero-cta"
                onClick={() => navigate("/reservations")}
              >
                View my bookings
              </button>
            </div>
          ) : result && !result.success ? (
            <div className="payment-result failure">
              <XCircle size={48} />
              <h2>Payment unsuccessful</h2>
              <p>{result.message}</p>
              <button
                className="hero-cta"
                onClick={() => setResult(null)}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="demo-payment-banner">
                <ShieldCheck size={20} />
                <div>
                  <strong>Demo payment environment</strong>
                  <p>No real money will be charged.</p>
                </div>
              </div>

              <h2>Choose a payment method</h2>

              <div className="payment-methods">
                {methods.map(({ id: value, label, detail, icon: Icon }) => (
                  <button
                    type="button"
                    key={value}
                    className={`payment-method ${
                      method === value ? "selected" : ""
                    }`}
                    onClick={() => setMethod(value)}
                    disabled={paying}
                  >
                    <Icon size={22} />
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                    <span className="method-radio">
                      {method === value ? "●" : "○"}
                    </span>
                  </button>
                ))}
              </div>

              {method === "upi" && (
                <div className="demo-input-area">
                  <label>Demo UPI ID</label>
                  <input value="sujay@demo" readOnly />
                  <small>This is a display-only demo ID.</small>
                </div>
              )}

              {method === "card" && (
                <div className="demo-input-area">
                  <label>Demo card number</label>
                  <input value="•••• •••• •••• 4242" readOnly />
                  <div className="demo-card-row">
                    <div>
                      <label>Expiry</label>
                      <input value="12/30" readOnly />
                    </div>
                    <div>
                      <label>CVV</label>
                      <input value="•••" readOnly />
                    </div>
                  </div>
                  <small>Demo details only. No card information is collected.</small>
                </div>
              )}

              {method === "netbanking" && (
                <div className="demo-input-area">
                  <label>Demo bank</label>
                  <select defaultValue="demo-bank">
                    <option value="demo-bank">Demo Bank</option>
                    <option value="demo-hdfc">HDFC Bank (demo)</option>
                    <option value="demo-sbi">SBI (demo)</option>
                    <option value="demo-icici">ICICI Bank (demo)</option>
                  </select>
                </div>
              )}

              {method === "wallet" && (
                <div className="demo-input-area">
                  <label>Demo wallet</label>
                  <select defaultValue="demo-wallet">
                    <option value="demo-wallet">Sthala Demo Wallet</option>
                    <option value="demo-paytm">Paytm (demo)</option>
                  </select>
                </div>
              )}

              {error && <p className="checkout-error">{error}</p>}

              <button
                className="hero-cta pay-button"
                disabled={paying || reservation.status !== "pending"}
                onClick={() => simulatePayment("success")}
              >
                {paying ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Processing demo payment…
                  </>
                ) : (
                  `Pay ₹${price.toLocaleString("en-IN")}`
                )}
              </button>

              <button
                className="demo-failure-button"
                disabled={paying || reservation.status !== "pending"}
                onClick={() => simulatePayment("failure")}
              >
                Simulate payment failure
              </button>
            </>
          )}
        </section>

        <aside className="checkout-summary">
          <h2>Your stay</h2>

          {listing?.images?.[0] && (
            <img
              className="checkout-property-image"
              src={listing.images[0]}
              alt={listing.title}
            />
          )}

          <h3>{listing?.title || "Sthala property"}</h3>
          <p>{listing?.location}</p>

          <div className="summary-line">
            <span>Check-in</span>
            <strong>{new Date(reservation.checkIn).toLocaleDateString("en-IN")}</strong>
          </div>

          <div className="summary-line">
            <span>Check-out</span>
            <strong>{new Date(reservation.checkOut).toLocaleDateString("en-IN")}</strong>
          </div>

          <div className="summary-line">
            <span>Guests</span>
            <strong>{reservation.guests}</strong>
          </div>

          <div className="summary-line">
            <span>
              ₹{Number(reservation.pricePerNight).toLocaleString("en-IN")} ×{" "}
              {reservation.nights} nights
            </span>
            <strong>₹{price.toLocaleString("en-IN")}</strong>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>₹{price.toLocaleString("en-IN")}</strong>
          </div>

          <small>
            This is a simulated transaction. No actual payment is processed.
          </small>
        </aside>
      </div>
    </main>
  );
}