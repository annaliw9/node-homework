const express = require("express");
const timeRouter = require("./routes/timeRoutes"); //imports a router and says that timer routes should live under /api
const userRouter = require("./routes/userRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const jwtMiddleware = require("./middleware/jwtMiddleware");
const taskRouter = require("./routes/taskRoutes");
const analyticsRouter = require("./routes/analyticsRoutes");
const prisma = require("./db/prisma");
const cookieParser = require("cookie-parser"); // reads the incoming cookie so middleware can accessrequests

// global.user_id = null;
global.users = [];
global.tasks = [];

const app = express();
app.set("trust proxy", 1);
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimiter = require("express-rate-limit");

// Slows down clients that send too many requests.
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs
  }),
);

app.use(express.json()); //Parse incoming JSON requests and puts the parsed data in req.body
app.use(cookieParser()); // Use cookie-parser middleware to parse cookies from incoming requests

app.use(helmet()); //Sets helpful security-related HTTP headers
app.use(xss()); //Sanitizes incoming request data.
app.use("/api", timeRouter); // Mount the timeRouter on the /api path
app.use("/api/users", userRouter); // Mount the userRouter on the /api/users path
app.use("/api/tasks", jwtMiddleware, taskRouter); // Apply jwtMiddleware to all task routes, protected routes
app.use("/api/analytics", jwtMiddleware, analyticsRouter); // Apply jwtMiddleware to all analytics routes, protected routes

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", db: "not connected", error: err.message });
  }
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

// app.all("/{*splat}", (req, res) => {
//   res.status(404).json({
//     message: `No route found for ${req.method} ${req.path}`,
//   });
// });

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

const server = app.listen(port, (error) => {
  if (error) {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
    } else {
      console.error("Server startup error:", error);
    }
    process.exit(1);
    return;
  }

  console.log(`Server is listening on port ${port}...`);
});

let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("HTTP server closed.");
    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

module.exports = { app, server };
