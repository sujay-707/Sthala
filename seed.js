require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("./models/listing");
const { data } = require("./init/data");
async function seed() {
  const uri = process.env.MONGODB_URI || process.env.ATLASDB_URL;
  if (!uri) throw new Error("Set MONGODB_URI in .env");
  await mongoose.connect(uri);
  const count = await Listing.countDocuments();
  if (count) {
    console.log(`Seed skipped: ${count} listings already exist`);
    return;
  }
  const docs = data.map((x) => ({
    ...x,
    pricePerNight: x.price,
    images: x.image?.url ? [x.image.url] : [],
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    propertyType: "House",
    amenities: [],
  }));
  await Listing.insertMany(docs);
  console.log(`Inserted ${docs.length} sample listings`);
}
seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
