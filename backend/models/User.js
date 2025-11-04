const { pool } = require('../config/database');

class User {
  static async create(userData) {
    const { name, email, password, age, medical_history, guardian_name, guardian_contact } = userData;
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, age, medical_history, guardian_name, guardian_contact) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, password, age, medical_history, guardian_name, guardian_contact]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT id, name, email, age, medical_history, guardian_name, guardian_contact FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  static async updateProfile(id, profileData) {
    const { name, age, medical_history, guardian_name, guardian_contact } = profileData;
    await pool.execute(
      'UPDATE users SET name = ?, age = ?, medical_history = ?, guardian_name = ?, guardian_contact = ? WHERE id = ?',
      [name, age, medical_history, guardian_name, guardian_contact, id]
    );
  }
}

module.exports = User;