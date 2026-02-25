require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// -----------------------------
// In-memory storage
// -----------------------------
const stockHistory = {}; // { AAPL: [records...] }
const monitoringJobs = {}; // { AAPL: intervalId }

// -----------------------------
// Helper: Validate integer
// -----------------------------
function isValidNonNegativeInt(value) {
  return Number.isInteger(value) && value >= 0;
}

// -----------------------------
// Helper: Fetch stock data
// -----------------------------
async function fetchStockData(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`;

  const response = await axios.get(url);
  const data = response.data;

  // Finnhub fields:
  // o = open, h = high, l = low, c = current, pc = previous close

  return {
    symbol,
    open: data.o,
    high: data.h,
    low: data.l,
    current: data.c,
    previousClose: data.pc,
    timestamp: new Date().toISOString(),
  };
}

// -----------------------------
// Endpoint 1: Start Monitoring
// -----------------------------
app.post("/start-monitoring", async (req, res) => {
  const { symbol, minutes, seconds } = req.body;

  // Validate symbol
  if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
    return res.status(400).json({
      error: "Symbol must be a non-empty string.",
    });
  }

  // Validate minutes + seconds
  if (
    !isValidNonNegativeInt(minutes) ||
    !isValidNonNegativeInt(seconds)
  ) {
    return res.status(400).json({
      error: "Minutes and seconds must be valid non-negative integers.",
    });
  }

  // Calculate interval
  const intervalMs = (minutes * 60 + seconds) * 1000;

  if (intervalMs <= 0) {
    return res.status(400).json({
      error: "Refresh interval must be greater than 0 seconds.",
    });
  }

  const stockSymbol = symbol.toUpperCase();

  // Stop existing job if already monitoring
  if (monitoringJobs[stockSymbol]) {
    clearInterval(monitoringJobs[stockSymbol]);
  }

  // Initialize history array if not exists
  if (!stockHistory[stockSymbol]) {
    stockHistory[stockSymbol] = [];
  }

  // Start monitoring job
  monitoringJobs[stockSymbol] = setInterval(async () => {
    try {
      const record = await fetchStockData(stockSymbol);
      stockHistory[stockSymbol].push(record);

      console.log("Fetched:", record);
    } catch (err) {
      console.error("Error fetching stock data:", err.message);
    }
  }, intervalMs);

  return res.json({
    message: `Started monitoring ${stockSymbol} every ${minutes}m ${seconds}s.`,
  });
});

// -----------------------------
// Endpoint 2: Retrieve History
// -----------------------------
app.get("/history", (req, res) => {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({
      error: "Symbol query parameter is required.",
    });
  }

  const stockSymbol = symbol.toUpperCase();

  return res.json(stockHistory[stockSymbol] || []);
});

// -----------------------------
// Endpoint 3 (Bonus): Refresh Immediately
// -----------------------------
app.post("/refresh", async (req, res) => {
  const { symbol } = req.body;

  if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
    return res.status(400).json({
      error: "Symbol must be a non-empty string.",
    });
  }

  const stockSymbol = symbol.toUpperCase();

  try {
    const record = await fetchStockData(stockSymbol);

    if (!stockHistory[stockSymbol]) {
      stockHistory[stockSymbol] = [];
    }

    stockHistory[stockSymbol].push(record);

    return res.json(record);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch stock data.",
      details: err.message,
    });
  }
});

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Stock Monitor API running on port ${PORT}`);
});