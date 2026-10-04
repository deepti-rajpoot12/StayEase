if (process.env.NODE_ENV != "production"){
    require("dotenv").config();
}
const dns = require("dns");
dns.setServers(["1.10.10.10", "8.8.8.8"]);
const express = require("express");
const app = express();
const { default: mongoose } = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo').default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
let User = require("./Models/user.js");

const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/booking");
const adminRouter = require("./routes/admin.js");

const dbURL = process.env.ATLASDB_URL;

dns.setServers(["1.10.10.10", "8.8.8.8"]);

main()
    .then(() => {
        console.log("connected to db");
    }) .catch((err) =>{
        console.log(err);
    });

     async function main(){
       mongoose.connect(dbURL);
     };
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbURL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", ()=>{
    console.log("ERROR in MONGO SESSION STORE", err );
})
const sessionOptions ={
    store,
    secret: process.env.SECRET, 
    resave: false, 
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }

};

// app.get("/", (req, res)=>{
//     res.send("hii, i am root")
// }); 


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next )=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user || null;
    res.locals.isAdmin = req.user?.role === "admin";
    next();
})

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.use("/listings", listingsRouter);
app.use("/admin", adminRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);
app.use("/bookings", bookingRouter);
    
app.use("/", (req, res, next) =>{
next(new ExpressError(404, "Page not Found!"));
});  

app.use((err, req, res, next) =>{
    let{status= 500 , message ="somethig went wrong"} = err;
    //res.status(statusCode).send(message);
    res.status(status).render("listings/error.ejs", {message});
}); 

app.listen(8080, () =>{
    console.log("server is listening to port 8080 ");
});
