
const router = require("express").Router();
const mongoose = require("mongoose");

const Listing = require("../../models/listing");
const Reservation = require("../../models/reservation");
const { auth, admin } = require("../../middleware/apiAuth");

router.use(auth, admin);

// Validate pagination parameters.
function getPagination(query, res) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 30 : Number(query.limit);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    res.status(400).json({
      message: "Page and limit must be positive whole numbers.",
    });

    return null;
  }

  return {
    page,
    limit: Math.min(limit, 100),
  };
}

// Get today's date in India as a UTC date-only boundary.
function getIndiaTodayStart() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
    ),
  );
}

// GET /api/admin/listings
router.get("/listings", async (req, res, next) => {
  try {
    const pagination = getPagination(req.query, res);
    if (!pagination) return;

    const { page, limit } = pagination;

    const [listings, total] = await Promise.all([
      Listing.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Listing.countDocuments(),
    ]);

    return res.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reservations
router.get("/reservations", async (req, res, next) => {
  try {
    const pagination = getPagination(req.query, res);
    if (!pagination) return;

    const { page, limit } = pagination;

    const [reservations, total] = await Promise.all([
      Reservation.find()
        .populate("userId", "name email")
        .populate("listingId", "title location")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Reservation.countDocuments(),
    ]);

    return res.json({
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/reservations/complete-expired
// Complete paid, confirmed reservations whose checkout date has arrived.
router.post("/reservations/complete-expired", async (req, res, next) => {
  try {
    const todayStart = getIndiaTodayStart();

    const result = await Reservation.updateMany(
      {
        status: "confirmed",
        paymentStatus: "paid",
        checkOut: { $lte: todayStart },
      },
      {
        $set: {
          status: "completed",
        },
      },
    );

    return res.json({
      message: "Eligible reservations processed.",
      completedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/reservations/:id/complete
// Complete one eligible reservation.
router.post("/reservations/:id/complete", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const todayStart = getIndiaTodayStart();

    const reservation = await Reservation.findOneAndUpdate(
      {
        _id: id,
        status: "confirmed",
        paymentStatus: "paid",
        checkOut: { $lte: todayStart },
      },
      {
        $set: {
          status: "completed",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!reservation) {
      return res.status(400).json({
        message:
          "Reservation cannot be completed. It may not be confirmed, paid, or past its checkout date.",
      });
    }

    return res.json({
      message: "Reservation marked as completed.",
      reservation,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
