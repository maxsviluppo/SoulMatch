
import fs from 'fs';

const content = fs.readFileSync('c:/Users/Max/Downloads/A Codici Main/SoulMatch-main/SoulMatch-main/src/App.tsx', 'utf8');
const lines = content.split('\n');

const start = 2347;
const end = 2875;

let p = 0;
let b = 0;
let k = 0;

for (let i = start - 1; i < end; i++) {
  const line = lines[i];
  for (let char of line) {
    if (char === '(') p++;
    if (char === ')') p--;
    if (char === '{') b++;
    if (char === '}') b--;
    if (char === '[') k++;
    if (char === ']') k--;
  }
}

console.log(`Parentheses: ${p}`);
console.log(`Braces: ${b}`);
console.log(`Brackets: ${k}`);
