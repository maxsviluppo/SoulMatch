
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;
let inString = null;
let inComment = null;

const lines = content.split('\n');

for (let L = 0; L < lines.length; L++) {
    const line = lines[L];
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i+1];

        if (inComment === 'line') {
            // Already in line comment, will end at next line
            break; 
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
                let backslashes = 0;
                for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) backslashes++;
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
    if (inComment === 'line') inComment = null;

    if (braces < 0 || parens < 0 || brackets < 0) {
        console.log(`Mismatch detected at line ${L+1}: Braces=${braces}, Parens=${parens}, Brackets=${brackets}`);
        // break; // Keep going to see final counts
    }
}
console.log(`Final: Braces=${braces}, Parens=${parens}, Brackets=${brackets}`);
