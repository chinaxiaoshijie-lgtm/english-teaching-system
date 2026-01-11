const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/legacy/build/pdf.worker.cjs';

class SlideService {
  constructor(db) {
    this.db = db;
  }

  async processLesson(lessonId, filePath) {
    try {
      console.log(`Processing lesson ${lessonId}: ${filePath}`);
      
      const fullPath = path.join(__dirname, '..', filePath);
      const slidesDir = path.join(__dirname, '../uploads/lessons', lessonId.toString(), 'slides');
      
      if (!fs.existsSync(slidesDir)) {
        fs.mkdirSync(slidesDir, { recursive: true });
      }

      const dataBuffer = fs.readFileSync(fullPath);
      const pdfDocument = await pdfjsLib.getDocument(dataBuffer).promise;
      
      const LessonSlide = require('../models/lesson-slide');
      const lessonSlideModel = new LessonSlide(this.db);
      
      await lessonSlideModel.deleteByLessonId(lessonId);

      const slides = [];
      const pageCount = pdfDocument.numPages;
      
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        const fileName = `page-${i}.jpg`;
        const imageFilePath = path.join(slidesDir, fileName);
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        fs.writeFileSync(imageFilePath, buffer);
        
        const dbPath = `/uploads/lessons/${lessonId}/slides/${fileName}`;
        await lessonSlideModel.create({
          lessonId: lessonId,
          pageNumber: i,
          imagePath: dbPath
        });
        slides.push({
          lesson_id: lessonId,
          page_number: i,
          image_path: dbPath
        });
        console.log(`Processed page ${i}/${pageCount}`);
      }

      const Lesson = require('../models/lesson');
      const lessonModel = new Lesson(this.db);
      await lessonModel.updateSlideCount(lessonId, pageCount);
      await lessonModel.updateHasSlides(lessonId, true);

      console.log(`Lesson ${lessonId} processed successfully with ${pageCount} slides`);
      
      return {
        success: true,
        slideCount: pageCount,
        slides
      };
    } catch (error) {
      console.error(`Error processing lesson ${lessonId}:`, error);
      throw error;
    }
  }

  async getSlides(lessonId) {
    const LessonSlide = require('../models/lesson-slide');
    const lessonSlideModel = new LessonSlide(this.db);
    return await lessonSlideModel.getByLessonId(lessonId);
  }

  async cleanupSlides(lessonId) {
    const slidesDir = path.join(__dirname, '../uploads/lessons', lessonId.toString(), 'slides');
    
    if (fs.existsSync(slidesDir)) {
      const files = fs.readdirSync(slidesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(slidesDir, file));
      });
      fs.rmdirSync(slidesDir);
    }

    const LessonSlide = require('../models/lesson-slide');
    const lessonSlideModel = new LessonSlide(this.db);
    await lessonSlideModel.deleteByLessonId(lessonId);

    const Lesson = require('../models/lesson');
    const lessonModel = new Lesson(this.db);
    await lessonModel.updateSlideCount(lessonId, 0);
    await lessonModel.updateHasSlides(lessonId, false);
  }

  async getSlideCount(lessonId) {
    const Lesson = require('../models/lesson');
    const lessonModel = new Lesson(this.db);
    const lesson = await lessonModel.getById(lessonId);
    return lesson ? lesson.slide_count : 0;
  }
}

module.exports = SlideService;