const User = require("../Models/user.js")

module.exports.renderSignupForm = (req, res) =>{
    res.render("users/signup.ejs");
}

module.exports.signup = async (req, res, next) =>{
    try{
        let{username, email, password} = req.body;
        const newUser = new User({email, username, role: "user"});
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
            req.login(registeredUser, (err) =>{
            if(err) {
                return next(err);
            }
            req.flash("success", "Welcome to StayEase !");
            res.redirect("/listings"); 
        })
            
    } catch(e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }

};

module.exports.renderLoginForm = (req, res) =>{
    res.render("users/login.ejs");
};

module.exports.login = async(req , res, next) =>{
    if (req.user?.role !== "user") {
        return req.logout((err) => {
            if (err) return next(err);
            req.flash("error", "Use the administrator login page for this account.");
            res.redirect("/admin/login");
        });
    }
    req.flash( "success","Welcome back to StayEase!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);

};

module.exports.logout = (req, res, next) =>{
    req.logout((err) =>{
        if(err) {
          return next(err);
        }
        req.flash("success", "you are logged out!")
        res.redirect("/listings");
    });
}
