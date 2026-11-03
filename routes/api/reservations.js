
const router = require("express").Router();
const crypto = require("crypto");
const mongoose = require("mongoose");

const Reservation = require("../../models/reservation");
const Listing = require("../../models/listing");
const { auth } = require("../../middleware/apiAuth");

router.use(auth);

const HOLD_MINUTES = 15;
const LOCK_SECONDS = 30;

// Get today's date in India as YYYY-MM-DD.
function getIndiaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

// Strictly validate YYYY-MM-DD and convert to UTC date-only value.
function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

// Atomically acquire a short-lived lock for one listing.
// Only one booking operation for this listing can hold it at a time.
async function acquireListingLock(listingId) {
  const token = crypto.randomBytes(16).toString("hex");
  const now = new Date();

  const listing = await Listing.findOneAndUpdate(
    {
      _id: listingId,
      $or: [
        { bookingLockUntil: { $exists: false } },
        { bookingLockUntil: null },
        { bookingLockUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        bookingLockToken: token,
        bookingLockUntil: new Date(
          now.getTime() + LOCK_SECONDS * 1000,
        ),
      },
    },
    { new: true },
  ).select("_id");

  return listing ? token : null;
}

async function releaseListingLock(listingId, token) {
  if (!token) return;

  await Listing.updateOne(
    {
      _id: listingId,
      bookingLockToken: token,
    },
    {
      $unset: {
        bookingLockToken: 1,
        bookingLockUntil: 1,
      },
    },
  );
}

async function hasDateConflict(
  listingId,
  start,
  end,
  excludeId = null,
) {
  const now = new Date();

  const query = {
    listingId,
    $or: [
      { status: "confirmed" },
      {
        status: "pending",
        holdExpiresAt: { $gt: now },
      },
    ],
    checkIn: { $lt: end },
    checkOut: { $gt: start },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Reservation.exists(query);
}

// Create a pending booking and hold its dates.
router.post("/", async (req, res, next) => {
  let lockToken = null;
  let listingId = null;

  try {
    const { checkIn, checkOut, guests } = req.body || {};
    listingId = req.body?.listingId;

    const start = parseDateOnly(checkIn);
    const end = parseDateOnly(checkOut);
    const count = Number(guests);

    if (!validId(listingId) || !start || !end) {
      return res.status(400).json({
        message: "Please provide a valid property and valid dates.",
      });
    }

    if (checkIn < getIndiaToday()) {
      return res.status(400).json({
        message: "Check-in cannot be in the past.",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        message: "Check-out must be at least one day after check-in.",
      });
    }

    if (!Number.isInteger(count) || count < 1) {
      return res.status(400).json({
        message: "Please select a valid number of guests.",
      });
    }

    // Acquire the listing lock before checking availability.
    lockToken = await acquireListingLock(listingId);

    if (!lockToken) {
      return res.status(409).json({
        message:
          "This property is currently processing another booking. Please try again.",
      });
    }

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        message: "Property not found.",
      });
    }

    const maxGuests = listing.maxGuests ?? 2;

    if (count > maxGuests) {
      return res.status(400).json({
        message: `This property accommodates up to ${maxGuests} guests.`,
      });
    }

    if (await hasDateConflict(listingId, start, end)) {
      return res.status(409).json({
        message:
          "These dates are no longer available. Please choose other dates.",
      });
    }

    const nights = (end - start) / 86400000;
    const pricePerNight = Number(
      listing.pricePerNight ?? listing.price,
    );

    if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
      return res.status(400).json({
        message: "This property's price is currently unavailable.",
      });
    }

    const reservation = await Reservation.create({
      bookingReference: `STH-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`,

      userId: req.user._id,
      listingId,
      checkIn: start,
      checkOut: end,
      guests: count,
      nights,
      pricePerNight,
      totalPrice: nights * pricePerNight,
      status: "pending",
      paymentStatus: "pending",
      holdExpiresAt: new Date(
        Date.now() + HOLD_MINUTES * 60 * 1000,
      ),
    });

    return res.status(201).json({
      reservation,
      message: "Booking details validated. Continue to checkout.",
    });
  } catch (error) {
    next(error);
  } finally {
    if (lockToken && listingId) {
      await releaseListingLock(listingId, lockToken);
    }
  }
});

