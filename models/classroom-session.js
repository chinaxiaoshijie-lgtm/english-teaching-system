class ClassroomSession {
  constructor(db) {
    this.db = db;
  }

  async create(sessionData) {
    const sql = `
      INSERT INTO classroom_sessions (lesson_id, is_active, current_page, total_pages)
      VALUES (?, 1, ?, ?)
    `;
    const result = await this.db.run(sql, [
      sessionData.lessonId,
      sessionData.currentPage || 0,
      sessionData.totalPages || 0
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM classroom_sessions WHERE id = ?';
    return await this.db.get(sql, [id]);
  }

  async getActive() {
    const sql = 'SELECT * FROM classroom_sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1';
    return await this.db.get(sql);
  }

  async getByLessonId(lessonId) {
    const sql = 'SELECT * FROM classroom_sessions WHERE lesson_id = ? ORDER BY id DESC';
    return await this.db.all(sql, [lessonId]);
  }

  async setActive(id, active) {
    const sql = 'UPDATE classroom_sessions SET is_active = ? WHERE id = ?';
    await this.db.run(sql, [active, id]);
  }

  async updateCurrentPage(id, pageNumber) {
    const sql = 'UPDATE classroom_sessions SET current_page = ? WHERE id = ?';
    await this.db.run(sql, [pageNumber, id]);
  }

  async updateTotalPages(id, totalPages) {
    const sql = 'UPDATE classroom_sessions SET total_pages = ? WHERE id = ?';
    await this.db.run(sql, [totalPages, id]);
  }

  async endSession(id) {
    const sql = 'UPDATE classroom_sessions SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?';
    await this.db.run(sql, [id]);
  }

  async update(id, data) {
    const updates = [];
    const params = [];

    if (data.currentPage !== undefined) {
      updates.push('current_page = ?');
      params.push(data.currentPage);
    }
    if (data.totalPages !== undefined) {
      updates.push('total_pages = ?');
      params.push(data.totalPages);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive);
    }
    if (data.endedAt !== undefined) {
      updates.push('ended_at = ?');
      params.push(data.endedAt);
    }

    params.push(id);

    const sql = `
      UPDATE classroom_sessions
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
    await this.db.run(sql, params);
  }

  async delete(id) {
    const sql = 'DELETE FROM classroom_sessions WHERE id = ?';
    await this.db.run(sql, [id]);
  }
}

module.exports = ClassroomSession;
