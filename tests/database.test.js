const Database = require('../database');
const Lesson = require('../models/lesson');
const Task = require('../models/task');
const Student = require('../models/student');
const Submission = require('../models/submission');
const fs = require('fs');
const path = require('path');

class DatabaseTest {
  constructor() {
    this.testDbPath = path.join(__dirname, 'test-database.db');
    if (fs.existsSync(this.testDbPath)) {
      fs.unlinkSync(this.testDbPath);
    }
  }

  setup() {
    const testDB = new Database();
    testDB.db.pragma('journal_mode = WAL');
    return testDB.getDatabase();
  }

  cleanup() {
    if (fs.existsSync(this.testDbPath)) {
      fs.unlinkSync(this.testDbPath);
    }
  }

  async runAll() {
    console.log('开始运行数据库测试...\n');

    try {
      await this.testLesson();
      await this.testTask();
      await this.testStudent();
      await this.testSubmission();
      console.log('\n所有测试通过！');
    } catch (error) {
      console.error('\n测试失败:', error);
    } finally {
      this.cleanup();
    }
  }

  async testLesson() {
    console.log('测试 Lesson 模型...');
    const db = this.setup();
    const lessonModel = new Lesson(db);

    const lessonId = lessonModel.create({
      title: '测试课件',
      filePath: '/test/path.pptx',
      fileType: '.pptx'
    });

    console.assert(lessonId > 0, '课件创建失败');

    const lesson = lessonModel.getById(lessonId);
    console.assert(lesson.title === '测试课件', '课件获取失败');

    const lessons = lessonModel.getAll();
    console.assert(lessons.length === 1, '课件列表获取失败');

    lessonModel.setActive(lessonId, true);
    const activeLesson = lessonModel.getActive();
    console.assert(activeLesson.id === lessonId, '激活课件设置失败');

    lessonModel.delete(lessonId);
    const deletedLesson = lessonModel.getById(lessonId);
    console.assert(deletedLesson === undefined, '课件删除失败');

    console.log('✓ Lesson 模型测试通过\n');
  }

  async testTask() {
    console.log('测试 Task 模型...');
    const db = this.setup();
    const lessonModel = new Lesson(db);
    const taskModel = new Task(db);

    const lessonId = lessonModel.create({
      title: '测试课件',
      filePath: '/test/path.pptx',
      fileType: '.pptx'
    });

    const taskId = taskModel.create({
      lessonId,
      title: '测试任务',
      type: 'choice',
      content: '题目内容',
      correctAnswer: 'A',
      points: 100
    });

    console.assert(taskId > 0, '任务创建失败');

    const task = taskModel.getById(taskId);
    console.assert(task.title === '测试任务', '任务获取失败');

    const tasks = taskModel.getByLessonId(lessonId);
    console.assert(tasks.length === 1, '任务列表获取失败');

    taskModel.setPublished(taskId, true);
    const publishedTask = taskModel.getById(taskId);
    console.assert(publishedTask.published === 1, '发布任务设置失败');

    console.log('✓ Task 模型测试通过\n');
  }

  async testStudent() {
    console.log('测试 Student 模型...');
    const db = this.setup();
    const studentModel = new Student(db);

    const studentId = studentModel.create({
      name: '测试学生',
      studentNumber: 'STU001',
      deviceId: 'device_123',
      socketId: 'socket_456'
    });

    console.assert(studentId > 0, '学生创建失败');

    const student = studentModel.getById(studentId);
    console.assert(student.name === '测试学生', '学生获取失败');

    const studentByNumber = studentModel.getByStudentNumber('STU001');
    console.assert(studentByNumber.id === studentId, '按学号查询失败');

    const studentByDevice = studentModel.getByDeviceId('device_123');
    console.assert(studentByDevice.id === studentId, '按设备ID查询失败');

    studentModel.updateSocketId(studentId, 'new_socket');
    const updatedStudent = studentModel.getById(studentId);
    console.assert(updatedStudent.socket_id === 'new_socket', 'Socket ID更新失败');

    console.log('✓ Student 模型测试通过\n');
  }

  async testSubmission() {
    console.log('测试 Submission 模型...');
    const db = this.setup();
    const lessonModel = new Lesson(db);
    const taskModel = new Task(db);
    const studentModel = new Student(db);
    const submissionModel = new Submission(db);

    const lessonId = lessonModel.create({
      title: '测试课件',
      filePath: '/test/path.pptx',
      fileType: '.pptx'
    });

    const taskId = taskModel.create({
      lessonId,
      title: '测试任务',
      type: 'essay',
      content: '题目内容',
      correctAnswer: '参考答案',
      points: 100
    });

    const studentId = studentModel.create({
      name: '测试学生',
      studentNumber: 'STU001',
      deviceId: 'device_123',
      socketId: 'socket_456'
    });

    const submissionId = submissionModel.create({
      studentId,
      taskId,
      answer: '学生答案',
      filePath: '/test/answer.txt'
    });

    console.assert(submissionId > 0, '提交创建失败');

    const submission = submissionModel.getById(submissionId);
    console.assert(submission.answer === '学生答案', '提交获取失败');

    const taskSubmissions = submissionModel.getByTaskId(taskId);
    console.assert(taskSubmissions.length === 1, '按任务ID查询失败');

    const studentSubmissions = submissionModel.getByStudentId(studentId);
    console.assert(studentSubmissions.length === 1, '按学生ID查询失败');

    const ungraded = submissionModel.getUngraded();
    console.assert(ungraded.length === 1, '未批改提交查询失败');

    submissionModel.updateGrade(submissionId, {
      score: 85,
      aiFeedback: '优秀',
      teacherFeedback: '同意'
    });

    const gradedSubmission = submissionModel.getById(submissionId);
    console.assert(gradedSubmission.score === 85, '批改更新失败');

    const stats = submissionModel.getStats();
    console.assert(stats.total === 1, '统计数据错误');

    console.log('✓ Submission 模型测试通过\n');
  }
}

module.exports = DatabaseTest;