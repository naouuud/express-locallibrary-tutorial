const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const compression = require("compression");
const helmet = require("helmet");
const RateLimit = require("express-rate-limit");

// const fs = require("fs/promises");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const wikiRouter = require("./routes/wiki");
const catalogRouter = require("./routes/catalog");

const app = express();

// connect to database
require("dotenv").config();

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const connectToDatabase = async () => {
  try {
    const mongoDB = process.env.MONGO_URL;
    await mongoose.connect(mongoDB);
    console.log("Database connected");
  } catch (err) {
    throw new Error(err);
  }
  // finally {
  //   await mongoose.connection.close();
  //   console.log("Database disconnected");
  // }
};
connectToDatabase();

//use compression
app.use(compression());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
    },
  })
);
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
});
// Apply rate limiter to all requests
app.use(limiter);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
// app.use("/users", usersRouter);
// app.use("/wiki", wikiRouter);
app.use("/catalog", catalogRouter);
// app.get("/users/:userId/books/:bookId", (req, res) => {
//   res.send(req.params);
// });

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
