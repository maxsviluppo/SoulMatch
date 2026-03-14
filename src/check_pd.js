
import fs from 'fs';

const content = fs.readFileSync('c:/Users/Max/Downloads/A Codici Main/SoulMatch-main/SoulMatch-main/src/App.tsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let openJSX = 0;

for (let i = 2013; i < 2874; i++) {
  const line = lines[i];
  if (!line) continue;
  
  // Count opening <div and closing </div>
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  openDivs += opens - closes;
  
  // Count { and }
  const jsxOpens = (line.match(/\{/g) || []).length;
  const jsxCloses = (line.match(/\}/g) || []).length;
  openJSX += jsxOpens - jsxCloses;
}

console.log(`Open Divs: ${openDivs}`);
console.log(`Open JSX Braces: ${openJSX}`);
