
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;
let inString = null;
let inComment = null;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];

    if (inComment === 'line') {
        if (char === '\n') inComment = null;
        continue;
    }
    if (inComment === 'block') {
        if (char === '*' && nextChar === '/') {
            inComment = null;
            i++;
        }
        continue;
    }
    if (inString) {
        if (char === inString) {
            // Check for escaped quote
            let backslashes = 0;
            for (let j = i - 1; j >= 0 && content[j] === '\\'; j--) backslashes++;
            if (backslashes % 2 === 0) inString = null;
        }
        continue;
    }

    if (char === '/' && nextChar === '/') {
        inComment = 'line';
        i++;
        continue;
    }
    if (char === '/' && nextChar === '*') {
        inComment = 'block';
        i++;
        continue;
    }
    if (char === "'" || char === '"' || char === '`') {
        inString = char;
        continue;
    }

    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '(') parens++;
    if (char === ')') parens--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
}

console.log('Braces balance:', braces);
console.log('Parens balance:', parens);
console.log('Brackets balance:', brackets);
