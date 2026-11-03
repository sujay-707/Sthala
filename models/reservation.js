
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },

    checkIn: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => value instanceof Date && !isNaN(value),
        message: "Invalid check-in date",
      },
    },

    checkOut: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => value instanceof Date && !isNaN(value),
        message: "Invalid check-out date",
      },
    },

    guests: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Guests must be a whole number",
      },
    },

    nights: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Nights must be a whole number",
      },
    },

    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Price per night must be a valid number",
      },
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Total price must be a valid number",
      },
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "failed"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "wallet", null],
      default: null,
    },

    holdExpiresAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Check-out must be after check-in.
schema.pre("validate", function (next) {
  if (
    this.checkIn instanceof Date &&
    this.checkOut instanceof Date &&
    !isNaN(this.checkIn) &&
    !isNaN(this.checkOut) &&
    this.checkOut <= this.checkIn
  ) {
    this.invalidate("checkOut", "Check-out must be after check-in");
  }

  next();
});

// Reservation lookup indexes.
schema.index({
  listingId: 1,
  status: 1,
  checkIn: 1,
  checkOut: 1,
});

schema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", schema);
