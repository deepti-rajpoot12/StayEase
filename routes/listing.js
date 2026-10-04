const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const{isAdmin, validateListing} = require("../middleware.js")
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const {storage} = require("../cloudConfig.js");
const upload = multer({storage});

router.route("/")
.get(
    wrapAsync(listingController.index)
    )
.post( 
    isAdmin,
    upload.single("listing[image]"),
    validateListing, 
    wrapAsync(listingController.createListing)
    );

router.get("/new", isAdmin, listingController.renderNewForms );
    
router.route("/:id")
.get( 
        wrapAsync(listingController.showListing)
    )
.put(
        isAdmin,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListing)
    )
.delete(
        isAdmin,
        wrapAsync(listingController.deleteListings)
    );    

    //Edit Route
    router.get(
        "/:id/edit", 
        isAdmin,
        wrapAsync(listingController.renderEditForms));

    

    module.exports = router;

    
