const { pool } = require('../config/database');

class VoiceAlert {
  static async create(alertData) {
    const { user_id, medicine_id, file_name, file_path, is_default } = alertData;
    const [result] = await pool.execute(
      'INSERT INTO voice_alerts (user_id, medicine_id, file_name, file_path, is_default) VALUES (?, ?, ?, ?, ?)',
      [user_id, medicine_id, file_name, file_path, is_default]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM voice_alerts WHERE user_id = ?',
      [userId]
    );
    return rows;
  }

  static async findByMedicineId(medicineId) {
    const [rows] = await pool.execute(
      'SELECT * FROM voice_alerts WHERE medicine_id = ?',
      [medicineId]
    );
    return rows[0];
  }

  static async delete(id) {
    await pool.execute('DELETE FROM voice_alerts WHERE id = ?', [id]);
  }
}

module.exports = VoiceAlert;