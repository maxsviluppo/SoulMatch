const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
let parenBalance = 0;
let braceBalance = 0;

for (let i = 2866; i < 3718; i++) {
  const line = lines[i];
  if (!line) continue;
  for (let char of line) {
    if (char === '{') braceBalance++;
    if (char === '}') braceBalance--;
    if (char === '(') parenBalance++;
    if (char === ')') parenBalance--;
  }
  if (braceBalance < 0 || parenBalance < 0) {
    console.log(`Mismatch on line ${i + 1}: brace=${braceBalance}, paren=${parenBalance}`);
  }
}
console.log(`Final balances: brace=${braceBalance}, paren=${parenBalance}`);
