const Booking = require("../Models/booking");
const Listing = require("../Models/listing");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getBookingDetails = (body) => {
  const checkIn = new Date(body.checkIn);
  const checkOut = new Date(body.checkOut);
  const guests = Number(body.guests);

  if (
    Number.isNaN(checkIn.getTime()) ||
    Number.isNaN(checkOut.getTime()) ||
    checkOut <= checkIn ||
    !Number.isInteger(guests) ||
    guests < 1
  ) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkIn < today) return null;

  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  return { checkIn, checkOut, guests, nights };
};

// Treat pending payment sessions as holds too, so two guests cannot start
// checkout for overlapping dates at the same time. Failed/cancelled bookings
// release their dates.
const findDateConflict = (listingId, checkIn, checkOut, excludeBookingId) => {
  const query = {
    listing: listingId,
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
    bookingStatus: { $ne: "Cancelled" },
    paymentStatus: { $ne: "Failed" },
  };

  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  return Booking.findOne(query).select("_id checkIn checkOut");
};

module.exports.index = async (req, res) => {
    const bookings = await Booking.find({
        user: req.user._id
    }).populate("listing");

    res.render("bookings/index.ejs", { bookings });
};

module.exports.renderBookingForm = async (req, res) => {
    const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "The listing you selected is no longer available.");
    return res.redirect("/listings");
  }

  res.render("bookings/book.ejs", { listing });
};

module.exports.createPaymentOrder = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return res.status(404).json({ message: "Listing not found." });
  }

  const details = getBookingDetails(req.body);
  if (!details) {
    return res.status(400).json({ message: "Enter valid check-in, check-out, and guest details." });
  }

  const { checkIn, checkOut, guests, nights } = details;

  let booking = await Booking.findOne({
    listing: listing._id,
    user: req.user._id,
    checkIn,
    checkOut,
  });

  const conflictingBooking = await findDateConflict(
    listing._id,
    checkIn,
    checkOut,
    booking?._id
  );
  if (conflictingBooking) {
    return res.status(409).json({
      message: "These dates overlap with another reservation. Please choose different dates.",
    });
  }

  const totalPrice = listing.price * nights;

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return res.status(400).json({ message: "This listing does not have a valid price." });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ message: "Payments are temporarily unavailable. Please try again later." });
  }

  try {
    if (booking && booking.paymentStatus === "Paid") {
      return res.status(409).json({ message: "This booking has already been paid for." });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(totalPrice * 100),
      currency: "INR",
      receipt: `booking_${Date.now()}`,
      notes: {
        listingId: listing._id.toString(),
        userId: req.user._id.toString(),
      },
    });

    if (!booking) {
      booking = await Booking.create({
        listing: listing._id,
        user: req.user._id,
        checkIn,
        checkOut,
        guests,
        totalPrice,
        paymentStatus: "Pending",
        razorpayOrderId: order.id,
      });
    } else {
      booking.checkIn = checkIn;
      booking.checkOut = checkOut;
      booking.guests = guests;
      booking.totalPrice = totalPrice;
      booking.paymentStatus = "Pending";
      booking.bookingStatus = "Pending";
      booking.razorpayOrderId = order.id;
      booking.razorpayPaymentId = undefined;
      booking.razorpaySignature = undefined;
      await booking.save();
    }

    return res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: booking.razorpayOrderId,
      amount: Math.round(booking.totalPrice * 100),
      currency: "INR",
      bookingId: booking._id,
      listingTitle: listing.title,
      userName: req.user.username,
      userEmail: req.user.email,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A booking for these dates already exists." });
    }

    console.error("Unable to create Razorpay order:", err.message);
    return res.status(502).json({ message: "Unable to start payment. Please try again." });
  }
};

module.exports.verifyPayment = async (req, res) => {
  const { id } = req.params;
  const { bookingId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!bookingId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: "Incomplete payment verification request." });
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    listing: id,
    user: req.user._id,
  });

  if (!booking || booking.razorpayOrderId !== razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Invalid payment request." });
  }

  const conflictingBooking = await findDateConflict(
    booking.listing,
    booking.checkIn,
    booking.checkOut,
    booking._id
  );
  if (conflictingBooking) {
    booking.paymentStatus = "Failed";
    await booking.save();
    return res.status(409).json({
      message: "These dates have just been booked by someone else. Your reservation was not confirmed.",
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${booking.razorpayOrderId}|${razorpay_payment_id}`)
    .digest("hex");

  const signaturesMatch =
    expectedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

  if (!signaturesMatch) {
    booking.paymentStatus = "Failed";
    await booking.save();
    return res.status(400).json({ message: "Payment verification failed." });
  }

  booking.paymentStatus = "Paid";
  booking.bookingStatus = "Confirmed";
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  await booking.save();

  req.flash("success", "Payment successful. Your booking is confirmed!");
  return res.json({ message: "Payment verified." });
};

module.exports.markPaymentFailed = async (req, res) => {
  const { id } = req.params;
  const { bookingId, razorpay_order_id } = req.body;

  if (!bookingId || !razorpay_order_id) {
    return res.status(400).json({ message: "Invalid payment session." });
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    listing: id,
    user: req.user._id,
    razorpayOrderId: razorpay_order_id,
    paymentStatus: "Pending",
  });

  if (!booking) return res.status(400).json({ message: "Payment session could not be updated." });

  booking.paymentStatus = "Failed";
  await booking.save();
  return res.json({ message: "Payment marked as failed." });
};

    
