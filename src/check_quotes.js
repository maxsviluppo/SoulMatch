
import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src\\App.tsx', 'utf8');
const lines = content.split('\n');

let inS=null, inC=null;
for (let L=0; L<lines.length; L++) {
    const line = lines[L];
    for (let i=0; i<line.length; i++) {
        const c=line[i], n=line[i+1];
        if (inC==='line') break;
        if (inC==='block') { if (c==='*' && n==='/') { inC=null; i++; } continue; }
        if (inS) { if (c===inS) { let bs=0; for (let j=i-1; j>=0 && line[j]==='\\'; j--) bs++; if (bs%2===0) inS=null; } continue; }
        if (c==='/' && n==='/') { inC='line'; i++; continue; }
        if (c==='/' && n==='*') { inC='block'; i++; continue; }
        if (c==="'" || c==='"' || c==='`') { inS=c; continue; }
    }
    if (inC==='line') inC=null;
    if (inS || inC) {
        // Log the first line where it stays non-null
        if (L < 1500) { // arbitrary limit
             console.log(`L${L+1}: inS=${inS}, inC=${inC} | ${line.trim()}`);
        }
    }
}
