
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number between 1 and 5",
      },
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  },
);

// A user can submit only one review per reservation.
schema.index(
  { userId: 1, reservationId: 1 },
  { unique: true },
);

module.exports =
  mongoose.models.Review ||
  mongoose.model("Review", schema);
