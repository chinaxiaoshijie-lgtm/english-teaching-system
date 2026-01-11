const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Student = require('../models/student');
const Submission = require('../models/submission');
const AliCloudService = require('../services/alicloud-service');
const ClassroomSession = require('../models/classroom-session');
const SlideService = require('../services/slide-service');

const router = express.Router();
const alicloudService = new AliCloudService();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/submissions');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

router.post('/join', async (req, res) => {
  try {
    const { name, studentNumber, deviceId, socketId } = req.body;
    const db = req.app.get('db');
    const studentModel = new Student(db);

    let student = await studentModel.getByStudentNumber(studentNumber);
    
    if (student) {
      await studentModel.update(student.id, {
        name,
        deviceId,
        socketId
      });
      await studentModel.updateLastActive(student.id);
    } else {
      const studentId = await studentModel.create({
        name,
        studentNumber,
        deviceId,
        socketId
      });
      student = await studentModel.getById(studentId);
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error('Join error:', error);
    res.status(500).json({ error: '加入课堂失败' });
  }
});

router.get('/lesson/current', async (req, res) => {
  try {
    const db = req.app.get('db');
    const Lesson = require('../models/lesson');
    const lessonModel = new Lesson(db);
    const lesson = await lessonModel.getActive();
    
    if (!lesson) {
      return res.status(404).json({ error: '暂无激活的课件' });
    }
    
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: '获取课件失败' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const db = req.app.get('db');
    const Task = require('../models/task');
    const taskModel = new Task(db);
    const tasks = await taskModel.getPublished();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: '获取任务失败' });
  }
});

router.post('/submit', upload.single('file'), async (req, res) => {
  try {
    const { taskId, answer, studentId } = req.body;
    const file = req.file;

    const db = req.app.get('db');
    const submissionModel = new Submission(db);

    const submissionId = await submissionModel.create({
      studentId: parseInt(studentId),
      taskId: parseInt(taskId),
      answer,
      filePath: file ? `/uploads/submissions/${file.filename}` : null
    });

    const io = req.app.get('io');
    const submission = await submissionModel.getById(submissionId);
    
    io.emit('student:submission', {
      submissionId,
      studentId: parseInt(studentId),
      taskId: parseInt(taskId),
      submittedAt: submission.submitted_at
    });

    res.json({ success: true, submissionId });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: '提交失败' });
  }
});

router.post('/submit-audio', upload.single('audio'), async (req, res) => {
  try {
    const { taskId, studentId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const db = req.app.get('db');
    const submissionModel = new Submission(db);

    const filePath = `/uploads/submissions/${file.filename}`;
    const submissionId = await submissionModel.create({
      studentId: parseInt(studentId),
      taskId: parseInt(taskId),
      answer: null,
      filePath
    });

    try {
      const audioBuffer = fs.readFileSync(path.join(__dirname, '..', filePath));
      const result = await alicloudService.transcribe(audioBuffer);
      
      await submissionModel.updateGrade(submissionId, {
        score: result.overallScore || 0,
        aiFeedback: JSON.stringify(result),
        aiGradeTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('Audio processing error:', error);
    }

    const io = req.app.get('io');
    io.emit('student:submission', {
      submissionId,
      studentId: parseInt(studentId),
      taskId: parseInt(taskId),
      submittedAt: new Date().toISOString()
    });

    res.json({ success: true, submissionId });
  } catch (error) {
    console.error('Submit audio error:', error);
    res.status(500).json({ error: '提交音频失败' });
  }
});

router.get('/my-submissions/:studentId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const submissionModel = new Submission(db);
    const submissions = await submissionModel.getByStudentId(parseInt(req.params.studentId));
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: '获取提交记录失败' });
  }
});

router.get('/my-stats/:studentId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const submissionModel = new Submission(db);
    
    const submissions = await submissionModel.getByStudentId(parseInt(req.params.studentId));
    const graded = submissions.filter(s => s.score !== null);
    const avgScore = graded.length > 0 
      ? graded.reduce((sum, s) => sum + s.score, 0) / graded.length 
      : 0;

    res.json({
      totalSubmissions: submissions.length,
      gradedSubmissions: graded.length,
      averageScore: avgScore.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

router.get('/class-session', async (req, res) => {
  try {
    const db = req.app.get('db');
    const classroomSessionModel = new ClassroomSession(db);
    const session = await classroomSessionModel.getActive();

    if (!session) {
      return res.json({ active: false });
    }

    const Lesson = require('../models/lesson');
    const lessonModel = new Lesson(db);
    const lesson = await lessonModel.getById(session.lesson_id);

    res.json({
      active: true,
      session,
      lesson
    });
  } catch (error) {
    console.error('Get class session error:', error);
    res.status(500).json({ error: '获取课堂会话失败' });
  }
});

router.get('/lesson/:lessonId/slides', async (req, res) => {
  try {
    const db = req.app.get('db');
    const slideService = new SlideService(db);
    const slides = await slideService.getSlides(parseInt(req.params.lessonId));
    res.json(slides);
  } catch (error) {
    console.error('Get slides error:', error);
    res.status(500).json({ error: '获取幻灯片失败' });
  }
});

module.exports = router;