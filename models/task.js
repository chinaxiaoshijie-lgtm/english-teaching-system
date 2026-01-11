class Task {
  constructor(db) {
    this.db = db;
  }

  async create(taskData) {
    const sql = `
      INSERT INTO tasks (lesson_id, title, type, content, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      taskData.lessonId,
      taskData.title,
      taskData.type,
      taskData.content,
      taskData.correctAnswer,
      taskData.points || 100
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM tasks WHERE id = ?';
    return await this.db.get(sql, [id]);
  }

  async getByLessonId(lessonId) {
    const sql = 'SELECT * FROM tasks WHERE lesson_id = ? ORDER BY id';
    return await this.db.all(sql, [lessonId]);
  }

  async getAll() {
    const sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
    return await this.db.all(sql);
  }

  async getPublished() {
    const sql = 'SELECT * FROM tasks WHERE published = 1 ORDER BY id';
    return await this.db.all(sql);
  }

  async setPublished(id, published) {
    const publishedAt = published ? new Date().toISOString() : null;
    const sql = 'UPDATE tasks SET published = ?, published_at = ? WHERE id = ?';
    await this.db.run(sql, [published, publishedAt, id]);
  }

  async update(id, data) {
    const sql = `
      UPDATE tasks 
      SET title = ?, type = ?, content = ?, correct_answer = ?, points = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [
      data.title,
      data.type,
      data.content,
      data.correctAnswer,
      data.points,
      id
    ]);
  }

  async delete(id) {
    const sql = 'DELETE FROM tasks WHERE id = ?';
    await this.db.run(sql, [id]);
  }
}

module.exports = Task;