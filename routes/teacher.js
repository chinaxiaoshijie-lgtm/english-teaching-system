const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Lesson = require('../models/lesson');
const Task = require('../models/task');
const Student = require('../models/student');
const Submission = require('../models/submission');
const QwenService = require('../services/qwen-service');
const SlideService = require('../services/slide-service');
const ClassroomSession = require('../models/classroom-session');

const router = express.Router();
const qwenService = new QwenService();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/lessons');
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
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/upload-lesson', upload.single('file'), async (req, res) => {
  try {
    const { title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const db = req.app.get('db');
    const lessonModel = new Lesson(db);

    const lessonId = await lessonModel.create({
      title: title || path.basename(file.originalname, path.extname(file.originalname)),
      filePath: `/uploads/lessons/${file.filename}`,
      fileType: path.extname(file.originalname)
    });

    const filePath = `/uploads/lessons/${file.filename}`;

    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      try {
        const slideService = new SlideService(db);
        const result = await slideService.processLesson(lessonId, filePath);
        return res.json({ success: true, lessonId, filePath, slides: result.slides, slideCount: result.slideCount });
      } catch (slideError) {
        console.error('Error processing PDF slides:', slideError);
      }
    }

    res.json({ success: true, lessonId, filePath });
  } catch (error) {
    console.error('Upload lesson error:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

router.get('/lessons', async (req, res) => {
  try {
    const db = req.app.get('db');
    const lessonModel = new Lesson(db);
    const lessons = await lessonModel.getAll();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: '获取课件失败' });
  }
});

router.get('/lessons/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const lessonModel = new Lesson(db);
    const lesson = await lessonModel.getById(parseInt(req.params.id));
    
    if (!lesson) {
      return res.status(404).json({ error: '课件不存在' });
    }
    
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: '获取课件失败' });
  }
});

router.post('/publish-lesson/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const lessonModel = new Lesson(db);
    
    await lessonModel.setActive(parseInt(req.params.id), true);
    await lessonModel.setPublished(parseInt(req.params.id), true);

    const io = req.app.get('io');
    const lesson = await lessonModel.getById(parseInt(req.params.id));
    io.emit('lesson:published', lesson);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '发布课件失败' });
  }
});

router.post('/create-task', async (req, res) => {
  try {
    const db = req.app.get('db');
    const taskModel = new Task(db);

    const taskId = await taskModel.create(req.body);
    res.json({ success: true, taskId });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

router.post('/publish-task/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const taskModel = new Task(db);
    
    await taskModel.setPublished(parseInt(req.params.id), true);

    const io = req.app.get('io');
    const task = await taskModel.getById(parseInt(req.params.id));
    io.emit('task:published', task);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '发布任务失败' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const db = req.app.get('db');
    const taskModel = new Task(db);
    const tasks = await taskModel.getAll();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: '获取任务失败' });
  }
});

router.get('/tasks/lesson/:lessonId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const taskModel = new Task(db);
    const tasks = await taskModel.getByLessonId(parseInt(req.params.lessonId));
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: '获取任务失败' });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const db = req.app.get('db');
    const submissionModel = new Submission(db);
    const submissions = await submissionModel.getAll();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: '获取提交失败' });
  }
});

router.get('/submissions/task/:taskId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const submissionModel = new Submission(db);
    const submissions = await submissionModel.getByTaskId(parseInt(req.params.taskId));
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: '获取提交失败' });
  }
});

router.get('/submissions/ungraded', async (req, res) => {
  try {
    const db = req.app.get('db');
    const submissionModel = new Submission(db);
    const submissions = await submissionModel.getUngraded();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: '获取未批改提交失败' });
  }
});

