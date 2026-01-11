const express = require('express');
const AliCloudService = require('../services/alicloud-service');
const config = require('../config');

const router = express.Router();
const alicloudService = new AliCloudService();

router.get('/alicloud/status', (req, res) => {
  res.json({
    enabled: alicloudService.isEnabled(),
    hasKeyId: !!config.alicloud.accessKeyId,
    hasKeySecret: !!config.alicloud.accessKeySecret,
    hasAppKey: !!config.alicloud.appKey
  });
});

router.post('/alicloud/config', (req, res) => {
  try {
    const { accessKeyId, accessKeySecret, appKey, region } = req.body;
    
    config.alicloud = {
      accessKeyId,
      accessKeySecret,
      appKey,
      region: region || 'cn-hangzhou'
    };
    
    alicloudService.updateConfig(config.alicloud);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '配置保存失败' });
  }
});

router.get('/qwen/status', (req, res) => {
  res.json({
    enabled: !!config.qwen.apiKey,
    model: config.qwen.model,
    baseUrl: config.qwen.baseUrl
  });
});

router.get('/backup/status', (req, res) => {
  res.json({
    enabled: config.backup.enabled,
    time: config.backup.time,
    retentionDays: config.backup.retentionDays
  });
});

module.exports = router;