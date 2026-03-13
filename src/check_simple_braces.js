
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');
const lines = content.split('\n');

let B=0;
let lastB = 0;
for (let L=0; L<lines.length; L++) {
    const line = lines[L];
    const prevB = B;
    
    // Very simple tag/JSX skip (heuristic)
    // We only care about { and } in real JS
    // But in TSX, { and } are used in JSX too.
    for (let i=0; i<line.length; i++) {
        // Skip strings to avoid the quote bug
        // But the quote bug IS the problem for my script.
        // Let's use a better regex for strings.
        const c=line[i];
        if (c==='{') B++;
        if (c==='}') B--;
    }
    
    if (B !== lastB) {
        // console.log(`L${L+1}: B=${B} | ${line.trim()}`);
        lastB = B;
    }
}
console.log("Final balance (simple):", B);
