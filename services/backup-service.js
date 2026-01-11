const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const config = require('../config');

class BackupService {
  constructor() {
    this.config = config.backup;
    this.scheduleBackup();
  }

  scheduleBackup() {
    if (!this.config.enabled) {
      console.log('Backup is disabled');
      return;
    }

    schedule.scheduleJob('0 0 * * *', () => {
      console.log('Starting scheduled backup...');
      this.performBackup().catch(err => {
        console.error('Backup failed:', err);
      });
    });

    console.log('Backup scheduled at 00:00 daily');
  }

  async performBackup() {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupDir = path.join(__dirname, '../backups');
    const dbPath = path.join(__dirname, '../database.db');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup_${timestamp}.zip`);
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    archive.file(dbPath, { name: 'database.db' });
    archive.directory(uploadsDir, 'uploads');

    await archive.finalize();

    console.log(`Backup completed: ${backupFile}`);

    this.cleanOldBackups();
  }

  cleanOldBackups() {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) return;

    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > retentionMs) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    });
  }
}

module.exports = BackupService;