
const router = require("express").Router();
const mongoose = require("mongoose");

const Listing = require("../../models/listing");
const { auth } = require("../../middleware/apiAuth");

// Only these fields can be supplied by a listing owner.
const EDITABLE_FIELDS = [
  "title",
  "description",
  "location",
  "country",
  "propertyType",
  "images",
  "image",
  "pricePerNight",
  "price",
  "maxGuests",
  "bedrooms",
  "bathrooms",
  "amenities",
];

const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const badRequest = (res, message) =>
  res.status(400).json({ message });

function buildListingPayload(body, isCreate = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid request body" };
  }

  const payload = {};

  for (const field of EDITABLE_FIELDS) {
    if (!hasOwn(body, field)) continue;

    const value = body[field];

    if (
      ["title", "description", "location", "country", "propertyType"].includes(
        field,
      )
    ) {
      if (typeof value !== "string") {
        return { error: `${field} must be a string` };
      }

      payload[field] = value.trim();
      continue;
    }

    if (["pricePerNight", "price", "maxGuests", "bedrooms", "bathrooms"].includes(field)) {
      const number = Number(value);

      if (value === "" || value === null || !Number.isFinite(number)) {
        return { error: `${field} must be a valid number` };
      }

      if (number < 0) {
        return { error: `${field} cannot be negative` };
      }

      if (field === "maxGuests" && (!Number.isInteger(number) || number < 1)) {
        return { error: "Maximum guests must be a positive whole number" };
      }

      if (field === "bedrooms" && !Number.isInteger(number)) {
        return { error: "Bedrooms must be a whole number" };
      }

      if (field === "pricePerNight" || field === "price") {
        payload[field] = number;
      } else {
        payload[field] = number;
      }

      continue;
    }

    if (field === "images" || field === "amenities") {
      if (
        !Array.isArray(value) ||
        !value.every((item) => typeof item === "string")
      ) {
        return { error: `${field} must be an array of strings` };
      }

      payload[field] = value.map((item) => item.trim()).filter(Boolean);
      continue;
    }

    if (field === "image") {
      if (value === null) {
        payload.image = undefined;
        continue;
      }

      if (typeof value !== "object" || Array.isArray(value)) {
        return { error: "Image must be a valid object" };
      }

      const image = {};

      if (value.url !== undefined) {
        if (typeof value.url !== "string") {
          return { error: "Image URL must be a string" };
        }
        image.url = value.url.trim();
      }

      if (value.filename !== undefined) {
        if (typeof value.filename !== "string") {
          return { error: "Image filename must be a string" };
        }
        image.filename = value.filename.trim();
      }

      payload.image = image;
    }
  }

  if (isCreate) {
    if (!payload.title) return { error: "Title is required" };
    if (!payload.location) return { error: "Location is required" };

    const price = payload.pricePerNight ?? payload.price;

    if (price === undefined) {
      return { error: "Price per night is required" };
    }

    // Keep legacy price fields consistent.
    payload.pricePerNight = price;
    payload.price = price;
  } else if (
    hasOwn(payload, "pricePerNight") ||
    hasOwn(payload, "price")
  ) {
    const price = payload.pricePerNight ?? payload.price;

    payload.pricePerNight = price;
    payload.price = price;
  }

  if (payload.title !== undefined && payload.title.length > 120) {
    return { error: "Title cannot exceed 120 characters" };
  }

  if (
    payload.description !== undefined &&
    payload.description.length > 5000
  ) {
    return { error: "Description cannot exceed 5000 characters" };
  }

  if (payload.location !== undefined && payload.location.length > 150) {
    return { error: "Location cannot exceed 150 characters" };
  }

  if (payload.country !== undefined && payload.country.length > 100) {
    return { error: "Country cannot exceed 100 characters" };
  }

  return { payload };
}

function parseOptionalNumber(value, field, res, options = {}) {
  if (value === undefined || value === "") return null;

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < (options.min ?? 0) ||
    (options.integer && !Number.isInteger(number))
  ) {
    badRequest(res, `Invalid ${field} filter`);
    return undefined;
  }

  return number;
}

