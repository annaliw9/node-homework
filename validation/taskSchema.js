const Joi = require("joi");

const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
  isCompleted: Joi.boolean().default(false).not(null),
});

const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).not(null),
  priority: Joi.string().valid("low", "medium", "high").not(null),
  isCompleted: Joi.boolean().not(null),
})
  .min(1)
  .message("No attributes to change were specified.");

module.exports = { taskSchema, patchTaskSchema };
