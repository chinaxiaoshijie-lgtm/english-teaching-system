class Student {
  constructor(db) {
    this.db = db;
  }

  async create(studentData) {
    const sql = `
      INSERT INTO students (name, student_number, device_id, socket_id)
      VALUES (?, ?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      studentData.name,
      studentData.studentNumber,
      studentData.deviceId,
      studentData.socketId
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM students WHERE id = ?';
    return await this.db.get(sql, [id]);
  }

  async getByStudentNumber(studentNumber) {
    const sql = 'SELECT * FROM students WHERE student_number = ?';
    return await this.db.get(sql, [studentNumber]);
  }

  async getByDeviceId(deviceId) {
    const sql = 'SELECT * FROM students WHERE device_id = ?';
    return await this.db.get(sql, [deviceId]);
  }

  async getBySocketId(socketId) {
    const sql = 'SELECT * FROM students WHERE socket_id = ?';
    return await this.db.get(sql, [socketId]);
  }

  async getAll() {
    const sql = 'SELECT * FROM students ORDER BY joined_at DESC';
    return await this.db.all(sql);
  }

  async getActiveStudents(minutes = 30) {
    const sql = `
      SELECT * FROM students 
      WHERE last_active >= datetime('now', '-' || ? || ' minutes')
      ORDER BY last_active DESC
    `;
    return await this.db.all(sql, [minutes]);
  }

  async update(id, data) {
    const sql = `
      UPDATE students 
      SET name = ?, student_number = ?, device_id = ?, socket_id = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [
      data.name,
      data.studentNumber,
      data.deviceId,
      data.socketId,
      id
    ]);
  }

  async updateSocketId(id, socketId) {
    const sql = 'UPDATE students SET socket_id = ? WHERE id = ?';
    await this.db.run(sql, [socketId, id]);
  }

  async updateLastActive(id) {
    const sql = 'UPDATE students SET last_active = ? WHERE id = ?';
    await this.db.run(sql, [new Date().toISOString(), id]);
  }

  async delete(id) {
    const sql = 'DELETE FROM students WHERE id = ?';
    await this.db.run(sql, [id]);
  }
}

module.exports = Student;