const express = require("express");
const dogs = require("../dogData");
const { ValidationError, NotFoundError } = require("../errors");

const router = express.Router();

router.get("/dogs", (req, res) => {
  res.status(200).json(dogs);
});

router.post("/adopt", (req, res, next) => {
  try {
    const { name, address, email, dogName } = req.body;

    // Validate required fields
    if (!name || !email || !dogName) {
      throw new ValidationError("Missing required fields");
    }

    // Check if the dog exists
    const dog = dogs.find((d) => d.name === dogName);

    // If the dog does not exist or is not available, throw a NotFoundError
    if (!dog || dog.status !== "available") {
      throw new NotFoundError("not found or not available");
    }

    res.status(201).json({
      message: `Adoption request received. We will contact you at ${email} for further details.`,
      application: {
        name,
        address,
        email,
        dogName,
        applicationId: Date.now(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/error", (req, res, next) => {
  next(new Error("Test error"));
});

module.exports = router;
