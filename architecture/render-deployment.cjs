const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
for(const scale of [1,2]){
const p=await b.newPage({viewport:{width:1600,height:1060},deviceScaleFactor:scale});
await p.setContent('<html><head><meta charset="utf-8"><style>html,body{margin:0}svg{display:block}</style></head><body>'+fs.readFileSync(path.join(__dirname,'arch-2.svg'),'utf8')+'</body></html>');
await p.evaluate(()=>document.fonts.ready);
console.log(JSON.stringify(await p.locator('svg text').evaluateAll(ns=>ns.map(n=>({text:n.textContent,b:n.getBBox()})).filter(v=>v.b.x<0||v.b.x+v.b.width>1598||v.b.y+v.b.height>1060))));
await p.screenshot({path:path.join(__dirname,scale===1?'arch-2.png':'arch-2@2x.png'),timeout:60000});await p.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
