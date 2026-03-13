
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');
const lines = content.split('\n');

let B=0, P=0, Br=0;
for (let L=0; L<lines.length; L++) {
    const line = lines[L];
    for (let i=0; i<line.length; i++) {
        const c=line[i];
        if (c==='{') B++; if (c==='}') B--;
        if (c==='(') P++; if (c===')') P--;
        if (c==='[') Br++; if (c===']') Br--;
    }
}
console.log("Final B:", B, "P:", P, "Br:", Br);