router.post('/grade/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const submissionModel = new Submission(db);
    const taskModel = new Task(db);

    const submission = await submissionModel.getById(parseInt(req.params.id));
    if (!submission) {
      return res.status(404).json({ error: '提交不存在' });
    }

    const task = await taskModel.getById(submission.task_id);
    let gradeResult;

    switch (task.type) {
      case 'choice':
        gradeResult = await qwenService.gradeMultipleChoice(
          task.content,
          task.correct_answer,
          submission.answer
        );
        break;
      case 'fillblank':
        gradeResult = await qwenService.gradeFillBlank(
          task.content,
          task.correct_answer,
          submission.answer
        );
        break;
      case 'essay':
        gradeResult = await qwenService.gradeEssay(
          task.content,
          task.correct_answer,
          submission.answer
        );
        break;
      default:
        gradeResult = await qwenService.gradeEssay(
          task.content,
          task.correct_answer,
          submission.answer
        );
    }

    await submissionModel.updateGrade(submission.id, {
      score: gradeResult.score,
      aiFeedback: JSON.stringify(gradeResult),
      teacherFeedback: req.body.teacherFeedback
    });

    const io = req.app.get('io');
    io.emit('submission:graded', {
      submissionId: submission.id,
      studentId: submission.student_id,
      taskId: submission.task_id,
      score: gradeResult.score
    });

    res.json({ success: true, gradeResult });
  } catch (error) {
    console.error('Grade error:', error);
    res.status(500).json({ error: '批改失败' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const db = req.app.get('db');
    const studentModel = new Student(db);
    const students = await studentModel.getAll();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: '获取学生列表失败' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const db = req.app.get('db');
    const submissionModel = new Submission(db);
    const studentModel = new Student(db);
    const taskModel = new Task(db);

    const [
      totalStudents,
      activeStudents,
      totalTasks,
      totalSubmissions,
      gradedSubmissions,
      ungradedSubmissions,
      averageScore
    ] = await Promise.all([
      (await studentModel.getAll()).length,
      (await studentModel.getActiveStudents(30)).length,
      (await taskModel.getAll()).length,
      (await submissionModel.getAll()).length,
      (await submissionModel.getGraded()).length,
      (await submissionModel.getUngraded()).length,
      (await submissionModel.getStats()).avg_score
    ]);

    const stats = {
      totalStudents,
      activeStudents,
      totalTasks,
      totalSubmissions,
      gradedSubmissions,
      ungradedSubmissions,
      averageScore
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

router.post('/start-class/:lessonId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const classroomSessionModel = new ClassroomSession(db);
    const lessonModel = new Lesson(db);

    const lesson = await lessonModel.getById(parseInt(req.params.lessonId));
    if (!lesson) {
      return res.status(404).json({ error: '课件不存在' });
    }

    if (!lesson.has_slides) {
      return res.status(400).json({ error: '该课件没有生成幻灯片' });
    }

    const sessionId = await classroomSessionModel.create({
      lessonId: parseInt(req.params.lessonId),
      currentPage: 0,
      totalPages: lesson.slide_count
    });

    const session = await classroomSessionModel.getById(sessionId);

    const io = req.app.get('io');
    io.emit('class:started', {
      sessionId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      totalPages: lesson.slide_count,
      currentPage: 0
    });

    res.json({ success: true, sessionId, session });
  } catch (error) {
    console.error('Start class error:', error);
    res.status(500).json({ error: '开始上课失败' });
  }
});

router.post('/end-class/:sessionId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const classroomSessionModel = new ClassroomSession(db);

    await classroomSessionModel.endSession(parseInt(req.params.sessionId));

    const io = req.app.get('io');
    io.emit('class:ended', {
      sessionId: parseInt(req.params.sessionId)
    });

    res.json({ success: true });
  } catch (error) {
    console.error('End class error:', error);
    res.status(500).json({ error: '结束上课失败' });
  }
});

router.post('/change-page', async (req, res) => {
  try {
    const { sessionId, pageNumber } = req.body;
    const db = req.app.get('db');
    const classroomSessionModel = new ClassroomSession(db);

    const session = await classroomSessionModel.getById(sessionId);
    if (!session) {
      return res.status(404).json({ error: '课堂会话不存在' });
    }

    if (pageNumber < 0 || pageNumber >= session.total_pages) {
      return res.status(400).json({ error: '页码超出范围' });
    }

    await classroomSessionModel.updateCurrentPage(sessionId, pageNumber);

    const io = req.app.get('io');
    io.emit('page:changed', {
      sessionId,
      pageNumber,
      totalPages: session.total_pages
    });

    res.json({ success: true, currentPage: pageNumber });
  } catch (error) {
    console.error('Change page error:', error);
    res.status(500).json({ error: '切换页面失败' });
  }
});

router.get('/class-status', async (req, res) => {
  try {
    const db = req.app.get('db');
    const classroomSessionModel = new ClassroomSession(db);
    const session = await classroomSessionModel.getActive();

    if (!session) {
      return res.json({ active: false });
    }

    const lessonModel = new Lesson(db);
    const lesson = await lessonModel.getById(session.lesson_id);

    res.json({
      active: true,
      session,
      lesson
    });
  } catch (error) {
    console.error('Get class status error:', error);
    res.status(500).json({ error: '获取课堂状态失败' });
  }
});

router.get('/lesson/:id/slides', async (req, res) => {
  try {
    const db = req.app.get('db');
    const slideService = new SlideService(db);
    const slides = await slideService.getSlides(parseInt(req.params.id));
    res.json(slides);
  } catch (error) {
    console.error('Get slides error:', error);
    res.status(500).json({ error: '获取幻灯片失败' });
  }
});

module.exports = router;