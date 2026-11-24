const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

// Helper function to set cookie flags based on environment
const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", //only when HTTPS is available
    sameSite: "Strict",
  };
};

//Helper function to set JWT cookie
const setJwtCookie = (req, res, user) => {
  //Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  //Sign the JWT with a 1-hour expiration
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  //Set cookie. Cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // Return the CSRF token to the client for use in subsequent requests. This is needed in the body returned by logon() or register()
};

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

//Register a new user
async function register(req, res, next) {
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const { name, email } = value;

  // Hash the password
  const hashedPassword = await hashPassword(value.password);

  // Remove the original password
  delete value.password;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user account (similar to Assignment 6, but using tx instead of prisma)
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true },
      });

      // Set the JWT cookie
      const csrfToken = setJwtCookie(req, res, newUser);

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks, csrfToken };
    });

    // Send response with status 201
    res.status(201);
    res.json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      csrfToken: result.csrfToken,
      transactionStatus: "success",
    });
    return;
  } catch (err) {
    if (err.code === "P2002") {
      // send the appropriate error back -- the email was already registered
      return res.status(400).json({ error: "Email already registered" });
    } else {
      return next(err); // the error handler takes care of other errors
    }
  }
}

// Log in a user
async function logon(req, res, next) {
  try {
    let { email, password } = req.body;
    email = email.toLowerCase(); // normalize email to lowercase
    const result = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!result) {
      return res.status(401).json({ message: "No user found" });
    }

    const user = result;
    const goodCredentials = await comparePassword(
      password,
      user.hashedPassword,
    );
    if (!goodCredentials) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Set the JWT cookie and get the CSRF token
    const csrfToken = setJwtCookie(req, res, user);

    return res.status(200).json({
      name: user.name,
      email: user.email,
      message: "User logged in successfully",
      csrfToken,
    });
  } catch (error) {
    next(error);
  }
}

// Log off a user
async function logoff(req, res, next) {
  try {
    // Clear the JWT cookie
    res.clearCookie("jwt", cookieFlags(req));
    return res.status(200).json({ message: "User logged off successfully" });
  } catch (error) {
    next(error);
  }
}

// Show a single user by ID
async function show(req, res, next) {
  try {
    const userId = parseInt(req.params.id);

    //Validate user ID
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    //Check whether the user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    //Check whether the user exists
    if (userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        Task: {
          where: { isCompleted: false },
          select: {
            id: true,
            title: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = { register, logon, logoff, show };