// Simulated payment. This is NOT a real payment gateway.
router.post("/:id/mock-payment", async (req, res, next) => {
  let lockToken = null;
  let listingId = null;

  try {
    const { outcome, paymentMethod } = req.body || {};

    const allowedMethods = ["upi", "card", "netbanking", "wallet"];

    if (!["success", "failure"].includes(outcome)) {
      return res.status(400).json({
        message: "Invalid demo payment result.",
      });
    }

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: "Select a valid payment method.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID.",
      });
    }

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    listingId = reservation.listingId;

    lockToken = await acquireListingLock(listingId);

    if (!lockToken) {
      return res.status(409).json({
        message:
          "This property is processing another booking. Please retry.",
      });
    }

    // Re-read after acquiring the lock.
    const current = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!current) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    if (current.status !== "pending") {
      return res.status(400).json({
        message: "This booking is no longer awaiting payment.",
      });
    }

    const now = new Date();

    if (!current.holdExpiresAt || current.holdExpiresAt <= now) {
      await Reservation.updateOne(
        {
          _id: current._id,
          userId: req.user._id,
          status: "pending",
        },
        {
          $set: {
            status: "failed",
            paymentStatus: "failed",
          },
        },
      );

      return res.status(410).json({
        message: "Your booking hold expired. Please select dates again.",
      });
    }

    if (outcome === "failure") {
      // Keep the hold so the user can retry payment.
      const updated = await Reservation.findOneAndUpdate(
        {
          _id: current._id,
          userId: req.user._id,
          status: "pending",
          holdExpiresAt: { $gt: now },
        },
        {
          $set: {
            paymentStatus: "failed",
            paymentMethod,
          },
        },
        { new: true },
      );

      if (!updated) {
        return res.status(409).json({
          message: "Booking state changed. Please try again.",
        });
      }

      return res.json({
        success: false,
        message:
          "Demo payment failed. No money was charged. You can try again.",
        reservation: updated,
      });
    }

    // Recheck dates immediately before confirmation.
    if (
      await hasDateConflict(
        current.listingId,
        current.checkIn,
        current.checkOut,
        current._id,
      )
    ) {
      await Reservation.updateOne(
        {
          _id: current._id,
          userId: req.user._id,
          status: "pending",
        },
        {
          $set: {
            status: "failed",
            paymentStatus: "failed",
          },
        },
      );

      return res.status(409).json({
        message: "These dates are no longer available.",
      });
    }

    // Conditional update prevents confirming an expired or changed hold.
    const confirmed = await Reservation.findOneAndUpdate(
      {
        _id: current._id,
        userId: req.user._id,
        status: "pending",
        holdExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "confirmed",
          paymentStatus: "paid",
          paymentMethod,
          paidAt: new Date(),
          holdExpiresAt: null,
        },
      },
      { new: true, runValidators: true },
    );

    if (!confirmed) {
      return res.status(409).json({
        message: "Your booking hold expired or changed. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: "Demo payment successful. Your booking is confirmed!",
      reservation: confirmed,
    });
  } catch (error) {
    next(error);
  } finally {
    if (lockToken && listingId) {
      await releaseListingLock(listingId, lockToken);
    }
  }
});

// Get current user's reservations.
router.get("/my", async (req, res, next) => {
  try {
    const reservations = await Reservation.find({
      userId: req.user._id,
    })
      .populate("listingId")
      .sort({ createdAt: -1 });

    res.json({ reservations });
  } catch (error) {
    next(error);
  }
});

// Get one reservation belonging to the current user.
router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID.",
      });
    }

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("listingId");

    if (!reservation) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    res.json({ reservation });
  } catch (error) {
    next(error);
  }
});

// Cancel a confirmed booking.
router.patch("/:id/cancel", async (req, res, next) => {
  let lockToken = null;
  let listingId = null;

  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID.",
      });
    }

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    listingId = reservation.listingId;

    lockToken = await acquireListingLock(listingId);

    if (!lockToken) {
      return res.status(409).json({
        message:
          "This property is processing another booking. Please retry.",
      });
    }

    const today = getIndiaToday();
    const current = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (
      !current ||
      current.status !== "confirmed" ||
      current.checkIn.toISOString().slice(0, 10) <= today
    ) {
      return res.status(400).json({
        message: "This booking can no longer be cancelled.",
      });
    }

    const cancelled = await Reservation.findOneAndUpdate(
      {
        _id: current._id,
        userId: req.user._id,
        status: "confirmed",
      },
      {
        $set: {
          status: "cancelled",
        },
      },
      { new: true, runValidators: true },
    );

    if (!cancelled) {
      return res.status(409).json({
        message: "Booking state changed. Please refresh and try again.",
      });
    }

    return res.json({ reservation: cancelled });
  } catch (error) {
    next(error);
  } finally {
    if (lockToken && listingId) {
      await releaseListingLock(listingId, lockToken);
    }
  }
});

module.exports = router;
