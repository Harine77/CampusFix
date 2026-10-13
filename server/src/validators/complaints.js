import { AppError } from '../middleware/errors.js';

export const categories = ['Electrical', 'Plumbing', 'Furniture', 'IT & Wi-Fi', 'Classroom Equipment', 'Cleanliness', 'Safety', 'Other'];
export const priorities = ['Low', 'Medium', 'High', 'Critical'];
const requiredText = (value, min, max, label) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new AppError(400, `${label} must be ${min}–${max} characters.`);
  return value.trim();
};

export function validateComplaint(body) {
  if (!categories.includes(body.category)) throw new AppError(400, 'Choose a valid category.');
  return { title: requiredText(body.title, 5, 140, 'Title'), description: requiredText(body.description, 15, 5000, 'Description'), category: body.category, location: requiredText(body.location, 2, 140, 'Location') };
}

export function validatePriority(value) { if (!priorities.includes(value)) throw new AppError(400, 'Choose a valid priority.'); return value; }
export function validateComment(value, label = 'Comment') { return requiredText(value, 3, 1000, label); }
