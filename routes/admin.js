const express = require("express");
const passport = require("passport");
const wrapAsync = require("../utils/wrapAsync.js");
const { isAdmin } = require("../middleware.js");
const adminController = require("../controllers/admin.js");

const router = express.Router();

router.get("/login", adminController.renderLogin);
router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/admin/login", failureFlash: true }),
  adminController.requireAdminLogin,
  (req, res) => {
    req.flash("success", "Welcome to the StayEase administration area.");
    res.redirect("/admin/dashboard");
  }
);
router.get("/signup", adminController.renderSignup);
router.post("/signup", wrapAsync(adminController.signup));
router.get("/dashboard", isAdmin, wrapAsync(adminController.dashboard));

module.exports = router;
