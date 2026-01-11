class Lesson {
  constructor(db) {
    this.db = db;
  }

  async create(lessonData) {
    const sql = `
      INSERT INTO lessons (title, file_path, file_type)
      VALUES (?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      lessonData.title,
      lessonData.filePath,
      lessonData.fileType
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM lessons WHERE id = ?';
    return await this.db.get(sql, [id]);
  }

  async getAll() {
    const sql = 'SELECT * FROM lessons ORDER BY uploaded_at DESC';
    return await this.db.all(sql);
  }

  async getActive() {
    const sql = 'SELECT * FROM lessons WHERE active = 1';
    return await this.db.get(sql);
  }

  async setActive(id, active) {
    const sql = 'UPDATE lessons SET active = ? WHERE id = ?';
    await this.db.run(sql, [active, id]);
  }

  async setPublished(id, published) {
    const sql = 'UPDATE lessons SET published = ? WHERE id = ?';
    await this.db.run(sql, [published, id]);
  }

  async update(id, data) {
    const sql = `
      UPDATE lessons 
      SET title = ?, file_path = ?, file_type = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [
      data.title,
      data.filePath,
      data.fileType,
      id
    ]);
  }

  async delete(id) {
    const sql = 'DELETE FROM lessons WHERE id = ?';
    await this.db.run(sql, [id]);
  }

  async updateSlideCount(id, count) {
    const sql = 'UPDATE lessons SET slide_count = ? WHERE id = ?';
    await this.db.run(sql, [count, id]);
  }

  async updateHasSlides(id, hasSlides) {
    const sql = 'UPDATE lessons SET has_slides = ? WHERE id = ?';
    await this.db.run(sql, [hasSlides, id]);
  }
}

module.exports = Lesson;