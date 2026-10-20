const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1600,height:2830},deviceScaleFactor:2});
 await page.setContent('<html><head><meta charset="UTF-8"><style>html,body{margin:0}svg{display:block}</style></head><body>'+fs.readFileSync(path.join(__dirname,'architecture.svg'),'utf8')+'</body></html>');
 await page.evaluate(()=>document.fonts.ready);
 const bounds=await page.locator('svg text').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,x:n.getBBox().x,right:n.getBBox().x+n.getBBox().width})).filter(n=>n.x<0||n.right>1595));
 console.log(JSON.stringify({outOfCanvas:bounds,font:await page.evaluate(()=>document.fonts.check('16px "Noto Sans KR"'))}));
 await page.screenshot({path:path.join(__dirname,'architecture@2x.png'),timeout:60000});
 const standard=await browser.newPage({viewport:{width:1600,height:2830},deviceScaleFactor:1});
 await standard.setContent(await page.content());
 await standard.evaluate(()=>document.fonts.ready);
 await standard.screenshot({path:path.join(__dirname,'architecture.png'),timeout:60000});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
