const { pool } = require('../config/database');

class Medicine {
  
  static async create(medicineData) {
    const { user_id, name, dosage, time, frequency, stock, refill_reminder, voice_alert_path } = medicineData;
    const [result] = await pool.execute(
      'INSERT INTO medicines (user_id, name, dosage, time, frequency, stock, refill_reminder, voice_alert_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, name, dosage, time, frequency, stock, refill_reminder, voice_alert_path]
    );
    return result.insertId;
  }
  // models/Medicine.js

  static async findByBaseName(userId, baseName) {
    // Implementation to find all medicines with the same base name
    const [medicines] = await db.execute(
      'SELECT * FROM medicines WHERE user_id = ? AND (name = ? OR name LIKE ?)',
      [userId, baseName, `${baseName} (Time %)`]
    );
    return medicines;
  }

  static async updateStock(medicineId, newStock) {
    const [result] = await db.execute(
      'UPDATE medicines SET stock = ? WHERE id = ?',
      [newStock, medicineId]
    );
    return result;
  }

  static async updateStatus(medicineId, status) {
    const [result] = await db.execute(
      'UPDATE medicines SET status = ?, taken_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, medicineId]
    );
    return result;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM medicines WHERE user_id = ? ORDER BY time',
      [userId]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM medicines WHERE id = ?', [id]);
    return rows[0];
  }

  static async updateStatus(id, status) {
    await pool.execute(
      'UPDATE medicines SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  static async updateTakenTime(id) {
    await pool.execute(
      'UPDATE medicines SET status = "taken", taken_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  static async delete(id) {
    await pool.execute('DELETE FROM medicines WHERE id = ?', [id]);
  }

  static async getDueMedicines(userId) {
    const [rows] = await pool.execute(
      `SELECT * FROM medicines 
       WHERE user_id = ? AND status = 'pending' 
       AND TIME(time) <= TIME(CURRENT_TIME()) 
       ORDER BY time`,
      [userId]
    );
    return rows;
  }
}

module.exports = Medicine;