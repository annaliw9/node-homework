const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

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
        isCompleted: value.isCompleted,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

async function index(req, res, next) {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: global.user_id, // only the tasks for this user!
      },
      select: { title: true, isCompleted: true, id: true },
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found" });
    }

    return res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
}

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
      select: { title: true, isCompleted: true, id: true },
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
      select: { title: true, isCompleted: true, id: true },
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
      select: { title: true, isCompleted: true, id: true },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({
      id: task.id,
      title: task.title,
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

module.exports = { create, index, show, update, deleteTask };
