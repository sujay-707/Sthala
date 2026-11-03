const jwt = require("jsonwebtoken");
const User = require("../models/user");
exports.auth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token)
      return res.status(401).json({ message: "Please log in to continue" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user)
      return res.status(401).json({ message: "Account no longer exists" });
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
};
exports.admin = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ message: "Administrator access required" });
