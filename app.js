require("dotenv").config();
const express = require("express"),
  mongoose = require("mongoose"),
  cors = require("cors");
const app = express(),
  PORT = process.env.PORT || 8080;
const allowedOrigins = [
  "http://localhost:5173",
  "https://mysthala.netlify.app",
];

app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    service: "Sthala-api",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/listings", require("./routes/api/listings"));
app.use("/api/wishlists", require("./routes/api/wishlists"));
app.use("/api/reservations", require("./routes/api/reservations"));
app.use("/api/reviews", require("./routes/api/reviews"));
app.use("/api/admin", require("./routes/api/admin"));
app.use("/api", (req, res) =>
  res.status(404).json({ message: "API endpoint not found" }),
);
app.use((err, req, res, next) => {
  console.error(err);
  const status =
    err.name === "ValidationError"
      ? 400
      : err.name === "CastError"
        ? 400
        : err.code === 11000
          ? 409
          : 500;
  res.status(status).json({
    message:
      status === 500 ? "Something went wrong on the server" : err.message,
  });
});
async function start() {
  const uri = process.env.MONGODB_URI || process.env.ATLASDB_URL;
  if (!uri) throw new Error("Set MONGODB_URI in .env");
  if (!process.env.JWT_SECRET) throw new Error("Set JWT_SECRET in .env");
  await mongoose.connect(uri);
  console.log("MongoDB connected");
  app.listen(PORT, () => console.log("Sthala API listening on " + PORT));
}
if (require.main === module)
  start().catch((e) => {
    console.error("Startup failed:", e.message);
    process.exit(1);
  });
module.exports = app;
