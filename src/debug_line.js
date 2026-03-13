
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');
const lines = content.split('\n');
const line = lines[1260]; // 0-indexed
console.log('Line 1261 characters:');
for (let i = 0; i < line.length; i++) {
    console.log(i, line[i], line.charCodeAt(i));
}
