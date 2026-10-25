const express = require("express");
const dogsRouter = require("./routes/dogs");
const { randomUUID } = require("crypto");
const path = require("path");

const app = express();

//Middleware to parse incoming JSON requests with a size limit of 1MB
app.use(express.json({ limit: "1mb" }));

// Middleware to set security-related HTTP headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

//Custom middleware to add a request ID to each request and response
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

//Custom middleware to log each request with its method, URL, and request ID
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}]: ${req.method} ${req.url} (${req.requestId})`,
  );
  next();
});

//Custom middleware to validate that POST requests have the correct Content-Type header
app.use((req, res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return res.status(400).json({
      error: "Content-Type must be application/json",
      requestId: req.requestId,
    });
  }
  next();
});

app.use("/", dogsRouter); // Do not remove this line

//Custom middleware to handle 404 errors for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});

//Custom middleware to handle errors and send appropriate responses based on the error type
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${err.name} - ${err.message}`);
  } else {
    console.error(`ERROR: ${err.name} - ${err.message}`);
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    requestId: req.requestId,
  });
});

// //Custom error-handling middleware to catch and respond to errors
// app.use((err, req, res, next) => {
//   res.status(500).json({
//     error: "Internal Server Error",
//     requestId: req.requestId,
//   });
// });

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

module.exports = app;
