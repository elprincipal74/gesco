const db = require('./src/database/db.js');

try {
  console.log('--- RESETTING DATABASE ---');
  db.resetDatabase();
  console.log('Reset completed.');

  console.log('--- MARIO ROSSI FULL ---');
  const user = db.prepare("SELECT * FROM users WHERE id = 'dipendente-1'").get();
  console.log(user);

  console.log('--- HOLIDAY REQUESTS ---');
  const requests = db.prepare('SELECT * FROM holiday_requests').all();
  console.log(requests);
} catch (err) {
  console.error('Error:', err);
}
