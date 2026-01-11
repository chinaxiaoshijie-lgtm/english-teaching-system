const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('./database');
const BackupService = require('./services/backup-service');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

const db = new Database();
const database = db.getDatabase();

app.set('db', database);
app.set('io', io);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/config', require('./routes/api'));

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('student:join', async (data) => {
    const Student = require('./models/student');
    const studentModel = new Student(database);
    const ClassroomSession = require('./models/classroom-session');
    const classroomSessionModel = new ClassroomSession(database);
    
    let student = await studentModel.getBySocketId(socket.id);
    if (!student && data.studentId) {
      student = await studentModel.getById(data.studentId);
      if (student) {
        await studentModel.updateSocketId(student.id, socket.id);
      }
    }
    
    socket.emit('joined', student);
    io.emit('student:online', student);
    
    const activeSession = await classroomSessionModel.getActive();
    if (activeSession) {
      const Lesson = require('./models/lesson');
      const lessonModel = new Lesson(database);
      const lesson = await lessonModel.getById(activeSession.lesson_id);
      
      socket.emit('class:active', {
        sessionId: activeSession.id,
        lessonId: activeSession.lesson_id,
        lessonTitle: lesson.title,
        totalPages: activeSession.total_pages,
        currentPage: activeSession.current_page
      });
    }
    
    console.log(`Student joined: ${data.name || 'Unknown'} (${socket.id})`);
  });

  socket.on('student:submission', (data) => {
    io.emit('student:submission', data);
  });

  socket.on('teacher:join', () => {
    console.log(`Teacher connected: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = config.server.port;

server.listen(PORT, '0.0.0.0', async () => {
  console.log('========================================');
  console.log('  英语教学互动系统');
  console.log('========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  
  const ip = getLocalIP();
  console.log('');
  console.log(`教师端访问: http://${ip}:${PORT}/teacher`);
  console.log(`学生端访问: http://${ip}:${PORT}/student`);
  console.log('');
  
  await db.initialize();
  
  if (config.backup.enabled) {
    new BackupService(config.backup);
  }
  
  console.log('========================================');
  console.log('系统已启动，按 Ctrl+C 停止');
  console.log('========================================');
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await db.close();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});