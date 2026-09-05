"use strict";

const express = require("express");

function createHealthApp() {
  const app = express();
  app.get("/health", (req, res) => {
    res.status(200).send("ok");
  });
  return app;
}

module.exports = { createHealthApp };
