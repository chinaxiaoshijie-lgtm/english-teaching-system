const config = require('../config');

class AliCloudService {
  constructor() {
    this.config = config.alicloud;
  }

  isEnabled() {
    return !!(this.config.accessKeyId && this.config.accessKeySecret && this.config.appKey);
  }

  async transcribe(audioBuffer, format = 'wav') {
    if (!this.isEnabled()) {
      throw new Error('阿里云语音服务未配置，请在配置文件中填写API密钥');
    }

    console.log('Transcribing audio with AliCloud...');
    
    try {
      const result = await this.callSpeechRecognitionAPI(audioBuffer, format);
      return {
        text: result.text,
        confidence: result.confidence,
        duration: result.duration
      };
    } catch (error) {
      console.error('Speech recognition error:', error);
      throw new Error('语音识别失败: ' + error.message);
    }
  }

  async gradeSpeaking(audioBuffer, referenceText) {
    if (!this.isEnabled()) {
      throw new Error('阿里云语音服务未配置');
    }

    console.log('Grading speaking with AliCloud...');
    
    try {
      const result = await this.callSpeakingGradingAPI(audioBuffer, referenceText);
      return {
        overallScore: result.overallScore,
        pronunciation: result.pronunciation,
        fluency: result.fluency,
        completeness: result.completeness,
        feedback: result.feedback
      };
    } catch (error) {
      console.error('Speaking grading error:', error);
      throw new Error('口语评分失败: ' + error.message);
    }
  }

  async callSpeechRecognitionAPI(audioBuffer, format) {
    return new Promise((resolve, reject) => {
      try {
        resolve({
          text: 'Sample transcription text',
          confidence: 0.95,
          duration: 5.3
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async callSpeakingGradingAPI(audioBuffer, referenceText) {
    return new Promise((resolve, reject) => {
      try {
        resolve({
          overallScore: 85,
          pronunciation: 88,
          fluency: 82,
          completeness: 85,
          feedback: '发音清晰，流利度较好，建议多练习连读'
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = AliCloudService;