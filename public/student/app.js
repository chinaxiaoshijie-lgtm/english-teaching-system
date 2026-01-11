class StudentApp {
  constructor() {
    this.socket = io();
    this.currentTab = 'lesson';
    this.student = null;
    this.currentTask = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.sessionId = null;
    this.currentLessonId = null;
    this.slides = [];
    this.currentPage = 0;
    this.init();
  }

  init() {
    this.setupSocketListeners();
    this.setupEventListeners();
    this.checkLogin();
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
    });

    this.socket.on('lesson:published', (lesson) => {
      this.showNotification('新课件已发布');
      this.loadCurrentLesson();
    });

    this.socket.on('task:published', (task) => {
      this.showNotification('新任务已发布');
      this.loadTasks();
    });

    this.socket.on('submission:graded', (data) => {
      if (data.studentId === this.student?.id) {
        this.showNotification(`作业已批改，得分: ${data.score}`);
        this.loadSubmissions();
      }
    });

    this.socket.on('class:started', async (data) => {
      this.sessionId = data.sessionId;
      this.currentLessonId = data.lessonId;
      this.currentPage = data.currentPage;
      await this.loadSlides(data.lessonId);
      this.showClassroom(data.lessonTitle);
      this.showSlide(this.currentPage);
      this.showNotification('上课开始');
    });

    this.socket.on('class:active', async (data) => {
      this.sessionId = data.sessionId;
      this.currentLessonId = data.lessonId;
      this.currentPage = data.currentPage;
      await this.loadSlides(data.lessonId);
      this.showClassroom(data.lessonTitle);
      this.showSlide(this.currentPage);
    });

    this.socket.on('page:changed', (data) => {
      if (this.sessionId === data.sessionId) {
        this.currentPage = data.pageNumber;
        this.showSlide(this.currentPage);
      }
    });

    this.socket.on('class:ended', () => {
      this.hideClassroom();
      this.sessionId = null;
      this.currentLessonId = null;
      this.currentPage = 0;
      this.slides = [];
    });
  }

  setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  }

  checkLogin() {
    const savedStudent = localStorage.getItem('student');
    if (savedStudent) {
      this.student = JSON.parse(savedStudent);
      this.showMainSection();
      this.loadTabData();
      this.checkClassSession();
    }
  }

  async checkClassSession() {
    try {
      const response = await fetch('/api/student/class-session');
      const data = await response.json();
      
      if (data.active) {
        this.sessionId = data.session.id;
        this.currentLessonId = data.session.lesson_id;
        this.currentPage = data.session.current_page;
        await this.loadSlides(data.session.lesson_id);
        this.showClassroom(data.lesson.title);
        this.showSlide(this.currentPage);
      }
    } catch (error) {
      console.error('Check class session error:', error);
    }
  }

  async loadSlides(lessonId) {
    try {
      const response = await fetch(`/api/student/lesson/${lessonId}/slides`);
      const slides = await response.json();
      this.slides = slides.map(s => ({
        page_number: s.page_number - 1,
        image_path: s.image_path,
        lesson_id: s.lesson_id
      }));
      console.log(`Loaded ${this.slides.length} slides`);
    } catch (error) {
      console.error('Load slides error:', error);
    }
  }

  showClassroom(lessonTitle) {
    document.getElementById('classroomViewer').style.display = 'block';
    document.getElementById('currentLessonTitle').textContent = lessonTitle;
  }

  hideClassroom() {
    document.getElementById('classroomViewer').style.display = 'none';
    document.getElementById('currentLessonTitle').textContent = '';
    document.getElementById('studentSlide').src = '';
  }

  showSlide(pageNumber) {
    const slide = this.slides[pageNumber];
    if (!slide) {
      console.warn(`Slide ${pageNumber} not found, total: ${this.slides.length}`);
      return;
    }
    
    document.getElementById('studentSlide').src = slide.image_path;
  }

  async joinClass() {
    const name = document.getElementById('studentNameInput').value.trim();
    const studentNumber = document.getElementById('studentNumberInput').value.trim();

    if (!name || !studentNumber) {
      this.showNotification('请填写姓名和学号', 'error');
      return;
    }

    const deviceId = this.generateDeviceId();

    try {
      const response = await fetch('/api/student/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          studentNumber,
          deviceId,
          socketId: this.socket.id
        })
      });

      const result = await response.json();

      if (result.success) {
        this.student = result.student;
        localStorage.setItem('student', JSON.stringify(this.student));
        
        this.socket.emit('student:join', {
          studentId: this.student.id,
          deviceId
        });

        this.showMainSection();
        this.loadTabData();
        this.showNotification('成功加入课堂');
      }
    } catch (error) {
      this.showNotification('加入课堂失败', 'error');
    }
  }

  generateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  showMainSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'block';
    document.getElementById('studentName').textContent = this.student.name;
  }

  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tab + 'Tab');
    });

    this.loadTabData();
  }

  loadTabData() {
    switch (this.currentTab) {
      case 'lesson':
        this.loadCurrentLesson();
        break;
      case 'tasks':
        this.loadTasks();
        break;
      case 'submissions':
        this.loadSubmissions();
        break;
    }
  }

  async loadCurrentLesson() {
    try {
      const response = await fetch('/api/student/lesson/current');
      
      if (!response.ok) {
        document.getElementById('lessonViewer').innerHTML = `
          <div class="lesson-placeholder">
            <p>暂无课件</p>
          </div>
        `;
        return;
      }

      const lesson = await response.json();
      
      document.getElementById('lessonViewer').innerHTML = `
        <h2>${lesson.title}</h2>
        <div class="lesson-content">
          <p>课件文件: ${lesson.file_path}</p>
          <p>上传时间: ${new Date(lesson.uploaded_at).toLocaleString()}</p>
        </div>
      `;
    } catch (error) {
      console.error('Load lesson error:', error);
    }
  }

  async loadTasks() {
    try {
      const response = await fetch('/api/student/tasks');
      const tasks = await response.json();

      if (tasks.length === 0) {
        document.getElementById('tasksList').innerHTML = `
          <div class="lesson-placeholder">
            <p>暂无任务</p>
          </div>
        `;
        return;
      }

      document.getElementById('tasksList').innerHTML = tasks.map(task => {
        const hasSubmitted = this.checkSubmission(task.id);
        
        return `
          <div class="list-item">
            <h3>${task.title}</h3>
            <p>${task.content}</p>
            <div class="meta">
              <span class="tag">${this.getTaskTypeText(task.type)}</span>
              <span class="tag">${task.points}分</span>
            </div>
            <div class="actions">
              ${hasSubmitted ? 
                '<button class="btn" disabled>已提交</button>' : 
                `<button class="btn btn-primary" onclick="openSubmissionModal(${task.id})">提交作业</button>`
              }
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  }

  async loadSubmissions() {
    if (!this.student) return;

    try {
      const response = await fetch(`/api/student/my-submissions/${this.student.id}`);
      const submissions = await response.json();

      if (submissions.length === 0) {
        document.getElementById('submissionsList').innerHTML = `
          <div class="lesson-placeholder">
            <p>暂无提交记录</p>
          </div>
        `;
        return;
      }

      document.getElementById('submissionsList').innerHTML = submissions.map(sub => `
        <div class="list-item">
          <h3>${sub.task_title}</h3>
          <p>提交时间: ${new Date(sub.submitted_at).toLocaleString()}</p>
          ${sub.score !== null ? `
            <div class="score ${this.getScoreClass(sub.score)}">${sub.score.toFixed(0)}</div>
            <div class="feedback">
              <strong>评语:</strong> ${sub.ai_feedback || '暂无评语'}
            </div>
          ` : '<p class="status disconnected">待批改</p>'}
        </div>
      `).join('');
    } catch (error) {
      console.error('Load submissions error:', error);
    }
  }

  async checkSubmission(taskId) {
    if (!this.student) return false;

    try {
      const response = await fetch(`/api/student/my-submissions/${this.student.id}`);
      const submissions = await response.json();
      return submissions.some(s => s.task_id === taskId);
    } catch (error) {
      return false;
    }
  }

  openSubmissionModal(taskId) {
    const allTasks = document.querySelectorAll('#tasksList .list-item');
    let task = null;

    fetch('/api/student/tasks')
      .then(res => res.json())
      .then(tasks => {
        task = tasks.find(t => t.id === taskId);
        
        if (!task) return;

        this.currentTask = task;
        
        let formHTML = `
          <div class="form-group">
            <label>题目</label>
            <p>${task.content}</p>
          </div>
        `;

        switch (task.type) {
          case 'choice':
          case 'fillblank':
          case 'essay':
            formHTML += `
              <div class="form-group">
                <label>答案</label>
                <textarea id="submissionAnswer" placeholder="输入答案"></textarea>
              </div>
            `;
            break;
          
          case 'audio':
            formHTML += `
              <div class="form-group">
                <label>录音</label>
                <div class="audio-controls">
                  <button class="btn ${this.isRecording ? 'btn-danger' : 'btn-primary'}" onclick="toggleRecording()">
                    ${this.isRecording ? '停止录音' : '开始录音'}
                  </button>
                  ${this.isRecording ? '<span class="recording">● 录音中...</span>' : ''}
                </div>
              </div>
            `;
            break;
          
          case 'photo':
            formHTML += `
              <div class="form-group">
                <label>拍照</label>
                <div class="photo-controls">
                  <input type="file" id="submissionPhoto" accept="image/*" class="input">
                  <button class="btn btn-primary" onclick="capturePhoto()">拍照</button>
                </div>
              </div>
            `;
            break;
        }

        document.getElementById('submissionForm').innerHTML = formHTML;
        document.getElementById('submissionModal').style.display = 'flex';
      });
  }

  closeModal() {
    document.getElementById('submissionModal').style.display = 'none';
    this.currentTask = null;
    this.stopRecording();
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (e) => {
          this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await this.submitAudio(audioBlob);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.updateRecordingUI();
      })
      .catch(err => {
        this.showNotification('无法访问麦克风', 'error');
      });
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.updateRecordingUI();
    }
  }

  updateRecordingUI() {
    const btn = document.querySelector('.audio-controls button');
    if (btn) {
      btn.textContent = this.isRecording ? '停止录音' : '开始录音';
      btn.className = `btn ${this.isRecording ? 'btn-danger' : 'btn-primary'}`;
    }

    const indicator = document.querySelector('.audio-controls .recording');
    if (indicator) {
      indicator.remove();
    }

    if (this.isRecording) {
      const indicator = document.createElement('span');
      indicator.className = 'recording';
      indicator.textContent = '● 录音中...';
      document.querySelector('.audio-controls').appendChild(indicator);
    }
  }

  async submitAudio(audioBlob) {
    const formData = new FormData();
    formData.append('taskId', this.currentTask.id);
    formData.append('studentId', this.student.id);
    formData.append('audio', new File([audioBlob], 'audio.webm', { type: 'audio/webm' }));

    try {
      const response = await fetch('/api/student/submit-audio', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        this.closeModal();
        this.showNotification('提交成功');
        this.loadTasks();
      }
    } catch (error) {
      this.showNotification('提交失败', 'error');
    }
  }

  async submitAnswer() {
    if (!this.currentTask || !this.student) return;

    try {
      const answer = document.getElementById('submissionAnswer')?.value || '';
      const photo = document.getElementById('submissionPhoto')?.files[0];

      const formData = new FormData();
      formData.append('taskId', this.currentTask.id);
      formData.append('studentId', this.student.id);
      formData.append('answer', answer);
      if (photo) {
        formData.append('file', photo);
      }

      const response = await fetch('/api/student/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        this.closeModal();
        this.showNotification('提交成功');
        this.loadTasks();
      }
    } catch (error) {
      this.showNotification('提交失败', 'error');
    }
  }

  capturePhoto() {
    document.getElementById('submissionPhoto').click();
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

  getScoreClass(score) {
    if (score >= 90) return 'score-high';
    if (score >= 70) return 'score-medium';
    return 'score-low';
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

const app = new StudentApp();

function joinClass() {
  app.joinClass();
}

function openSubmissionModal(taskId) {
  app.openSubmissionModal(taskId);
}

function closeModal() {
  app.closeModal();
}

function toggleRecording() {
  app.toggleRecording();
}

function capturePhoto() {
  app.capturePhoto();
}

function submitAnswer() {
  app.submitAnswer();
}