
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    listingIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Listing",
        },
      ],
      default: [],
      validate: {
        validator: (ids) =>
          ids.length === new Set(ids.map((id) => id.toString())).size,
        message: "Wishlist cannot contain duplicate listings",
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.Wishlist ||
  mongoose.model("Wishlist", schema);
