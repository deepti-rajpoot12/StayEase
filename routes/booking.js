const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/booking");
const { isRegularUser } = require("../middleware");

router.get("/", isRegularUser, bookingController.index);

router.get("/:id/new", isRegularUser, bookingController.renderBookingForm);

router.post("/:id/create-order", isRegularUser, bookingController.createPaymentOrder);

router.post("/:id/verify-payment", isRegularUser, bookingController.verifyPayment);
router.post("/:id/payment-failed", isRegularUser, bookingController.markPaymentFailed);

module.exports = router;
