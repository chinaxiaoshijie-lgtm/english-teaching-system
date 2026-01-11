class Submission {
  constructor(db) {
    this.db = db;
  }

  async create(submissionData) {
    const sql = `
      INSERT INTO submissions (student_id, task_id, answer, file_path)
      VALUES (?, ?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      submissionData.studentId,
      submissionData.taskId,
      submissionData.answer,
      submissionData.filePath
    ]);
    return result.lastInsertRowid;
  }

  async getById(id) {
    const sql = 'SELECT * FROM submissions WHERE id = ?';
    return await this.db.get(sql, [id]);
  }

  async getByTaskId(taskId) {
    const sql = `
      SELECT s.*, st.name as student_name, st.student_number
      FROM submissions s
      JOIN students st ON s.student_id = st.id
      WHERE s.task_id = ?
      ORDER BY s.submitted_at DESC
    `;
    return await this.db.all(sql, [taskId]);
  }

  async getByStudentId(studentId) {
    const sql = `
      SELECT s.*, t.title as task_title, t.type as task_type
      FROM submissions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.student_id = ?
      ORDER BY s.submitted_at DESC
    `;
    return await this.db.all(sql, [studentId]);
  }

  async getAll() {
    const sql = `
      SELECT s.*, st.name as student_name, t.title as task_title
      FROM submissions s
      JOIN students st ON s.student_id = st.id
      JOIN tasks t ON s.task_id = t.id
      ORDER BY s.submitted_at DESC
    `;
    return await this.db.all(sql);
  }

  async getUngraded() {
    const sql = `
      SELECT s.*, st.name as student_name, t.title as task_title, t.type as task_type
      FROM submissions s
      JOIN students st ON s.student_id = st.id
      JOIN tasks t ON s.task_id = t.id
      WHERE s.score IS NULL
      ORDER BY s.submitted_at ASC
    `;
    return await this.db.all(sql);
  }

  async getGraded(taskId = null) {
    let sql = `
      SELECT s.*, st.name as student_name, t.title as task_title
      FROM submissions s
      JOIN students st ON s.student_id = st.id
      JOIN tasks t ON s.task_id = t.id
      WHERE s.score IS NOT NULL
    `;
    const params = [];
    
    if (taskId) {
      sql += ' AND s.task_id = ?';
      params.push(taskId);
    }
    
    sql += ' ORDER BY s.submitted_at DESC';
    
    return await this.db.all(sql, params);
  }

  async getStats(taskId = null) {
    let sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as graded,
        AVG(score) as avg_score
      FROM submissions
    `;
    const params = [];
    
    if (taskId) {
      sql += ' WHERE task_id = ?';
      params.push(taskId);
    }
    
    return await this.db.get(sql, params);
  }

  async updateGrade(id, gradeData) {
    const sql = `
      UPDATE submissions 
      SET score = ?, ai_feedback = ?, teacher_feedback = ?, ai_grade_time = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [
      gradeData.score,
      gradeData.aiFeedback,
      gradeData.teacherFeedback,
      gradeData.aiGradeTime || new Date().toISOString(),
      id
    ]);
  }

  async delete(id) {
    const sql = 'DELETE FROM submissions WHERE id = ?';
    await this.db.run(sql, [id]);
  }
}

module.exports = Submission;