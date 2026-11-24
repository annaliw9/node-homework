const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");
const { getOrderBy } = require("../util/sortUtils");

// Create a new task for the logged-in user
async function create(req, res, next) {
  try {
    if (!req.body) req.body = {};
    const { error, value } = taskSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res.status(400).json({
        message: error.message,
      });
    const task = await prisma.task.create({
      data: {
        title: value.title,
        priority: value.priority,
        isCompleted: value.isCompleted,
        userId: global.user_id,
      },
      select: { title: true, priority: true, isCompleted: true, id: true },
    });
    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

// Create multiple tasks for the logged-in user
async function bulkCreate(req, res, next) {
  const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: global.user_id,
    });
  }
  // Use createMany for batch insertion
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

//show all tasks for the logged-in user
async function index(req, res, next) {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build where clause with optional search filter
  const whereClause = { userId: global.user_id };

  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find, // Matches %find% pattern
      mode: "insensitive", // Case-insensitive search (ILIKE in PostgreSQL)
    };
  }

  try {
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      skip: skip, //offset for page
      take: limit, //limit results per page
      orderBy: getOrderBy(req.query),
    });

    // Get total count for pagination metadata
    const totalTasks = await prisma.task.count({
      where: whereClause,
    });

    //Build pagination object with complete metadata
    const pagination = {
      page,
      limit,
      total: totalTasks,
      pages: Math.ceil(totalTasks / limit),
      hasNext: page * limit < totalTasks,
      hasPrev: page > 1,
    };

    //Return tasks with pagination information
    return res.status(200).json({ tasks, pagination });
  } catch (error) {
    next(error);
  }
}

//show a single task by ID
async function show(req, res, next) {
  try {
    const taskId = parseInt(req.params?.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "ID is not valid" });
    }
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    if (!task) {
      return res.status(404).json({ message: "No task found" });
    }
    return res.status(200).json(task);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    if (!req.body) req.body = {};
    const { error, value } = patchTaskSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res.status(400).json({
        message: error.message,
      });

    const id = parseInt(req.params?.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID is not valid" });
    }

    const task = await prisma.task.update({
      data: value,
      where: {
        id,
        userId: global.user_id,
      },
      select: { title: true, priority: true, isCompleted: true, id: true },
    });

    const updatedTask = task;
    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.status(200).json({
      id: updatedTask.id,
      title: updatedTask.title,
      priority: updatedTask.priority,
      isCompleted: updatedTask.isCompleted,
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

// Delete a task by ID for the logged-in user
async function deleteTask(req, res, next) {
  try {
    const taskId = parseInt(req.params?.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "ID is not valid" });
    }

    const task = await prisma.task.delete({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, priority: true, isCompleted: true, id: true },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({
      id: task.id,
      title: task.title,
      priority: task.priority,
      isCompleted: task.isCompleted,
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Cannot delete task" });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

module.exports = { create, bulkCreate, index, show, update, deleteTask };
