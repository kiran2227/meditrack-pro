const db = require('../config/database');

class Medicine {
  // ✅ Create a new medicine record
  static async create({
    user_id,
    name,
    dosage,
    time,
    frequency,
    stock,
    refill_reminder,
    voice_alert_type,
    status
  }) {
    const [result] = await db.execute(
      `INSERT INTO medicines 
        (user_id, name, dosage, time, frequency, stock, refill_reminder, voice_alert_type, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, name, dosage, time, frequency, stock, refill_reminder, voice_alert_type, status]
    );
    return result.insertId;
  }

  // ✅ Fetch all medicines for a specific user
  static async findByUserId(user_id) {
    const [rows] = await db.execute(
      `SELECT * FROM medicines WHERE user_id = ? ORDER BY id DESC`,
      [user_id]
    );
    return rows;
  }

  // ✅ Fetch single medicine by ID
  static async findById(id) {
    const [rows] = await db.execute(`SELECT * FROM medicines WHERE id = ?`, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  // ✅ Find all medicine entries with the same base name (for multiple times)
  static async findByBaseName(user_id, baseName) {
    const [rows] = await db.execute(
      `SELECT * FROM medicines 
       WHERE user_id = ? 
         AND (name = ? OR name LIKE ?)
       ORDER BY id ASC`,
      [user_id, baseName, `${baseName} (Time %)`]
    );
    return rows;
  }

  // ✅ Update stock for a specific medicine
  static async updateStock(id, newStock) {
    await db.execute(`UPDATE medicines SET stock = ? WHERE id = ?`, [newStock, id]);
  }

  // ✅ Update status (e.g., pending, taken, missed)
  static async updateStatus(id, status) {
    await db.execute(`UPDATE medicines SET status = ? WHERE id = ?`, [status, id]);
  }

  // ✅ Delete a specific medicine
  static async delete(id) {
    await db.execute(`DELETE FROM medicines WHERE id = ?`, [id]);
  }

  // ✅ Fetch reminders due for a user (optional, used in reminder checkers)
  static async findDueReminders(user_id) {
    const [rows] = await db.execute(
      `SELECT * FROM medicines 
       WHERE user_id = ? 
         AND status = 'pending'
         AND TIME_FORMAT(time, '%H:%i') <= TIME_FORMAT(NOW(), '%H:%i') 
         AND DATE(created_at) = CURDATE()`,
      [user_id]
    );
    return rows;
  }

  // ✅ Generic update method (used in edit functionality)
  static async update(id, fields) {
    // Convert JS object to SQL SET clause dynamically
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return;

    const sql = `UPDATE medicines SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    await db.execute(sql, values);
  }

  // ✅ Combined update for both status and stock (optional convenience)
  static async updateStatusAndStock(id, status, stock) {
    await db.execute(`UPDATE medicines SET status = ?, stock = ? WHERE id = ?`, [status, stock, id]);
  }
}
module.exports = Medicine;
