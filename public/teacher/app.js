class TeacherApp {
  constructor() {
    this.socket = io();
    this.currentSection = 'lessons';
    this.sessionId = null;
    this.currentLessonId = null;
    this.slides = [];
    this.currentPage = 0;
    this.init();
  }

  init() {
    this.setupSocketListeners();
    this.setupEventListeners();
    this.loadData();
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
    });

    this.socket.on('student:submission', (data) => {
      this.showNotification(`新提交: 学生ID ${data.studentId}`);
      this.loadSubmissions();
    });

    this.socket.on('submission:graded', (data) => {
      this.showNotification(`批改完成: 学生ID ${data.studentId}, 分数: ${data.score}`);
      this.loadSubmissions();
    });

    this.socket.emit('teacher:join');
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchSection(e.target.dataset.section);
      });
    });

    document.getElementById('lessonFile').addEventListener('change', (e) => {
      this.handleLessonUpload(e.target.files[0]);
    });

    document.getElementById('startClassBtn').addEventListener('click', () => this.startClass());
    document.getElementById('endClassBtn').addEventListener('click', () => this.endClass());
    document.getElementById('prevSlideBtn').addEventListener('click', () => this.prevSlide());
    document.getElementById('nextSlideBtn').addEventListener('click', () => this.nextSlide());
    document.getElementById('classLessonSelect').addEventListener('change', (e) => {
      this.currentLessonId = parseInt(e.target.value);
    });
  }

  switchSection(section) {
    this.currentSection = section;
    
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('active', sec.id === section);
    });

    this.loadSectionData();
  }

  loadSectionData() {
    switch (this.currentSection) {
      case 'lessons':
        this.loadLessons();
        break;
      case 'classroom':
        this.loadClassroomData();
        break;
      case 'tasks':
        this.loadLessonsSelect();
        this.loadTasks();
        break;
      case 'submissions':
        this.loadSubmissions();
        break;
      case 'students':
        this.loadStudents();
        break;
      case 'stats':
        this.loadStats();
        break;
    }
  }

  async loadClassroomData() {
    await this.loadClassroomLessons();
    await this.checkClassStatus();
  }

  async loadClassroomLessons() {
    try {
      const response = await fetch('/api/teacher/lessons');
      const lessons = await response.json();
      const pdfLessons = lessons.filter(l => l.file_type === '.pdf' && l.has_slides);
      
      const select = document.getElementById('classLessonSelect');
      select.innerHTML = '<option value="">选择课件</option>' + 
        pdfLessons.map(l => `<option value="${l.id}">${l.title} (${l.slide_count}页)</option>`).join('');
    } catch (error) {
      console.error('Load classroom lessons error:', error);
    }
  }

  async checkClassStatus() {
    try {
      const response = await fetch('/api/teacher/class-status');
      const data = await response.json();
      
      if (data.active) {
        this.sessionId = data.session.id;
        this.currentLessonId = data.session.lesson_id;
        this.currentPage = data.session.current_page;
        this.slides = await this.loadSlides(this.currentLessonId);
        
        document.getElementById('startClassBtn').style.display = 'none';
        document.getElementById('endClassBtn').style.display = 'inline-block';
        document.getElementById('classroomStatus').style.display = 'block';
        document.getElementById('slideViewer').style.display = 'block';
        document.getElementById('currentLessonTitle').textContent = data.lesson.title;
        document.getElementById('classSessionInfo').textContent = `课堂ID: ${this.sessionId}`;
        
        this.showSlide(this.currentPage);
      } else {
        this.resetClassroomUI();
      }
    } catch (error) {
      console.error('Check class status error:', error);
    }
  }

  async loadSlides(lessonId) {
    try {
      const response = await fetch(`/api/teacher/lesson/${lessonId}/slides`);
      return await response.json();
    } catch (error) {
      console.error('Load slides error:', error);
      return [];
    }
  }

  async startClass() {
    if (!this.currentLessonId) {
      this.showNotification('请先选择课件', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/teacher/start-class/${this.currentLessonId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.sessionId = result.sessionId;
        this.currentPage = 0;
        this.slides = await this.loadSlides(this.currentLessonId);
        
        document.getElementById('startClassBtn').style.display = 'none';
        document.getElementById('endClassBtn').style.display = 'inline-block';
        document.getElementById('classroomStatus').style.display = 'block';
        document.getElementById('slideViewer').style.display = 'block';
        
        const lessonTitle = document.getElementById('classLessonSelect').options[document.getElementById('classLessonSelect').selectedIndex].text;
        document.getElementById('currentLessonTitle').textContent = lessonTitle;
        document.getElementById('classSessionInfo').textContent = `课堂ID: ${this.sessionId}`;
        
        this.showSlide(this.currentPage);
        this.showNotification('上课已开始');
      }
    } catch (error) {
      this.showNotification('开始上课失败', 'error');
    }
  }

  async endClass() {
    if (!this.sessionId) return;

    try {
      const response = await fetch(`/api/teacher/end-class/${this.sessionId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.sessionId = null;
        this.currentLessonId = null;
        this.currentPage = 0;
        this.slides = [];
        
        this.resetClassroomUI();
        this.showNotification('上课已结束');
      }
    } catch (error) {
      this.showNotification('结束上课失败', 'error');
    }
  }

  resetClassroomUI() {
    document.getElementById('startClassBtn').style.display = 'inline-block';
    document.getElementById('endClassBtn').style.display = 'none';
    document.getElementById('classroomStatus').style.display = 'none';
    document.getElementById('slideViewer').style.display = 'none';
    document.getElementById('currentLessonTitle').textContent = '';
    document.getElementById('classSessionInfo').textContent = '';
    document.getElementById('currentSlide').src = '';
    document.getElementById('pageIndicator').textContent = '0 / 0';
  }

  async changePage(pageNumber) {
    if (!this.sessionId || pageNumber < 0 || pageNumber >= this.slides.length) return;

    try {
      const response = await fetch('/api/teacher/change-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, pageNumber })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.currentPage = pageNumber;
        this.showSlide(this.currentPage);
      }
    } catch (error) {
      this.showNotification('切换页面失败', 'error');
    }
  }

  showSlide(pageNumber) {
    if (!this.slides[pageNumber]) return;
    
    const slide = this.slides[pageNumber];
    document.getElementById('currentSlide').src = slide.image_path;
    document.getElementById('pageIndicator').textContent = `${pageNumber + 1} / ${this.slides.length}`;
  }

  prevSlide() {
    if (this.currentPage > 0) {
      this.changePage(this.currentPage - 1);
    }
  }

  nextSlide() {
    if (this.currentPage < this.slides.length - 1) {
      this.changePage(this.currentPage + 1);
    }
  }

  loadData() {
    this.loadSectionData();
  }

  async handleLessonUpload(file) {
    if (!file) return;

    const title = document.getElementById('lessonTitle').value || file.name;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    try {
      const response = await fetch('/api/teacher/upload-lesson', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        this.showNotification('课件上传成功');
        this.loadLessons();
        document.getElementById('lessonFile').value = '';
        document.getElementById('lessonTitle').value = '';
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showNotification('上传失败: ' + error.message, 'error');
    }
  }

  async loadLessons() {
    try {
      const response = await fetch('/api/teacher/lessons');
      const lessons = await response.json();
      
      const list = document.getElementById('lessonsList');
      list.innerHTML = lessons.map(lesson => `
        <div class="list-item">
          <div>
            <h3>${lesson.title}</h3>
            <p>${lesson.file_type} - ${new Date(lesson.uploaded_at).toLocaleString()}</p>
          </div>
          <div class="actions">
            ${!lesson.published ? `<button class="btn btn-success" onclick="publishLesson(${lesson.id})">发布</button>` : '<span class="status connected">已发布</span>'}
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Load lessons error:', error);
    }
  }

  async publishLesson(lessonId) {
    try {
      const response = await fetch(`/api/teacher/publish-lesson/${lessonId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification('课件已发布到学生端');
        this.loadLessons();
      }
    } catch (error) {
      this.showNotification('发布失败', 'error');
    }
  }

  async loadLessonsSelect() {
    try {
      const response = await fetch('/api/teacher/lessons');
      const lessons = await response.json();
      
      const select = document.getElementById('taskLessonId');
      select.innerHTML = '<option value="">选择课件</option>' + 
        lessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('');
    } catch (error) {
      console.error('Load lessons select error:', error);
    }
  }

  async createTask() {
    const taskData = {
      lessonId: document.getElementById('taskLessonId').value,
      title: document.getElementById('taskTitle').value,
      type: document.getElementById('taskType').value,
      content: document.getElementById('taskContent').value,
      correctAnswer: document.getElementById('taskCorrectAnswer').value,
      points: parseInt(document.getElementById('taskPoints').value) || 100
    };

    if (!taskData.lessonId || !taskData.title || !taskData.content) {
      this.showNotification('请填写完整信息', 'error');
      return;
    }

    try {
      const response = await fetch('/api/teacher/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();
      
      if (result.success) {
        this.showNotification('任务创建成功');
        this.loadTasks();
        this.clearTaskForm();
      }
    } catch (error) {
      this.showNotification('创建失败', 'error');
    }
  }

  clearTaskForm() {
    document.getElementById('taskLessonId').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskContent').value = '';
    document.getElementById('taskCorrectAnswer').value = '';
    document.getElementById('taskPoints').value = '100';
  }

  async loadTasks() {
    try {
      const response = await fetch('/api/teacher/tasks');
      const tasks = await response.json();
      
      const list = document.getElementById('tasksList');
      list.innerHTML = tasks.map(task => `
        <div class="list-item">
          <div>
            <h3>${task.title}</h3>
            <p>类型: ${this.getTaskTypeText(task.type)} | 分值: ${task.points}</p>
          </div>
          <div class="actions">
            ${!task.published ? `<button class="btn btn-success" onclick="publishTask(${task.id})">发布</button>` : '<span class="status connected">已发布</span>'}
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  }

  async publishTask(taskId) {
    try {
      const response = await fetch(`/api/teacher/publish-task/${taskId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification('任务已发布');
        this.loadTasks();
      }
    } catch (error) {
      this.showNotification('发布失败', 'error');
    }
  }

  getTaskTypeText(type) {
    const types = {
      choice: '选择题',
      fillblank: '填空题',
      essay: '简答题',
      audio: '录音题',
      photo: '拍照题'
    };
    return types[type] || type;
  }

  async loadSubmissions() {
    try {
      const response = await fetch('/api/teacher/submissions');
      const submissions = await response.json();
      
      const list = document.getElementById('submissionsList');
      list.innerHTML = submissions.map(sub => `
        <div class="list-item submission-item">
          <div class="submission-info">
            <h3>${sub.student_name} - ${sub.task_title}</h3>
            <p>提交时间: ${new Date(sub.submitted_at).toLocaleString()}</p>
          </div>
          <div class="submission-score ${this.getScoreClass(sub.score)}">
            ${sub.score !== null ? sub.score.toFixed(0) : '未批改'}
          </div>
          <div class="actions">
            ${sub.score === null ? `<button class="btn btn-primary" onclick="gradeSubmission(${sub.id})">批改</button>` : ''}
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Load submissions error:', error);
    }
  }

  async gradeSubmission(submissionId) {
    try {
      const response = await fetch(`/api/teacher/grade/${submissionId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification('批改完成');
        this.loadSubmissions();
      }
    } catch (error) {
      this.showNotification('批改失败', 'error');
    }
  }

  async gradeAll() {
    try {
      const response = await fetch('/api/teacher/submissions/ungraded');
      const submissions = await response.json();
      
      for (const sub of submissions) {
        await this.gradeSubmission(sub.id);
      }
      
      this.showNotification(`批量批改完成，共 ${submissions.length} 份`);
    } catch (error) {
      this.showNotification('批量批改失败', 'error');
    }
  }

  getScoreClass(score) {
    if (score === null) return 'score-none';
    if (score >= 90) return 'score-high';
    if (score >= 70) return 'score-medium';
    return 'score-low';
  }

  async loadStudents() {
    try {
      const response = await fetch('/api/teacher/students');
      const students = await response.json();
      
      const list = document.getElementById('studentsList');
      list.innerHTML = students.map(student => `
        <div class="list-item">
          <div>
            <h3>${student.name || '匿名'}</h3>
            <p>学号: ${student.student_number || '-'} | 设备ID: ${student.device_id || '-'}</p>
          </div>
          <div>
            <span class="status ${this.isActive(student.last_active) ? 'connected' : 'disconnected'}">
              ${this.isActive(student.last_active) ? '在线' : '离线'}
            </span>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Load students error:', error);
    }
  }

  isActive(lastActive) {
    if (!lastActive) return false;
    const diff = Date.now() - new Date(lastActive).getTime();
    return diff < 30 * 60 * 1000;
  }

  async loadStats() {
    try {
      const response = await fetch('/api/teacher/stats');
      const stats = await response.json();
      
      const content = document.getElementById('statsContent');
      content.innerHTML = `
        <div class="stat-card">
          <h3>${stats.totalStudents}</h3>
          <p>总学生数</p>
        </div>
        <div class="stat-card">
          <h3>${stats.activeStudents}</h3>
          <p>在线学生</p>
        </div>
        <div class="stat-card">
          <h3>${stats.totalTasks}</h3>
          <p>总任务数</p>
        </div>
        <div class="stat-card">
          <h3>${stats.totalSubmissions}</h3>
          <p>总提交数</p>
        </div>
        <div class="stat-card">
          <h3>${stats.gradedSubmissions}</h3>
          <p>已批改</p>
        </div>
        <div class="stat-card">
          <h3>${stats.ungradedSubmissions}</h3>
          <p>待批改</p>
        </div>
        <div class="stat-card">
          <h3>${stats.averageScore || 0}</h3>
          <p>平均分</p>
        </div>
      `;
    } catch (error) {
      console.error('Load stats error:', error);
    }
  }

  updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    status.className = 'status ' + (connected ? 'connected' : 'disconnected');
    status.textContent = connected ? '已连接' : '未连接';
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.background = type === 'error' ? '#ef4444' : '#10b981';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

const app = new TeacherApp();

function publishLesson(lessonId) {
  app.publishLesson(lessonId);
}

function publishTask(taskId) {
  app.publishTask(taskId);
}

function createTask() {
  app.createTask();
}

function gradeSubmission(submissionId) {
  app.gradeSubmission(submissionId);
}

function gradeAll() {
  app.gradeAll();
}