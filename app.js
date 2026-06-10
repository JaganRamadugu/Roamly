if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/user.js");

//routers
const listings = require("./routes/listing.js");
const reviews = require("./routes/review.js");
const user = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;

const dns = require("dns");
// Windows often refuses SRV lookups on the default resolver; public DNS fixes Atlas SRV URIs.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

if (!dbUrl) {
  console.error("ERROR: ATLASDB_URL environment variable is not set!");
  process.exit(1);
}

// For EJS & view configurations
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

async function start() {
  try {
    await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 10000 });
    console.log("Connected to DB");
  } catch (err) {
    console.error("DB Connection Error:", err.message);
    if (dbUrl.startsWith("mongodb+srv://")) {
      console.error(
        "Tip: If this keeps failing, copy the standard (non-SRV) connection string from MongoDB Atlas and set it as ATLASDB_URL.",
      );
    }
    process.exit(1);
  }

  const store = MongoStore.create({
    clientPromise: Promise.resolve(mongoose.connection.getClient()),
    crypto: {
      secret: "mysuperseceretcode",
    },
    touchAfter: 24 * 60 * 60,
  });

  store.on("error", (err) => {
    console.log("SESSION STORE ERROR", err);
  });

  const sessionOptions = {
    store,
    secret: "mysuperseceretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  };

  app.use(session(sessionOptions));
  app.use(flash());

  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(new LocalStrategy(User.authenticate()));

  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.mapToken = process.env.MAPBOX_TOKEN;
    next();
  });

  app.use("/listings", listings);
  app.use("/listings/:id/reviews", reviews);
  app.use("/", user);

  app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
  });

  app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something Went Wrong" } = err;
    res.status(statusCode).render("error.ejs", { message });
  });

  app.listen(1010, () => {
    console.log("server is listening 1010");
  });
}

start();
