const express = require("express");
const router = express.Router({mergeParams:true});
const wrapAsync = require("../utils/wrapAsync.js");
const Review = require("../Models/reviews.js");
const Listing = require("../Models/listing.js");
const {validateReview, isRegularUser, isReviewAuthor} = require("../middleware.js")

const reviewController = require("../controllers/reviews.js")   

//Post Route
router.post("/",
    isRegularUser, 
    validateReview, 
    wrapAsync(reviewController.createReview));

//Delete route
router.delete("/:reviewId",
    isRegularUser,
    isReviewAuthor,
    wrapAsync(reviewController.destroyReview)
);

module.exports = router;
