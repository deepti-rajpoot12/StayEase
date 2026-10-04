const User = require("../Models/user.js");
const Listing = require("../Models/listing.js");

module.exports.renderLogin = (req, res) => res.render("admin/login.ejs");
module.exports.renderSignup = (req, res) => res.render("admin/signup.ejs");

module.exports.signup = async (req, res, next) => {
  const { username, email, password, signupKey } = req.body;
  if (!process.env.ADMIN_SIGNUP_KEY || signupKey !== process.env.ADMIN_SIGNUP_KEY) {
    req.flash("error", "The administrator invitation key is invalid.");
    return res.redirect("/admin/signup");
  }

  try {
    const admin = await User.register(new User({ username, email, role: "admin" }), password);
    req.login(admin, (err) => {
      if (err) return next(err);
      req.flash("success", "Administrator account created.");
      return res.redirect("/admin/dashboard");
    });
  } catch (err) {
    req.flash("error", err.message);
    return res.redirect("/admin/signup");
  }
};

module.exports.requireAdminLogin = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  req.logout((err) => {
    if (err) return next(err);
    req.flash("error", "This account does not have administrator access.");
    return res.redirect("/admin/login");
  });
};

module.exports.dashboard = async (req, res) => {
  const listings = await Listing.find({}).sort({ _id: -1 });
  res.render("admin/dashboard.ejs", { listings });
};
