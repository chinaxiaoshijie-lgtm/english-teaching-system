class Question {
  constructor(db) {
    this.db = db;
  }

  async create(questionData) {
    const sql = `
      INSERT INTO questions (lesson_id, exercise_book_id, type, content, options, correct_answer, difficulty, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      questionData.lessonId || null,
      questionData.exerciseBookId || null,
      questionData.type,
      questionData.content,
      questionData.options ? JSON.stringify(questionData.options) : null,
      questionData.correctAnswer,
      questionData.difficulty || 'medium',
      questionData.tags ? JSON.stringify(questionData.tags) : null
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM questions WHERE id = ?';
    const row = await this.db.get(sql, [id]);
    if (row) {
      if (row.options) row.options = JSON.parse(row.options);
      if (row.tags) row.tags = JSON.parse(row.tags);
    }
    return row;
  }

  async getAll() {
    const sql = 'SELECT * FROM questions ORDER BY created_at DESC';
    const rows = await this.db.all(sql);
    rows.forEach(row => {
      if (row.options) row.options = JSON.parse(row.options);
      if (row.tags) row.tags = JSON.parse(row.tags);
    });
    return rows;
  }

  async getByLessonId(lessonId) {
    const sql = 'SELECT * FROM questions WHERE lesson_id = ? ORDER BY id';
    const rows = await this.db.all(sql, [lessonId]);
    rows.forEach(row => {
      if (row.options) row.options = JSON.parse(row.options);
      if (row.tags) row.tags = JSON.parse(row.tags);
    });
    return rows;
  }

  async getByExerciseBookId(exerciseBookId) {
    const sql = 'SELECT * FROM questions WHERE exercise_book_id = ? ORDER BY id';
    const rows = await this.db.all(sql, [exerciseBookId]);
    rows.forEach(row => {
      if (row.options) row.options = JSON.parse(row.options);
      if (row.tags) row.tags = JSON.parse(row.tags);
    });
    return rows;
  }

  async update(id, data) {
    const sql = `
      UPDATE questions
      SET type = ?, content = ?, options = ?, correct_answer = ?, difficulty = ?, tags = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [
      data.type,
      data.content,
      data.options ? JSON.stringify(data.options) : null,
      data.correctAnswer,
      data.difficulty || 'medium',
      data.tags ? JSON.stringify(data.tags) : null,
      id
    ]);
  }

  async delete(id) {
    const sql = 'DELETE FROM questions WHERE id = ?';
    await this.db.run(sql, [id]);
  }

  async deleteByLessonId(lessonId) {
    const sql = 'DELETE FROM questions WHERE lesson_id = ?';
    await this.db.run(sql, [lessonId]);
  }

  async deleteByExerciseBookId(exerciseBookId) {
    const sql = 'DELETE FROM questions WHERE exercise_book_id = ?';
    await this.db.run(sql, [exerciseBookId]);
  }
}

module.exports = Question;