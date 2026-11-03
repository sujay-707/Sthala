import { useEffect, useMemo, useRef, useState } from "react";
import { request } from "../services/api";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import {
  MapPin,
  CalendarDays,
  Users,
  Moon,
  Download,
  Printer,
  X,
  KeyRound,
  CheckCircle2,
  Clock3,
  XCircle,
  Ticket,
} from "lucide-react";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getNights = (reservation) => {
  if (reservation.nights) return reservation.nights;

  const start = new Date(reservation.checkIn);
  const end = new Date(reservation.checkOut);

  return Math.max(0, Math.round((end - start) / 86400000));
};

const getStatus = (reservation) => {
  if (reservation.status === "cancelled") return "cancelled";
  if (reservation.status === "failed") return "failed";
  if (reservation.status === "pending") return "pending";
  if (reservation.status === "completed") return "completed";

  if (
    reservation.status === "confirmed" &&
    new Date(reservation.checkOut) < new Date()
  ) {
    return "completed";
  }

  return reservation.status;
};

export default function Reservations() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const ticketRef = useRef(null);

  const load = async () => {
    try {
      const data = await request("/reservations/my");
      setItems(data.reservations || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to load your bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Generate a unique QR code for the selected reservation.
  useEffect(() => {
    if (!selected) {
      setQrImage("");
      return;
    }

    const bookingReference = selected.bookingReference || selected._id;

    const qrPayload = JSON.stringify({
      brand: "STHALA",
      type: "STAY_TICKET",
      bookingReference,
      reservationId: selected._id,
      status: selected.status,
    });

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#142f23",
        light: "#ffffff",
      },
    })
      .then(setQrImage)
      .catch(() => setQrImage(""));
  }, [selected]);

  const counts = useMemo(() => {
    const result = {
      all: items.length,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
    };

    items.forEach((item) => {
      const status = getStatus(item);

      if (status === "confirmed" || status === "pending") {
        result.upcoming += 1;
      } else if (status === "completed") {
        result.completed += 1;
      } else if (status === "cancelled" || status === "failed") {
        result.cancelled += 1;
      }
    });

    return result;
  }, [items]);

  const filteredItems = items.filter((item) => {
    const status = getStatus(item);

    if (filter === "upcoming") {
      return status === "confirmed" || status === "pending";
    }

    if (filter === "completed") return status === "completed";

    if (filter === "cancelled") {
      return status === "cancelled" || status === "failed";
    }

    return true;
  });

  const cancel = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this reservation?",
    );

    if (!confirmed) return;

    try {
      await request("/reservations/" + id + "/cancel", {
        method: "PATCH",
      });

      setMessage("Reservation cancelled successfully.");
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const downloadTicket = async () => {
    if (!ticketRef.current || !selected) return;

    try {
      setDownloading(true);

      const image = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#f7f1e5",
      });

      const link = document.createElement("a");
      link.download = `Sthala-Stay-Ticket-${
        selected.bookingReference || selected._id
      }.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Ticket download failed:", error);
      setMessage("Unable to download the ticket. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const printTicket = () => {
    window.print();
  };

  const openTicket = (reservation) => {
    setSelected(reservation);
    setMessage("");
  };

  if (loading) {
    return (
      <main className="page-shell">
        <p>Loading your Sthala bookings…</p>
      </main>
    );
  }

  return (
    <main className="page-shell sthala-bookings">
      <div className="page-title">
        <span className="eyebrow">YOUR JOURNEY WITH STHALA</span>
        <h1>My Bookings</h1>
        <p>Manage your stays, view details, and download your stay tickets.</p>
      </div>

      {message && (
        <p className="booking-message" role="status">
          {message}
        </p>
      )}

      <div className="booking-filters">
        {[
          ["all", "All"],
          ["upcoming", "Upcoming"],
          ["completed", "Completed"],
          ["cancelled", "Cancelled"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label} ({counts[value]})
          </button>
        ))}
      </div>

      {filteredItems.length ? (
        <div className="my-bookings-list">
          {filteredItems.map((reservation) => {
            const listing = reservation.listingId;
            const status = getStatus(reservation);
            const canCancel =
              status === "confirmed" &&
              new Date(reservation.checkIn) > new Date();

            return (
              <article className="my-booking-card" key={reservation._id}>
                {listing?.images?.[0] ? (
                  <img
                    className="my-booking-image"
                    src={listing.images[0]}
                    alt={listing.title || "Property"}
                  />
                ) : (
                  <div className="my-booking-image booking-image-placeholder">
                    <KeyRound size={30} />
                  </div>
                )}

                <div className="my-booking-info">
                  <div className="my-booking-title-row">
                    <div>
                      <h3>{listing?.title || "Sthala property"}</h3>
                      <p className="my-booking-location">
                        <MapPin size={15} />
                        {listing?.location || "Location unavailable"}
                        {listing?.country ? `, ${listing.country}` : ""}
                      </p>
                    </div>

                    <span className={`booking-status ${status}`}>{status}</span>
                  </div>

                  <p className="booking-meta">
                    <CalendarDays size={16} />
                    {formatDate(reservation.checkIn)} –{" "}
                    {formatDate(reservation.checkOut)}
                  </p>

                  <p className="booking-meta">
                    <Users size={16} />
                    {reservation.guests} guests
                    <span className="booking-meta-dot">·</span>
                    <Moon size={15} />
                    {reservation.nights ||
                      Math.max(
                        1,
                        Math.ceil(
                          (new Date(reservation.checkOut) -
                            new Date(reservation.checkIn)) /
                            86400000,
                        ),
                      )}{" "}
                    nights
                  </p>

                  <strong className="booking-price">
                    {money(reservation.totalPrice)}
                  </strong>

                  <div className="booking-card-actions">
                    {status === "confirmed" &&
                      reservation.paymentStatus === "paid" && (
                        <button
                          type="button"
                          className="stay-ticket-button"
                          onClick={() => openTicket(reservation)}
                        >
                          <Ticket size={16} />
                          View Stay Ticket
                        </button>
                      )}

                    {canCancel && (
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => cancel(reservation._id)}
                      >
                        Cancel reservation
                      </button>
                    )}

                    {status === "pending" && (
                      <span className="booking-hint">Payment pending</span>
                    )}

                    {status === "failed" && (
                      <span className="booking-hint">Payment unsuccessful</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-bookings">
          <KeyRound size={38} />
          <h2>No bookings here yet</h2>
          <p>Your Sthala stays will appear here.</p>
        </div>
      )}

      {selected && (
        <div
          className="ticket-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <section
            className="ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Sthala Stay Ticket"
          >
            <button
              type="button"
              className="ticket-close"
              onClick={() => setSelected(null)}
              aria-label="Close ticket"
            >
              <X />
            </button>

            <div className="ticket-preview-column">
              <div className="stay-ticket" ref={ticketRef}>
                <div className="ticket-top-decoration">
                  <span className="ticket-key-icon">
                    <KeyRound size={32} />
                  </span>
                  <span className="ticket-brand-mark">S</span>
                </div>

                <div className="ticket-brand">
                  <span className="ticket-brand-symbol">⌂</span>
                  <span>Sthala</span>
                </div>

                <p className="ticket-subtitle">STAY CONFIRMATION</p>

                <div className="ticket-reference">
                  <small>BOOKING ID</small>
                  <strong>{selected.bookingReference || selected._id}</strong>
                </div>

                {selected.listingId?.images?.[0] && (
                  <img
                    className="ticket-property-image"
                    src={selected.listingId.images[0]}
                    alt={selected.listingId.title || "Booked property"}
                    crossOrigin="anonymous"
                  />
                )}

                <div className="ticket-property">
                  <h2>{selected.listingId?.title || "Sthala Stay"}</h2>
                  <p>
                    <MapPin size={15} />
                    {selected.listingId?.location || "Location unavailable"}
                    {selected.listingId?.country
                      ? `, ${selected.listingId.country}`
                      : ""}
                  </p>
                </div>

                <div className="ticket-details">
                  <div>
                    <CalendarDays />
                    <span>Check-in</span>
                    <strong>{formatDate(selected.checkIn)}</strong>
                  </div>

                  <div>
                    <CalendarDays />
                    <span>Check-out</span>
                    <strong>{formatDate(selected.checkOut)}</strong>
                  </div>

                  <div>
                    <Users />
                    <span>Guests</span>
                    <strong>{selected.guests}</strong>
                  </div>

                  <div>
                    <Moon />
                    <span>Nights</span>
                    <strong>{getNights(selected) || "—"}</strong>
                  </div>
                </div>

                <div className="ticket-price-breakdown">
                  <div>
                    <span>
                      {money(selected.pricePerNight)} × {getNights(selected)}{" "}
                      nights
                    </span>

                    <strong>
                      {money(
                        Number(selected.pricePerNight || 0) *
                          getNights(selected),
                      )}
                    </strong>
                  </div>

                  <div className="ticket-total">
                    <span>Total Paid</span>
                    <strong>
                      {selected.paymentStatus === "paid"
                        ? money(selected.totalPrice)
                        : "Not paid"}
                    </strong>
                  </div>
                </div>

                <div className="ticket-qr-section">
                  <div className="ticket-qr">
                    {qrImage ? (
                      <img src={qrImage} alt="Unique booking QR code" />
                    ) : (
                      <span>Generating QR…</span>
                    )}
                  </div>

                  <div>
                    <strong>YOUR STHALA STAY KEY</strong>
                    <p>Present this booking QR and reference at check-in.</p>
                    <small>Keep this ticket with you during your stay.</small>
                  </div>
                </div>

                <div className="ticket-footer">
                  <span>✦</span>
                  YOUR NEXT STAY, YOUR OWN STORY
                  <span>✦</span>
                </div>
              </div>
            </div>

            <aside className="ticket-actions-panel">
              <div className="ticket-confirmation-card">
                <CheckCircle2 size={48} />
                <h2>Booking Confirmed!</h2>
                <p>
                  Your stay at{" "}
                  <strong>{selected.listingId?.title || "Sthala"}</strong> is
                  confirmed.
                </p>
                <small>Your digital stay ticket is ready.</small>
              </div>

              <button
                type="button"
                className="ticket-download-button"
                onClick={downloadTicket}
                disabled={!qrImage || downloading}
              >
                <Download size={19} />
                {downloading ? "Preparing ticket…" : "Download Receipt (PNG)"}
              </button>

              <button
                type="button"
                className="ticket-secondary-button"
                onClick={printTicket}
              >
                <Printer size={19} />
                Print Receipt
              </button>

              <div className="ticket-key-note">
                <KeyRound size={27} />
                <div>
                  <strong>Your Sthala Stay Ticket</strong>
                  <p>A unique key to your next memorable stay.</p>
                </div>
              </div>

              <p className="ticket-demo-note">
                Payment method:{" "}
                <strong>{selected.paymentMethod || "Not available"}</strong>
                <br />
                Payment status:{" "}
                <strong>{selected.paymentStatus || "Not available"}</strong>
              </p>
            </aside>
          </section>
        </div>
      )}
    </main>
  );
}
