const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const pool = require("../db/pg-pool");

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
    let result = null;
    value.hashed_password = await hashPassword(value.password);
    // the code to here is like the in-memory version
    try {
      result = await pool.query(
        `INSERT INTO users (email, name, hashed_password)
      VALUES ($1, $2, $3) RETURNING id, email, name`,
        [value.email, value.name, value.hashed_password],
      ); // note that you use a parameterized query
    } catch (e) {
      // the email might already be registered
      if (e.code === "23505") {
        // this means the unique constraint for email was violated
        return res.status(400).json({
          message: "Email already registered",
        });
      }
      return next(e); // all other errors get passed to the error handler
    }
    const user = result.rows[0];
    global.user_id = user.id;
    return res.status(201).json({
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    next(error);
  }
}

async function logon(req, res, next) {
  try {
    const { email, password } = req.body;
    // const user = global.users.find((u) => u.email === email);
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "No user found" });
    }

    const user = result.rows[0];
    const goodCredentials = await comparePassword(
      password,
      user.hashed_password,
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
