const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const QwenService = require('./qwen-service');

class ExerciseParserService {
  constructor(db) {
    this.db = db;
    this.qwenService = new QwenService();
  }

  async parseFile(lessonId, filePath, fileType) {
    const fullPath = path.join(__dirname, '..', filePath);
    console.log('Parsing file:', fullPath, 'type:', fileType);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`文件不存在: ${fullPath}`);
    }

    let textContent = '';

    try {
      if (fileType === '.pdf') {
        console.log('Parsing PDF...');
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdfParse(dataBuffer);
        textContent = data.text;
        console.log('PDF parsed, text length:', textContent.length);
      } else if (fileType === '.docx') {
        console.log('Parsing Word...');
        const result = await mammoth.extractRawText({ path: fullPath });
        textContent = result.value;
        console.log('Word parsed, text length:', textContent.length);
      } else {
        throw new Error(`不支持的文件格式: ${fileType}`);
      }

      if (!textContent || textContent.trim().length === 0) {
        throw new Error('文件内容为空，无法解析');
      }

      return await this.parseTextToQuestions(textContent, lessonId);
    } catch (error) {
      console.error('Error parsing exercise file:', error);
      throw error;
    }
  }

  async parseTextToQuestions(text, lessonId) {
    const prompt = `你是一位专业的英语练习题解析专家。请分析以下文本内容，识别其中的题目。

文本内容：
${text}

请识别题目类型：single_choice（单选题）、multiple_choice（多选题）、fillblank（填空题）、cloze（完形填空）、essay（作文）

请严格按照以下JSON格式返回，不要包含其他内容：
{
  "questions": [
    {
      "type": "single_choice",
      "content": "题目内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correct_answer": "A",
      "difficulty": "medium"
    }
  ]
}

注意：
1. 完形填空作为一道大题，type为"cloze"
2. 作文题type为"essay"
3. 如果无法准确识别，可以不填correct_answer字段
4. difficulty可以是: easy, medium, hard`;

    try {
      console.log('Calling AI API to parse questions...');
      const response = await this.qwenService.callAPI(prompt);
      console.log('AI response received, length:', response?.length);
      
      const result = this.parseResponse(response);
      console.log('Parsed questions count:', result.questions?.length);

      return {
        lessonId,
        questions: result.questions || [],
        rawText: text
      };
    } catch (error) {
      console.error('Error parsing text to questions:', error);
      throw new Error(`AI解析题目失败: ${error.message}`);
    }
  }

  parseResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { questions: [] };
    } catch (error) {
      console.error('Parse error:', error);
      return { questions: [] };
    }
  }

  async createQuestionsFromParsed(lessonId, parsedResult, exerciseBookId = null) {
    const Question = require('../models/question');
    const questionModel = new Question(this.db);

    const questionIds = [];
    
    for (const questionData of parsedResult.questions) {
      const questionId = await questionModel.create({
        lessonId,
        exerciseBookId,
        type: questionData.type,
        content: questionData.content,
        options: questionData.options,
        correctAnswer: questionData.correct_answer,
        difficulty: questionData.difficulty || 'medium'
      });
      questionIds.push(questionId);
    }

    return questionIds;
  }
}

module.exports = ExerciseParserService;