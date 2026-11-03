const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

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
    if (!req.body) req.body = {};
    const { error, value } = userSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res.status(400).json({
        message: error.message,
      });

    // const { name, email, password } = value;
    const hashedPassword = await hashPassword(value.password);

    const newUser = {
      id: global.users.length + 1,
      name: value.name,
      email: value.email,
      hashedPassword,
    };

    global.users.push(newUser);
    global.user_id = newUser;

    return res.status(201).json({
      name: newUser.name,
      email: newUser.email,
    });
  } catch (error) {
    next(error);
  }
}

async function logon(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = global.users.find((u) => u.email === email);
    const goodCredentials =
      user && (await comparePassword(password, user.hashedPassword));
    if (!goodCredentials) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    global.user_id = user;

    return res.status(200).json({
      name: user.name,
      email: user.email,
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
