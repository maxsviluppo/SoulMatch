
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');

let braces = 0, parens = 0, brackets = 0;
let inString = null, inComment = null;
const lines = content.split('\n');

for (let L = 0; L < lines.length; L++) {
    const line = lines[L];
    const prevB = braces;
    for (let i = 0; i < line.length; i++) {
        const char = line[i], nextChar = line[i+1];
        if (inComment === 'line') break;
        if (inComment === 'block') { if (char === '*' && nextChar === '/') { inComment = null; i++; } continue; }
        if (inString) { if (char === inString) { let bs = 0; for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++; if (bs % 2 === 0) inString = null; } continue; }
        if (char === '/' && nextChar === '/') { inComment = 'line'; i++; continue; }
        if (char === '/' && nextChar === '*') { inComment = 'block'; i++; continue; }
        if (char === "'" || char === '"' || char === '`') { inString = char; continue; }
        if (char === '{') braces++; if (char === '}') braces--;
        if (char === '(') parens++; if (char === ')') parens--;
        if (char === '[') brackets++; if (char === ']') brackets--;
    }
    if (inComment === 'line') inComment = null;

    if (line.match(/^const \w+ = .*=>\s*{/) || line.match(/^export const \w+ = .*=>\s*{/)) {
        if (prevB !== 0) {
            console.log(`POTENTIAL MISSING CLOSE before L${L+1}: current B=${prevB} | ${line.trim()}`);
            // Reset B to 0 to find the next error? No, let's keep going.
        }
    }
}
