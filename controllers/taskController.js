const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const pool = require("../db/pg-pool");

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
    const result = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id)
  VALUES ( $1, $2, $3 ) RETURNING id, title, is_completed`,
      [value.title, value.isCompleted, global.user_id],
    );
    const task = result.rows[0];
    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

async function index(req, res, next) {
  try {
    const result = await pool.query(
      "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
      [global.user_id],
    );
    const tasks = result.rows;

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
    const result = await pool.query(
      "SELECT id, title, is_completed FROM tasks WHERE id = $1 AND user_id = $2",
      [taskId, global.user_id],
    );
    const task = result.rows[0];
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
    const taskChange = value;
    let keys = Object.keys(taskChange);
    keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    const idParm = `$${keys.length + 1}`;
    const userParm = `$${keys.length + 2}`;
    const result = await pool.query(
      `UPDATE tasks SET ${setClauses}
  WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
      [...Object.values(taskChange), req.params.id, global.user_id],
    );
    const updatedTask = result.rows[0];
    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.status(200).json({
      id: updatedTask.id,
      title: updatedTask.title,
      isCompleted: updatedTask.is_completed,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const taskId = parseInt(req.params?.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "ID is not valid" });
    }
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_completed`,
      [taskId, global.user_id],
    );

    const deletedTask = result.rows[0];

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({
      id: deletedTask.id,
      title: deletedTask.title,
      isCompleted: deletedTask.is_completed,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, index, show, update, deleteTask };
