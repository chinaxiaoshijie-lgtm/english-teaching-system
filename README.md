# 英语教学互动系统

一个基于局域网的英语教学互动系统，支持课件下发、作业提交、AI自动批改等功能。

## 功能特性

### 教师端
- 课件管理（PPTX/PDF上传和发布）
- **上课模式**：PDF课件实时同步翻页
- 任务创建和管理
- 实时查看学生提交
- AI自动批改（基于通义千问）
- 手动批改和校验
- 学生管理和监控
- 数据统计

### 学生端
- 接收课件
- 浏览课件
- **实时同步课堂幻灯片**（上课模式）
- 提交作业（选择/填空/简答/录音/拍照）
- 查看批改结果和分数

### 系统特性
- 实时通信（Socket.IO）
- 自动备份（每天凌晨）
- SQLite数据库
- 简单易用的Web界面

## 技术栈

### 后端
- Node.js + Express
- Socket.IO（实时通信）
- SQLite（数据库）
- better-sqlite3（SQLite驱动）
- node-schedule（定时任务）
- archiver（文件压缩）

### 前端
- 原生JavaScript
- CSS3
- Socket.IO Client

### AI服务
- 通义千问API（qwen-vl-max-latest）
- 阿里云语音服务（待配置）

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

**注意**：为了使用PDF幻灯片处理功能，需要安装 `canvas` 包。请参考 [INSTALL_CANVAS.md](INSTALL_CANVAS.md) 进行安装。

### 2. 启动系统

Windows:
```bash
start.bat
```

或手动启动:
```bash
npm start
```

### 3. 访问系统

启动后，系统会显示访问地址：

```
教师端: http://[教师IP]:3000/teacher
学生端: http://[教师IP]:3000/student
```

### 4. 配置

编辑 `config.js` 文件可修改配置：

```javascript
module.exports = {
  server: {
    port: 3000,
    staticFolder: 'public'
  },
  
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: 'YOUR_API_KEY',
    model: 'qwen-vl-max-latest'
  },
  
  alicloud: {
    accessKeyId: '',
    accessKeySecret: '',
    appKey: '',
    region: 'cn-hangzhou'
  }
};
```

## 使用说明

### 教师端使用流程

1. 访问教师端界面
2. 上传课件（PPTX/PDF文件）
3. 点击"发布"将课件下发给学生
4. **上课模式**（仅PDF课件）：
   - 进入"上课模式"页面
   - 选择一个已上传的PDF课件
   - 点击"开始上课"
   - 使用"上一页"/"下一页"按钮翻页
   - 学生端将实时同步显示幻灯片
   - 点击"结束上课"退出上课模式
5. 创建作业任务
6. 发布任务
7. 实时查看学生提交
8. 查看AI批改结果，必要时手动校验

### 学生端使用流程

1. 访问学生端界面
2. 输入姓名和学号加入课堂
3. 接收课件并浏览
4. 查看作业任务
5. 完成并提交作业
6. 查看批改结果和分数

## 测试

运行测试套件：

```bash
npm test
```

测试包括：
- 数据库模型测试
- Lesson模型测试
- Task模型测试
- Student模型测试
- Submission模型测试

## 目录结构

```
english-teaching-system/
├── start.bat                 # 启动脚本
├── server.js                 # 服务器入口
├── config.js                 # 配置文件
├── database.js               # 数据库初始化
├── routes/                   # 路由
│   ├── teacher.js           # 教师端路由
│   ├── student.js           # 学生端路由
│   └── api.js               # API路由
 ├── services/                 # 业务服务
 │   ├── qwen-service.js      # 通义千问服务
 │   ├── alicloud-service.js  # 阿里云语音服务
 │   ├── backup-service.js    # 备份服务
 │   └── slide-service.js     # PDF幻灯片服务
 ├── models/                   # 数据模型
 │   ├── lesson.js
 │   ├── task.js
 │   ├── student.js
 │   ├── submission.js
 │   ├── classroom-session.js # 课堂会话模型
 │   └── lesson-slide.js      # 幻灯片模型
├── public/                   # 前端文件
│   ├── teacher/             # 教师端
│   └── student/             # 学生端
├── uploads/                  # 上传文件
│   ├── lessons/
│   └── submissions/
├── backups/                  # 备份文件
└── tests/                    # 测试文件
```

## 系统要求

- Node.js 16.x 或更高版本
- Windows/Mac/Linux操作系统
- 局域网环境（千兆网络推荐）
- 学生端：Android平板（15寸触摸屏，带键盘、耳麦、摄像头）

## 注意事项

1. **网络要求**：建议使用千兆局域网，48-52名学生同时访问
2. **IP地址**：教师电脑IP建议固定，避免DHCP导致地址变化
3. **API配额**：注意通义千问和阿里云API的使用量和费用
4. **备份**：系统默认每天凌晨自动备份数据库和上传文件
5. **安全**：当前版本仅适用于局域网环境，不建议直接暴露到公网

## 常见问题

### Q: 学生无法连接到教师端？
A: 检查防火墙设置，确保3000端口开放；确认教师电脑IP地址正确。

### Q: 课件发布后学生端看不到？
A: 确保已点击"发布"按钮；让学生刷新学生端页面。

### Q: 上课模式不工作？
A: 确保上传的是PDF文件（.pdf扩展名）；确认已安装canvas包（见INSTALL_CANVAS.md）；上传时会自动处理PDF并生成幻灯片，请等待处理完成。

### Q: PDF上传后无法生成幻灯片？
A: 检查服务器日志；确认canvas包已正确安装；确保有足够的磁盘空间。

### Q: 学生端看不到同步的幻灯片？
A: 确保学生已登录并在线；检查Socket.IO连接状态；确认教师端已开始上课。

### Q: AI批改失败？
A: 检查通义千问API Key是否正确；确认网络连接正常。

### Q: 如何查看历史数据？
A: 系统会自动备份每天的数据，备份文件存储在 `backups` 目录。

## 开发计划

### 已完成
- [x] 基础架构搭建
- [x] 数据库设计和实现
- [x] 教师端界面
- [x] 学生端界面
- [x] 课件上传和发布
- [x] **上课模式 - PDF实时同步翻页**
- [x] 作业提交功能
- [x] 通义千问API集成
- [x] 实时通信
- [x] 自动备份

### 待完成
- [ ] 阿里云语音服务完整集成
- [ ] 口语评分功能
- [ ] 课件交互功能增强
- [ ] 数据统计报表
- [ ] 性能优化
- [ ] 移动端适配

## License

MIT

## Support

如有问题或建议，请联系开发团队。