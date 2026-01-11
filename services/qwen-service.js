const config = require('../config');

class QwenService {
  constructor() {
    this.config = config.qwen;
  }

  async gradeEssay(question, correctAnswer, studentAnswer) {
    const prompt = `你是一位专业的英语批改老师。请批改以下题目：

题目：${question}
参考答案：${correctAnswer}
学生答案：${studentAnswer}

请严格按照以下JSON格式返回，不要包含其他内容：
{
  "score": 85,
  "feedback": "详细评语",
  "corrections": ["错误1", "错误2"],
  "suggestions": ["改进建议1"]
}`;

    try {
      const response = await this.callAPI(prompt);
      const result = this.parseResponse(response);
      
      return {
        score: result.score,
        feedback: result.feedback,
        corrections: result.corrections || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('Qwen API error:', error);
      throw new Error('AI批改失败，请重试');
    }
  }

  async gradeMultipleChoice(question, correctAnswer, studentAnswer) {
    if (studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
      return {
        score: 100,
        feedback: '回答正确！',
        corrections: [],
        suggestions: []
      };
    }

    const prompt = `判断以下选择题的对错并给出解析：
题目：${question}
正确答案：${correctAnswer}
学生答案：${studentAnswer}

请按JSON格式返回：
{
  "score": 0,
  "feedback": "错误解析"
}`;

    const response = await this.callAPI(prompt);
    return this.parseResponse(response);
  }

  async gradeFillBlank(question, correctAnswer, studentAnswer) {
    const normalizedStudent = studentAnswer.toLowerCase().trim();
    const normalizedCorrect = correctAnswer.toLowerCase().trim();

    if (normalizedStudent === normalizedCorrect) {
      return {
        score: 100,
        feedback: '填空正确！',
        corrections: [],
        suggestions: []
      };
    }

    if (normalizedStudent.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedStudent)) {
      return {
        score: 70,
        feedback: '基本正确，但不够精确',
        corrections: [`正确答案是：${correctAnswer}`],
        suggestions: ['注意检查拼写和语法']
      };
    }

    const prompt = `批改以下填空题：
题目：${question}
正确答案：${correctAnswer}
学生答案：${studentAnswer}

请按JSON格式返回：
{
  "score": 0,
  "feedback": "解析"
}`;

    const response = await this.callAPI(prompt);
    return this.parseResponse(response);
  }

  async gradeImage(imageBuffer, question, correctAnswer) {
    const imageBase64 = imageBuffer.toString('base64');

    const prompt = `请批改这道英语题：
题目：${question}
参考答案：${correctAnswer}

请按JSON格式返回批改结果：
{
  "score": 85,
  "feedback": "评语",
  "corrections": ["错误1"],
  "suggestions": ["建议1"]
}`;

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                },
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        score: 75,
        feedback: content,
        corrections: [],
        suggestions: []
      };
    } catch (error) {
      console.error('Image grading error:', error);
      throw new Error('图片批改失败');
    }
  }

  async callAPI(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      console.log('Making API request to:', this.config.baseUrl);
      console.log('Model:', this.config.model);

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一位专业的英语批改老师，能够准确评估学生的英语答案。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log('API response received');

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid API response structure:', data);
        throw new Error('Invalid API response structure');
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API call error:', error);
      throw error;
    }
  }

  parseResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        score: 70,
        feedback: content,
        corrections: [],
        suggestions: []
      };
    } catch (error) {
      console.error('Parse error:', error);
      return {
        score: 70,
        feedback: content,
        corrections: [],
        suggestions: []
      };
    }
  }
}

module.exports = QwenService;