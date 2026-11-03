const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

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

    const newTask = {
      id: taskCounter(),
      title: value.title,
      isCompleted: value.isCompleted,
      userId: global.user_id.email,
    };

    global.tasks.push(newTask);

    const { userId, ...sanitizedTask } = newTask; // Exclude userId from the response

    return res.status(201).json(sanitizedTask);
  } catch (error) {
    next(error);
  }
}

async function index(req, res, next) {
  try {
    const userTasks = global.tasks.filter(
      (task) => task.userId === global.user_id.email,
    );

    if (userTasks.length === 0) {
      return res.status(404).json({ message: "No tasks found" });
    }

    const sanitizedTasks = userTasks.map((task) => {
      const { userId, ...sanitizedTask } = task;
      return sanitizedTask;
    });

    return res.status(200).json(sanitizedTasks);
  } catch (error) {
    next(error);
  }
}

async function show(req, res, next) {
  try {
    const taskId = parseInt(req.params?.id);
    if (!Number(taskId)) {
      return res.status(400).json({ message: "ID is not valid" });
    }
    const task = global.tasks.find(
      (t) => t.id === taskId && t.userId === global.user_id.email,
    );
    if (!task) {
      return res.status(404).json({ message: "No task found" });
    }
    const { userId, ...sanitizedTask } = task;
    return res.status(200).json(sanitizedTask);
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
    const taskId = parseInt(req.params?.id);
    const task = global.tasks.find(
      (t) => t.id === taskId && t.userId === global.user_id.email,
    );
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    Object.assign(task, value);
    const { userId, ...sanitizedTask } = task;
    return res.status(200).json(sanitizedTask);
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const taskId = parseInt(req.params?.id);
    if (!Number(taskId)) {
      return res.status(400).json({ message: "ID is not valid" });
    }
    const taskIndex = global.tasks.findIndex(
      (task) => task.id === taskId && task.userId === global.user_id.email,
    );
    if (taskIndex === -1) {
      return res.status(404).json({ message: "Task not found" });
    }
    const { userId, ...deletedTask } = global.tasks[taskIndex];
    global.tasks.splice(taskIndex, 1);
    return res.status(200).json(deletedTask);
  } catch (error) {
    next(error);
  }
}

module.exports = { create, index, show, update, deleteTask };
