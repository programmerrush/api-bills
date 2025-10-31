require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

const billRoutes = require("./routes/v1/bill");

connectDB();

const app = express();

app.set("trust proxy", 1);
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the API",
    endpoints: { v1: "/api/v1/" },
  });
});

app.get("/api/v1/", (req, res) => {
  res.status(200).json({
    message: "Welcome to API v1",
    endpoints: {
      bill: "/api/v1/bill",
    },
  });
});

app.use("/api/v1/bill", billRoutes);

app.use(errorHandler);

const PORT = process.env.PORT;
const HOST = process.env.HOST;
app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
