module.exports = {
  server: {
    port: 3000,
    staticFolder: 'public'
  },
  
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: 'sk-305c9af3b7c34bbdb57c1e471aa1acd0',
    model: 'qwen-vl-max-latest',
    maxRetries: 3,
    timeout: 10000
  },
  
  alicloud: {
    accessKeyId: '',
    accessKeySecret: '',
    appKey: '',
    region: 'cn-hangzhou'
  },
  
  backup: {
    enabled: true,
    time: '00:00',
    folder: './backups',
    retentionDays: 30
  },
  
  upload: {
    maxFileSize: 50 * 1024 * 1024,
    allowedTypes: ['.pptx', '.pdf', '.docx', '.m4a', '.mp3', '.jpg', '.png', '.jpeg', '.webm']
  },
  
  grading: {
    batchSize: 5,
    timeout: 5000
  }
};