const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async initialize() {
    console.log('Initializing database...');
    
    try {
      await this.createLessonsTable();
      await this.createTasksTable();
      await this.createStudentsTable();
      await this.createSubmissionsTable();
      await this.createGradeLogsTable();
      await this.createClassroomSessionsTable();
      await this.createLessonSlidesTable();
      await this.addLessonSlideCountColumn();
      await this.addLessonTypeColumn();
      await this.createQuestionsTable();
      await this.createExerciseBooksTable();
      await this.createIndexes();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async createLessonsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT 0,
        published BOOLEAN DEFAULT 0
      )
    `;
    await this.exec(sql);
  }

  async createTasksTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        correct_answer TEXT,
        points INTEGER DEFAULT 100,
        published BOOLEAN DEFAULT 0,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id)
      )
    `;
    await this.exec(sql);
  }

  async createStudentsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        student_number TEXT UNIQUE,
        device_id TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME,
        socket_id TEXT
      )
    `;
    await this.exec(sql);
  }

  async createSubmissionsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        task_id INTEGER,
        answer TEXT,
        file_path TEXT,
        score REAL,
        ai_feedback TEXT,
        teacher_feedback TEXT,
        ai_grade_time DATETIME,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `;
    await this.exec(sql);
  }

  async createGradeLogsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS grade_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER,
        prompt TEXT,
        response TEXT,
        tokens_used INTEGER,
        cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES submissions(id)
      )
    `;
    await this.exec(sql);
  }

  async createClassroomSessionsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS classroom_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT 0,
        current_page INTEGER DEFAULT 0,
        total_pages INTEGER DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id)
      )
    `;
    await this.exec(sql);
  }

  async createLessonSlidesTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS lesson_slides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id),
        UNIQUE(lesson_id, page_number)
      )
    `;
    await this.exec(sql);
  }

  async addLessonSlideCountColumn() {
    try {
      await this.exec('ALTER TABLE lessons ADD COLUMN slide_count INTEGER DEFAULT 0');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.error('Error adding slide_count column:', error);
      }
    }

    try {
      await this.exec('ALTER TABLE lessons ADD COLUMN has_slides BOOLEAN DEFAULT 0');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.error('Error adding has_slides column:', error);
      }
    }
  }

  async addLessonTypeColumn() {
    try {
      await this.exec('ALTER TABLE lessons ADD COLUMN lesson_type TEXT DEFAULT "class_pdf"');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.error('Error adding lesson_type column:', error);
      }
    }

    try {
      await this.exec('ALTER TABLE lessons ADD COLUMN is_disabled BOOLEAN DEFAULT 0');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.error('Error adding is_disabled column:', error);
      }
    }
  }

  async createQuestionsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER,
        exercise_book_id INTEGER,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT,
        difficulty TEXT DEFAULT 'medium',
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id),
        FOREIGN KEY (exercise_book_id) REFERENCES exercise_books(id)
      )
    `;
    await this.exec(sql);
  }

  async createExerciseBooksTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS exercise_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id)
      )
    `;
    await this.exec(sql);
  }

  async createIndexes() {
    await this.exec('CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)');
    await this.exec('CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions(task_id)');
    await this.exec('CREATE INDEX IF NOT EXISTS idx_students_device ON students(device_id)');
    await this.exec('CREATE INDEX IF NOT EXISTS idx_classroom_sessions_active ON classroom_sessions(is_active)');
    await this.exec('CREATE INDEX IF NOT EXISTS idx_lesson_slides_lesson ON lesson_slides(lesson_id)');
  }

  getDatabase() {
    return this;
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = Database;