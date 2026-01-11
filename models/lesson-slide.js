class LessonSlide {
  constructor(db) {
    this.db = db;
  }

  async create(slideData) {
    const sql = `
      INSERT INTO lesson_slides (lesson_id, page_number, image_path)
      VALUES (?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      slideData.lessonId,
      slideData.pageNumber,
      slideData.imagePath
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM lesson_slides WHERE id = ?';
    return await this.db.get(sql, [id]);
  }

  async getByLessonId(lessonId) {
    const sql = 'SELECT * FROM lesson_slides WHERE lesson_id = ? ORDER BY page_number ASC';
    return await this.db.all(sql, [lessonId]);
  }

  async getByLessonIdAndPage(lessonId, pageNumber) {
    const sql = 'SELECT * FROM lesson_slides WHERE lesson_id = ? AND page_number = ?';
    return await this.db.get(sql, [lessonId, pageNumber]);
  }

  async countByLessonId(lessonId) {
    const sql = 'SELECT COUNT(*) as count FROM lesson_slides WHERE lesson_id = ?';
    const result = await this.db.get(sql, [lessonId]);
    return result.count;
  }

  async deleteByLessonId(lessonId) {
    const sql = 'DELETE FROM lesson_slides WHERE lesson_id = ?';
    await this.db.run(sql, [lessonId]);
  }

  async delete(id) {
    const sql = 'DELETE FROM lesson_slides WHERE id = ?';
    await this.db.run(sql, [id]);
  }

  async updateImagePath(id, imagePath) {
    const sql = 'UPDATE lesson_slides SET image_path = ? WHERE id = ?';
    await this.db.run(sql, [imagePath, id]);
  }
}

module.exports = LessonSlide;
