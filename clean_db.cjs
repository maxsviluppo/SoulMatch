const Database = require('better-sqlite3');
const db = new Database('soulmatch.db');
db.prepare("DELETE FROM users WHERE name IN ('Giulia', 'Marco', 'Laura', 'Alessandro', 'Elena')").run();
console.log('Seed users deleted.');
