const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const fs = require('fs');
const path = require('path');

class SlideService {
  constructor(db) {
    this.db = db;
    pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    
    try {
      this.canvas = require('canvas');
      this.hasCanvas = true;
    } catch (error) {
      console.warn('Canvas module not installed. PDF processing will be disabled.');
      this.hasCanvas = false;
    }
  }

  async processLesson(lessonId, filePath) {
    try {
      console.log(`Processing lesson ${lessonId}: ${filePath}`);
      
      if (!this.hasCanvas) {
        throw new Error('Canvas module is not installed. Please run: npm install canvas');
      }
      
      const fullPath = path.join(__dirname, '..', filePath);
      const slidesDir = path.join(__dirname, '../uploads/lessons', lessonId.toString(), 'slides');
      
      if (!fs.existsSync(slidesDir)) {
        fs.mkdirSync(slidesDir, { recursive: true });
      }

      const pdfDoc = await pdfjsLib.getDocument(fullPath).promise;
      const numPages = pdfDoc.numPages;
      
      console.log(`PDF has ${numPages} pages`);

      const LessonSlide = require('./lesson-slide');
      const lessonSlideModel = new LessonSlide(this.db);
      
      await lessonSlideModel.deleteByLessonId(lessonId);

      for (let i = 1; i <= numPages; i++) {
        await this.renderPageToImage(pdfDoc, i, slidesDir, lessonId, lessonSlideModel);
        console.log(`Processed page ${i}/${numPages}`);
      }

      const Lesson = require('./lesson');
      const lessonModel = new Lesson(this.db);
      await lessonModel.updateSlideCount(lessonId, numPages);
      await lessonModel.updateHasSlides(lessonId, true);

      console.log(`Lesson ${lessonId} processed successfully with ${numPages} slides`);
      
      return {
        success: true,
        slideCount: numPages,
        slides: await lessonSlideModel.getByLessonId(lessonId)
      };
    } catch (error) {
      console.error(`Error processing lesson ${lessonId}:`, error);
      throw error;
    }
  }

  async renderPageToImage(pdfDoc, pageNumber, outputDir, lessonId, lessonSlideModel) {
    if (!this.hasCanvas) {
      throw new Error('Canvas module is not installed');
    }
    
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });

    const { createCanvas } = this.canvas;
    const canvasObj = createCanvas(viewport.width, viewport.height);
    const context = canvasObj.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    const slidePath = path.join(outputDir, `slide_${pageNumber}.jpg`);
    const buffer = canvasObj.toBuffer('image/jpeg', { quality: 0.9 });
    fs.writeFileSync(slidePath, buffer);

    const dbPath = `/uploads/lessons/${lessonId}/slides/slide_${pageNumber}.jpg`;
    await lessonSlideModel.create({
      lessonId: lessonId,
      pageNumber: pageNumber,
      imagePath: dbPath
    });
  }

  async getSlides(lessonId) {
    const LessonSlide = require('./lesson-slide');
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

    const LessonSlide = require('./lesson-slide');
    const lessonSlideModel = new LessonSlide(this.db);
    await lessonSlideModel.deleteByLessonId(lessonId);

    const Lesson = require('./lesson');
    const lessonModel = new Lesson(this.db);
    await lessonModel.updateSlideCount(lessonId, 0);
    await lessonModel.updateHasSlides(lessonId, false);
  }

  async getSlideCount(lessonId) {
    const Lesson = require('./lesson');
    const lessonModel = new Lesson(this.db);
    const lesson = await lessonModel.getById(lessonId);
    return lesson ? lesson.slide_count : 0;
  }
}

module.exports = SlideService;
