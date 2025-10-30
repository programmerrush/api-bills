require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

const companyRoutes = require("./routes/v1/company");

// Connect DB + start MQTT
connectDB();

const app = express();

// Middlewares
app.set("trust proxy", 1);
app.use(bodyParser.json());
app.use(cors());

// Default route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the API",
    endpoints: { v1: "/api/v1/" },
  });
});

// API v1 overview
app.get("/api/v1/", (req, res) => {
  res.status(200).json({
    message: "Welcome to API v1",
    endpoints: {
      company: "/api/v1/company",
    },
  });
});

// Mount routes
app.use("/api/v1/company", companyRoutes);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT;
const HOST = process.env.HOST;
app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
