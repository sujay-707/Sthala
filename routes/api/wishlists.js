const router = require("express").Router(),
  Wishlist = require("../../models/wishlist"),
  Listing = require("../../models/listing"),
  { auth } = require("../../middleware/apiAuth");
router.use(auth);
router.get("/", async (req, res, next) => {
  try {
    const w = await Wishlist.findOne({ userId: req.user._id }).populate(
      "listingIds",
    );
    res.json({ listings: (w?.listingIds || []).filter(Boolean) });
  } catch (e) {
    next(e);
  }
});
router.post("/:listingId", async (req, res, next) => {
  try {
    if (!(await Listing.exists({ _id: req.params.listingId })))
      return res.status(404).json({ message: "Property not found" });
    const w = await Wishlist.findOneAndUpdate(
      { userId: req.user._id },
      { $addToSet: { listingIds: req.params.listingId } },
      { upsert: true, new: true },
    );
    res.status(201).json({ wishlist: w });
  } catch (e) {
    next(e);
  }
});
router.delete("/:listingId", async (req, res, next) => {
  try {
    const w = await Wishlist.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { listingIds: req.params.listingId } },
      { new: true },
    );
    res.json({ wishlist: w });
  } catch (e) {
    next(e);
  }
});
module.exports = router;
