export function canAccessComplaint(complaint, user) {
  if (!complaint || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'student') return String(complaint.reporter_id) === String(user.id);
  if (user.role === 'staff') return String(complaint.assigned_staff_id) === String(user.id);
  return false;
}
