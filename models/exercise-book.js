class ExerciseBook {
  constructor(db) {
    this.db = db;
  }

  async create(exerciseBookData) {
    const sql = `
      INSERT INTO exercise_books (lesson_id, title, description)
      VALUES (?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      exerciseBookData.lessonId || null,
      exerciseBookData.title,
      exerciseBookData.description || null
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM exercise_books WHERE id = ?';
    return await this.db.get(sql, [id]);
  }

  async getAll() {
    const sql = 'SELECT * FROM exercise_books ORDER BY created_at DESC';
    return await this.db.all(sql);
  }

  async getByLessonId(lessonId) {
    const sql = 'SELECT * FROM exercise_books WHERE lesson_id = ? ORDER BY created_at DESC';
    return await this.db.all(sql, [lessonId]);
  }

  async update(id, data) {
    const sql = `
      UPDATE exercise_books
      SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await this.db.run(sql, [
      data.title,
      data.description || null,
      id
    ]);
  }

  async delete(id) {
    const sql = 'DELETE FROM exercise_books WHERE id = ?';
    await this.db.run(sql, [id]);
  }

  async getWithQuestions(id) {
    const exerciseBook = await this.getById(id);
    if (!exerciseBook) return null;

    const Question = require('./question');
    const questionModel = new Question(this.db);
    const questions = await questionModel.getByExerciseBookId(id);

    return {
      ...exerciseBook,
      questions
    };
  }
}

module.exports = ExerciseBook;