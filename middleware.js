const Listing = require("./Models/listing.js");
const Review = require("./Models/reviews.js");
const ExpressError = require("./utils/ExpressError.js");
const{listingSchema, reviewSchema} = require("./scehma.js")

module.exports.isLoggedIn = (req, res, next ) =>{
    if(!req.isAuthenticated()){
            console.log(req.originalUrl);
            req.session.redirectUrl = req.originalUrl;
            req.flash("error", "Please log in to continue.");
            return res.redirect("/login");
        }
        next();

};

module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
        req.flash("error", "Administrator access is required.");
        return res.redirect(req.isAuthenticated() ? "/listings" : "/admin/login");
    }
    next();
};

module.exports.isRegularUser = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== "user") {
        req.flash("error", "Please sign in with a guest account to do that.");
        return res.redirect(req.isAuthenticated() ? "/listings" : "/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) =>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner = async(req, res, next) =>{
    let {id} = req.params;
    let listing = await Listing.findById(id);
    if(!listing.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the owner of this listing");
        return res.redirect(`/listings/${id}`);
    }
    next();
};

module.exports.validateListing = (req, res, next) =>{
        let {error} =listingSchema.validate(req.body);
        if(error){
            errMsg = error.details.map((el) => el.message).join(",");
            throw new ExpressError(400, errMsg);
        } else{
          next();
        }
    };

module.exports.validateReview = (req, res, next) =>{
        let {error} =reviewSchema.validate(req.body);
        if(error){
            errMsg = error.details.map((el) => el.message).join(",");
            throw new ExpressError(400, error);
         } else{
            next();
        }
    }; 
    
module.exports.isReviewAuthor = async(req, res, next) =>{
    let {id, reviewId} = req.params;
    let review = await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the owner of this review");
        return res.redirect(`/listings/${id}`);
    }
    next();
};    
