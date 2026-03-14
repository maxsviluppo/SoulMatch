
import fs from 'fs';

const content = fs.readFileSync('c:/Users/Max/Downloads/A Codici Main/SoulMatch-main/SoulMatch-main/src/App.tsx', 'utf8');
const lines = content.split('\n');

const start = 2013;
const end = 2874;

let balance = 0;
for (let i = start - 1; i < end; i++) {
  const line = lines[i];
  for (let char of line) {
    if (char === '{') balance++;
    if (char === '}') balance--;
  }
}

console.log(`Balance: ${balance}`);
