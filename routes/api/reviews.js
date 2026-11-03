
const router = require("express").Router();
const mongoose = require("mongoose");

const Review = require("../../models/review");
const Reservation = require("../../models/reservation");
const Listing = require("../../models/listing");
const { auth } = require("../../middleware/apiAuth");

// GET /api/reviews/listing/:listingId
router.get("/listing/:listingId", async (req, res, next) => {
  try {
    const { listingId } = req.params;

    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({ message: "Invalid property ID." });
    }

    const reviews = await Review.find({ listingId })
      .populate("userId", "name profileImage")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews
router.post("/", auth, async (req, res, next) => {
  try {
    const { listingId, reservationId, rating, comment } = req.body || {};

    if (
      !mongoose.isValidObjectId(listingId) ||
      !mongoose.isValidObjectId(reservationId)
    ) {
      return res.status(400).json({
        message: "Invalid property or reservation ID.",
      });
    }

    const numericRating = Number(rating);

    if (
      rating === "" ||
      rating === null ||
      rating === undefined ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be a whole number between 1 and 5.",
      });
    }

    if (typeof comment !== "string") {
      return res.status(400).json({
        message: "Please provide a review comment.",
      });
    }

    const cleanComment = comment.trim();

    if (!cleanComment || cleanComment.length > 2000) {
      return res.status(400).json({
        message: "Comment must contain 1 to 2000 characters.",
      });
    }

    const reservation = await Reservation.findOne({
      _id: reservationId,
      userId: req.user._id,
      listingId,
      status: "completed",
    });

    if (!reservation) {
      return res.status(403).json({
        message: "A completed reservation is required to review this property.",
      });
    }

    const review = await Review.create({
      listingId,
      reservationId,
      userId: req.user._id,
      rating: numericRating,
      comment: cleanComment,
    });

    const result = await Review.aggregate([
      { $match: { listingId: new mongoose.Types.ObjectId(listingId) } },
      {
        $group: {
          _id: null,
          rating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      await Listing.updateOne(
        { _id: listingId },
        {
          $set: {
            rating: result[0].rating,
            reviewCount: result[0].reviewCount,
          },
        },
      );
    }

    return res.status(201).json({ review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this reservation.",
      });
    }

    next(error);
  }
});

module.exports = router;
