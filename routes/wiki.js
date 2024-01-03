const express = require("express");

const router = express.Router();

router.get("/", function (req, res, next) {
  res.send("wiki home page");
});

router.get("/about", function (req, res, next) {
  res.send("about this wiki");
});

module.exports = router;
