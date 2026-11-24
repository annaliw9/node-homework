const express = require("express");
const taskController = require("../controllers/taskController");

const router = express.Router();

router.get("/", taskController.index); // Get all tasks for the logged-in user
router.get("/:id", taskController.show); // Get a single task by ID for the logged-in user

router.post("/", taskController.create); // Create a new task for the logged-in user
router.post("/bulk", taskController.bulkCreate); // Create multiple tasks for the logged-in user

router.patch("/:id", taskController.update); // Update a task by ID for the logged-in user

router.delete("/:id", taskController.deleteTask); // Delete a task by ID for the logged-in user

module.exports = router;
