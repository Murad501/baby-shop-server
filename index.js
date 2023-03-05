const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

const jwt = require("jsonwebtoken");

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("data is coming soon");
});

app.listen(port, () => {
  console.log("server is running on port", port);
});
