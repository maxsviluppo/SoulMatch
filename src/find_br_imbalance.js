
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');
const lines = content.split('\n');

let Br=0;
for (let L=0; L<lines.length; L++) {
    const line = lines[L];
    for (let i=0; i<line.length; i++) {
        if (line[i]==='[') Br++;
        if (line[i]===']') Br--;
    }
    if (Br !== 0) {
        // console.log(`L${L+1}: Br=${Br} | ${line.trim()}`);
    }
}
console.log("Final Br:", Br);
