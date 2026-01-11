const DatabaseTest = require('./database.test');
const config = require('../config');

console.log('========================================');
console.log('  英语教学互动系统 - 测试套件');
console.log('========================================\n');

async function runTests() {
  const test = new DatabaseTest();
  await test.runAll();
}

runTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});