const router = require("express").Router(),
  bcrypt = require("bcryptjs"),
  jwt = require("jsonwebtoken"),
  User = require("../../models/user"),
  { auth } = require("../../middleware/apiAuth");
const safe = (u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    profileImage: u.profileImage,
  }),
  token = (u) =>
    jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    if (password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    if (await User.exists({ email: email.toLowerCase() }))
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    const username =
      email.toLowerCase().split("@")[0] + "_" + Date.now().toString(36);
    const u = await User.create({
      name: name.trim(),
      username,
      email,
      password: await bcrypt.hash(password, 12),
    });
    res.status(201).json({ token: token(u), user: safe(u) });
  } catch (e) {
    next(e);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body,
      u = await User.findOne({ email: email?.toLowerCase() }).select(
        "+password",
      );
    if (!u || !(await bcrypt.compare(password || "", u.password)))
      return res.status(401).json({ message: "Invalid email or password" });
    res.json({ token: token(u), user: safe(u) });
  } catch (e) {
    next(e);
  }
});
router.get("/me", auth, (req, res) => res.json({ user: safe(req.user) }));
module.exports = router;
