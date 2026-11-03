
const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    country: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    propertyType: {
      type: String,
      default: "House",
      trim: true,
    },

    images: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    image: {
      url: {
        type: String,
        trim: true,
      },
      filename: {
        type: String,
        trim: true,
      },
    },

    pricePerNight: {
      type: Number,
      min: 0,
    },

    price: {
      type: Number,
      min: 0,
    },

    maxGuests: {
      type: Number,
      default: 2,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Maximum guests must be a whole number",
      },
    },

    bedrooms: {
      type: Number,
      default: 1,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Bedrooms must be a whole number",
      },
    },

    bathrooms: {
      type: Number,
      default: 1,
      min: 0,
    },

    amenities: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Review count must be a whole number",
      },
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Internal booking lock fields. Never expose these to clients.
bookingLockToken: {
  type: String,
  select: false,
},

bookingLockUntil: {
  type: Date,
  select: false,
},

    geometry: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  {
    timestamps: true,
  },
);

listingSchema.index({
  title: "text",
  location: "text",
  country: "text",
  description: "text",
});

module.exports =
  mongoose.models.Listing ||
  mongoose.model("Listing", listingSchema);
