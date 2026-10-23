import { pool, inTransaction } from '../config/db.js';
import { canTransitionStatus } from '../domain/complaintWorkflow.js';

const fields = `c.id, c.title, c.description, c.category, c.location, c.priority, c.status, c.reporter_id, r.name AS reporter_name, c.assigned_staff_id, s.name AS staff_name, c.resolution_comment, c.rejection_reason, c.photo_filename IS NOT NULL AS has_photo, c.created_at, c.updated_at`;

export async function createComplaint(input, reporterId, photoFilename = null) {
  return inTransaction(async (db) => {
    const { rows } = await db.query('INSERT INTO complaints (title, description, category, location, reporter_id, photo_filename) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, description, category, location, priority, status, reporter_id, photo_filename IS NOT NULL AS has_photo, created_at, updated_at', [input.title, input.description, input.category, input.location, reporterId, photoFilename]);
    await db.query("INSERT INTO complaint_history (complaint_id, actor_id, event_type, new_value) VALUES ($1,$2,'status','Submitted')", [rows[0].id, reporterId]);
    return rows[0];
  });
}

export async function findDuplicateCandidates(category) {
  const { rows } = await pool.query("SELECT id, title, description, category, location, status FROM complaints WHERE category=$1 AND status <> 'Rejected' ORDER BY updated_at DESC LIMIT 250", [category]);
  return rows;
}

export async function getComplaintPhotoRecord(id) {
  const { rows } = await pool.query('SELECT id, reporter_id, assigned_staff_id, photo_filename FROM complaints WHERE id=$1', [id]);
  return rows[0] || null;
}

