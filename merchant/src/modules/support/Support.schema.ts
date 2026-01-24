import Joi from "joi";

export const contactSupportSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name cannot exceed 100 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  subject: Joi.string().trim().min(3).max(200).required().messages({
    "string.min": "Subject must be at least 3 characters",
    "string.max": "Subject cannot exceed 200 characters",
    "any.required": "Subject is required",
  }),
  message: Joi.string().trim().min(10).max(2000).required().messages({
    "string.min": "Message must be at least 10 characters",
    "string.max": "Message cannot exceed 2000 characters",
    "any.required": "Message is required",
  }),
});
