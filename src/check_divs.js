
import fs from 'fs';

const content = fs.readFileSync('c:/Users/Max/Downloads/A Codici Main/SoulMatch-main/SoulMatch-main/src/App.tsx', 'utf8');
const lines = content.split('\n');

const start = 2347;
const end = 2875;

let open = 0;
let close = 0;

for (let i = start - 1; i < end; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  open += opens;
  close += closes;
}

console.log(`Open: ${open}, Close: ${close}`);