export async function listComplaints(user, filters) {
  const where = []; const values = [];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
  if (user.role === 'student') add('c.reporter_id = ?', user.id);
  if (user.role === 'staff') add('c.assigned_staff_id = ?', user.id);
  if (filters.status) add('c.status = ?', filters.status);
  if (filters.category) add('c.category = ?', filters.category);
  if (filters.priority) add('c.priority = ?', filters.priority);
  if (filters.location) add('c.location ILIKE ?', `%${filters.location}%`);
  if (filters.search) { values.push(`%${filters.search}%`); where.push(`(c.title ILIKE $${values.length} OR c.description ILIKE $${values.length} OR c.location ILIKE $${values.length})`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT ${fields} FROM complaints c JOIN users r ON r.id=c.reporter_id LEFT JOIN users s ON s.id=c.assigned_staff_id ${clause} ORDER BY c.updated_at DESC LIMIT 200`, values);
  return rows;
}

export async function getComplaint(id) {
  const { rows } = await pool.query(`SELECT ${fields} FROM complaints c JOIN users r ON r.id=c.reporter_id LEFT JOIN users s ON s.id=c.assigned_staff_id WHERE c.id=$1`, [id]);
  if (!rows[0]) return null;
  const history = await pool.query(`SELECT h.id, h.event_type, h.previous_value, h.new_value, h.comment, h.created_at, u.name AS actor_name FROM complaint_history h LEFT JOIN users u ON u.id=h.actor_id WHERE h.complaint_id=$1 ORDER BY h.created_at ASC, h.id ASC`, [id]);
  const assignments = await pool.query(`SELECT a.id, a.staff_id, a.assigned_at, staff.name AS staff_name, admin.name AS assigned_by_name FROM assignments a JOIN users staff ON staff.id=a.staff_id JOIN users admin ON admin.id=a.assigned_by WHERE a.complaint_id=$1 ORDER BY a.assigned_at ASC`, [id]);
  return { ...rows[0], history: history.rows, assignments: assignments.rows };
}

export async function assignComplaint(id, staffId, adminId) {
  return inTransaction(async (db) => {
    const { rows } = await db.query('SELECT * FROM complaints WHERE id=$1 FOR UPDATE', [id]);
    const complaint = rows[0];
    if (!complaint) return null;
    const staff = await db.query("SELECT id FROM users WHERE id=$1 AND role='staff'", [staffId]);
    if (!staff.rowCount) return { invalidStaff: true };
    if (['Resolved', 'Rejected'].includes(complaint.status)) return { invalidStatus: true };
    const oldStaff = complaint.assigned_staff_id;
    const nextStatus = complaint.status === 'Submitted' ? 'Assigned' : complaint.status;
    await db.query("INSERT INTO assignments (complaint_id, staff_id, assigned_by) VALUES ($1,$2,$3)", [id, staffId, adminId]);
    await db.query('UPDATE complaints SET assigned_staff_id=$2, status=$3, updated_at=NOW() WHERE id=$1', [id, staffId, nextStatus]);
    await db.query("INSERT INTO complaint_history (complaint_id, actor_id, event_type, previous_value, new_value) VALUES ($1,$2,'assignment',$3,$4)", [id, adminId, oldStaff ? String(oldStaff) : null, String(staffId)]);
    if (complaint.status !== nextStatus) await db.query("INSERT INTO complaint_history (complaint_id, actor_id, event_type, previous_value, new_value) VALUES ($1,$2,'status',$3,$4)", [id, adminId, complaint.status, nextStatus]);
    return { ok: true };
  });
}

export async function updateStatus(id, actorId, staffId, status, comment) {
  return inTransaction(async (db) => {
    const { rows } = await db.query('SELECT * FROM complaints WHERE id=$1 FOR UPDATE', [id]);
    const complaint = rows[0];
    if (!complaint) return { missing: true };
    if (String(complaint.assigned_staff_id) !== String(staffId)) return { forbidden: true };
    const valid = canTransitionStatus(complaint.status, status);
    if (!valid) return { invalidStatus: true, current: complaint.status };
    if (status === 'Resolved') await db.query("UPDATE complaints SET status=$2, resolution_comment=$3, updated_at=NOW() WHERE id=$1", [id, status, comment]);
    else await db.query("UPDATE complaints SET status=$2, updated_at=NOW() WHERE id=$1", [id, status]);
    await db.query("INSERT INTO complaint_history (complaint_id, actor_id, event_type, previous_value, new_value, comment) VALUES ($1,$2,'status',$3,$4,$5)", [id, actorId, complaint.status, status, comment]);
    return { ok: true };
  });
}

export async function rejectComplaint(id, actorId, reason) {
  return inTransaction(async (db) => {
    const { rows } = await db.query('SELECT * FROM complaints WHERE id=$1 FOR UPDATE', [id]);
    const complaint = rows[0];
    if (!complaint) return { missing: true };
    if (['Resolved', 'Rejected'].includes(complaint.status)) return { invalidStatus: true };
    await db.query("UPDATE complaints SET status='Rejected', rejection_reason=$2, updated_at=NOW() WHERE id=$1", [id, reason]);
    await db.query("INSERT INTO complaint_history (complaint_id, actor_id, event_type, previous_value, new_value, comment) VALUES ($1,$2,'status',$3,'Rejected',$4)", [id, actorId, complaint.status, reason]);
    return { ok: true };
  });
}

export async function updatePriority(id, actorId, priority) {
  return inTransaction(async (db) => {
    const { rows } = await db.query('SELECT priority FROM complaints WHERE id=$1 FOR UPDATE', [id]);
    if (!rows[0]) return false;
    if (rows[0].priority !== priority) {
      await db.query('UPDATE complaints SET priority=$2, updated_at=NOW() WHERE id=$1', [id, priority]);
      await db.query("INSERT INTO complaint_history (complaint_id, actor_id, event_type, previous_value, new_value) VALUES ($1,$2,'priority',$3,$4)", [id, actorId, rows[0].priority, priority]);
    }
    return true;
  });
}

export async function dashboard() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='Submitted')::int AS submitted, COUNT(*) FILTER (WHERE status='Assigned')::int AS assigned, COUNT(*) FILTER (WHERE status='In Progress')::int AS in_progress, COUNT(*) FILTER (WHERE status='Resolved')::int AS resolved, COUNT(*) FILTER (WHERE status='Rejected')::int AS rejected FROM complaints`);
  const { rows: categoryRows } = await pool.query('SELECT category, COUNT(*)::int AS count FROM complaints GROUP BY category ORDER BY count DESC');
  return { ...rows[0], categories: categoryRows };
}

// One atomic update claims each newly overdue complaint before writing its audit event.
// Repeated/concurrent sweeps only return records whose escalation flag was still false.
export async function escalateOverdueComplaints(thresholdDays) {
  return inTransaction(async (db) => {
    const { rows } = await db.query(`
      UPDATE complaints
      SET is_escalated=TRUE, escalated_at=COALESCE(escalated_at, NOW())
      WHERE is_escalated=FALSE
        AND status IN ('Submitted', 'Assigned', 'In Progress')
        AND created_at < NOW() - make_interval(days => $1::int)
      RETURNING id
    `, [thresholdDays]);

    for (const { id } of rows) {
      await db.query(`
        INSERT INTO complaint_history (complaint_id, actor_id, event_type, new_value, comment)
        VALUES ($1, NULL, 'escalation', 'Escalated', $2)
      `, [id, `Automatically escalated after more than ${thresholdDays} days unresolved.`]);
    }
    return rows.length;
  });
}

export async function listEscalatedComplaints(filters) {
  const conditions = ["c.is_escalated=TRUE", "c.status IN ('Submitted', 'Assigned', 'In Progress')"];
  const values = [];
  if (filters.priority) { values.push(filters.priority); conditions.push(`c.priority=$${values.length}`); }
  if (filters.status) { values.push(filters.status); conditions.push(`c.status=$${values.length}`); }
  const sortColumns = { age_desc: 'c.created_at ASC', age_asc: 'c.created_at DESC' };
  const orderBy = sortColumns[filters.sort] || sortColumns.age_desc;
  const { rows } = await pool.query(`
    SELECT c.id, c.title, c.category, c.priority, c.location, c.status,
      c.created_at, c.escalated_at, s.name AS staff_name,
      FLOOR(EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400)::int AS days_pending
    FROM complaints c
    LEFT JOIN users s ON s.id=c.assigned_staff_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}, c.id DESC
  `, values);
  return rows;
}

export async function listStaff() {
  const { rows } = await pool.query("SELECT id, name, email FROM users WHERE role='staff' ORDER BY name"); return rows;
}
