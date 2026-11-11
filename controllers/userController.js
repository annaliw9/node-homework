const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");

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

async function register(req, res, next) {
  try {
    const { error, value } = userSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details,
      });
    }
    // Hash the password
    value.hashedPassword = await hashPassword(value.password);

    // Remove the original password
    delete value.password;

    let user = null;

    try {
      user = await prisma.user.create({
        data: {
          email: value.email,
          name: value.name,
          hashedPassword: value.hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } catch (err) {
      if (
        err.name === "PrismaClientKnownRequestError" &&
        err.code === "P2002"
      ) {
        return res.status(400).json({
          message: "Email is already registered",
        });
      } else {
        return next(err); // the error handler takes care of other errors
      }
    }

    // Registration succeeded
    global.user_id = user.id;

    return res.status(201).json({
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    return next(error);
  }
}

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
    global.user_id = user.id;

    return res.status(200).json({
      name: user.name,
      email: user.email,
      message: "User logged in successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function logoff(req, res, next) {
  try {
    global.user_id = null;
    return res.status(200).json({ message: "User logged off successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, logon, logoff };
