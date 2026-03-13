
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');
const lines = content.split('\n');

let Br=0;
for (let L=0; L<lines.length; L++) {
    const line = lines[L];
    const oldBr = Br;
    for (let i=0; i<line.length; i++) {
        if (line[i]==='[') Br++;
        if (line[i]===']') Br--;
    }
    if (Br === 1 && oldBr === 0) {
        console.log(`Potential leak START at L${L+1}: ${line.trim()}`);
    }
    if (Br === 0 && oldBr === 1) {
        console.log(`Potential leak END at L${L+1}: ${line.trim()}`);
    }
}
console.log("Final Br:", Br);
