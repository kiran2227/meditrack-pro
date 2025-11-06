const { pool } = require('../config/database');

class History {
  static async create(historyData) {
    const { user_id, medicine_id, medicine_name, dosage, scheduled_time, actual_time, status, notes } = historyData;
    const [result] = await pool.execute(
      `INSERT INTO history (user_id, medicine_id, medicine_name, dosage, scheduled_time, actual_time, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, medicine_id, medicine_name, dosage, scheduled_time, actual_time, status, notes]
    );
    return result.insertId;
  }
  static async findTodayByMedicineId(medicineId) {
    const [history] = await db.execute(
      'SELECT * FROM history WHERE medicine_id = ? AND DATE(created_at) = CURDATE() AND status = "taken"',
      [medicineId]
    );
    return history;
  }

  static async findByUserId(userId, days = 30) {
    const [rows] = await pool.execute(
      `SELECT * FROM history 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY created_at DESC`,
      [userId, days]
    );
    return rows;
  }

  static async getExportData(userId) {
    const [rows] = await pool.execute(
      `SELECT 
         h.medicine_name,
         h.dosage,
         h.scheduled_time,
         h.actual_time,
         h.status,
         h.notes,
         h.created_at,
         m.frequency,
         m.stock
       FROM history h
       LEFT JOIN medicines m ON h.medicine_id = m.id
       WHERE h.user_id = ?
       ORDER BY h.created_at DESC`,
      [userId]
    );
    return rows;
  }
}

module.exports = History;