// GET /api/listings
router.get("/", async (req, res, next) => {
  try {
    const {
      q = "",
      minPrice,
      maxPrice,
      type,
      guests,
      bedrooms,
      amenities,
      rating,
      sort = "popular",
      page = 1,
      limit = 24,
    } = req.query;

    if (typeof q !== "string" || q.length > 120) {
      return badRequest(res, "Search query must be at most 120 characters");
    }

    const min = parseOptionalNumber(minPrice, "minimum price", res);
    if (min === undefined) return;

    const max = parseOptionalNumber(maxPrice, "maximum price", res);
    if (max === undefined) return;

    if (min !== null && max !== null && min > max) {
      return badRequest(res, "Minimum price cannot exceed maximum price");
    }

    const guestCount = parseOptionalNumber(guests, "guest count", res, {
      min: 1,
      integer: true,
    });
    if (guestCount === undefined) return;

    const bedroomCount = parseOptionalNumber(bedrooms, "bedroom count", res, {
      min: 0,
      integer: true,
    });
    if (bedroomCount === undefined) return;

    const minimumRating = parseOptionalNumber(rating, "rating", res, {
      min: 0,
    });
    if (minimumRating === undefined) return;

    if (minimumRating !== null && minimumRating > 5) {
      return badRequest(res, "Rating cannot exceed 5");
    }

    const f = {};

    if (q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      f.$or = ["title", "location", "country", "description"].map((field) => ({
        [field]: { $regex: escaped, $options: "i" },
      }));
    }

    if (type) {
      if (typeof type !== "string" || type.length > 60) {
        return badRequest(res, "Invalid property type");
      }
      f.propertyType = type.trim();
    }

    if (guestCount !== null) f.maxGuests = { $gte: guestCount };
    if (bedroomCount !== null) f.bedrooms = { $gte: bedroomCount };

    if (amenities) {
      const values = String(amenities)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (values.length > 20 || values.some((item) => item.length > 60)) {
        return badRequest(res, "Invalid amenities filter");
      }

      if (values.length) f.amenities = { $all: values };
    }

    if (minimumRating !== null) {
      f.rating = { $gte: minimumRating };
    }

    const priceExpression = {
      $ifNull: ["$pricePerNight", "$price"],
    };

    const conditions = [];

    if (min !== null) {
      conditions.push({ $gte: [priceExpression, min] });
    }

    if (max !== null) {
      conditions.push({ $lte: [priceExpression, max] });
    }

    if (conditions.length) {
      f.$expr = { $and: conditions };
    }

    const sortOptions = {
      price_asc: { pricePerNight: 1, price: 1 },
      price_desc: { pricePerNight: -1, price: -1 },
      rating: { rating: -1 },
      popular: { isFeatured: -1, rating: -1, createdAt: -1 },
    };

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(60, Math.max(1, Number(limit) || 24));

    const [listings, total] = await Promise.all([
      Listing.find(f)
        .sort(sortOptions[sort] || sortOptions.popular)
        .skip((currentPage - 1) * pageLimit)
        .limit(pageLimit)
        .lean(),

      Listing.countDocuments(f),
    ]);

    res.json({
      listings: listings.map((listing) => ({
        ...listing,
        pricePerNight: listing.pricePerNight ?? listing.price,
      })),
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/listings/featured
router.get("/featured", async (req, res, next) => {
  try {
    const listings = await Listing.find({ isFeatured: true }).limit(12);
    res.json({ listings });
  } catch (error) {
    next(error);
  }
});

// GET /api/listings/destinations
router.get("/destinations", async (req, res, next) => {
  try {
    const destinations = await Listing.aggregate([
      {
        $group: {
          _id: { location: "$location", country: "$country" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]);

    res.json({ destinations });
  } catch (error) {
    next(error);
  }
});

// GET /api/listings/:id
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return badRequest(res, "Invalid property ID");
    }

    const listing = await Listing.findById(req.params.id).populate(
      "owner",
      "name profileImage",
    );

    if (!listing) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json({ listing });
  } catch (error) {
    next(error);
  }
});

// POST /api/listings
router.post("/", auth, async (req, res, next) => {
  try {
    const { payload, error } = buildListingPayload(req.body, true);

    if (error) return badRequest(res, error);

    const listing = await Listing.create({
      ...payload,
      hostId: req.user._id,
      owner: req.user._id,
    });

    res.status(201).json({ listing });
  } catch (error) {
    next(error);
  }
});

// PUT /api/listings/:id
router.put("/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return badRequest(res, "Invalid property ID");
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Property not found" });
    }

    const isOwner =
      String(listing.hostId || listing.owner) === String(req.user._id);

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You cannot edit this property",
      });
    }

    const { payload, error } = buildListingPayload(req.body);

    if (error) return badRequest(res, error);

    Object.assign(listing, payload);

    await listing.save();

    res.json({ listing });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/listings/:id
router.delete("/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return badRequest(res, "Invalid property ID");
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Property not found" });
    }

    const isOwner =
      String(listing.hostId || listing.owner) === String(req.user._id);

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You cannot delete this property",
      });
    }

    await listing.deleteOne();

    res.json({ message: "Property deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
