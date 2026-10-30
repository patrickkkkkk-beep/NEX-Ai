// NEX AI server for Render. Node.js 18+; no npm packages needed.
const http=require("http"),fs=require("fs"),path=require("path");
const PORT=Number(process.env.PORT||3000),HOST="0.0.0.0";
const API_KEY=process.env.GROQ_API_KEY,API_URL="https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL=process.env.GROQ_MODEL||"openai/gpt-oss-120b";
function send(res,status,data,type="application/json; charset=utf-8"){res.writeHead(status,{"Content-Type":type,"X-Content-Type-Options":"nosniff"});res.end(type.startsWith("application/json")?JSON.stringify(data):data)}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,"http://localhost");
if(req.method==="GET"&&url.pathname==="/api/health")return send(res,200,{ok:true,configured:Boolean(API_KEY)});
if(req.method==="GET"&&(url.pathname==="/"||url.pathname==="/index.html")){try{return send(res,200,fs.readFileSync(path.join(__dirname,"index.html")),"text/html; charset=utf-8")}catch{return send(res,500,{error:"index.html not found"})}}
if(req.method==="POST"&&url.pathname==="/api/chat"){if(!API_KEY)return send(res,503,{error:"کلید GROQ_API_KEY در تنظیمات Render ثبت نشده است."});let raw="";try{for await(const c of req){raw+=c;if(raw.length>1000000)return send(res,413,{error:"درخواست بیش از حد بزرگ است"})}const b=JSON.parse(raw||"{}");if(!Array.isArray(b.messages)||!b.messages.length)return send(res,400,{error:"پیامی برای ارسال وجود ندارد"});const messages=b.messages.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-30);const model=typeof b.model==="string"&&/^[a-zA-Z0-9._/-]{1,120}$/.test(b.model)?b.model:DEFAULT_MODEL;const up=await fetch(API_URL,{method:"POST",headers:{"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model,messages,temperature:0.7})});const data=await up.json().catch(()=>({}));if(!up.ok)return send(res,up.status,{error:data.error?.message||data.message||"Groq API request failed"});const reply=data.choices?.[0]?.message?.content;if(typeof reply!=="string")return send(res,502,{error:"پاسخ قابل‌خواندن از Groq دریافت نشد"});return send(res,200,{reply})}catch(e){return send(res,400,{error:e.message||"درخواست نامعتبر است"})}}
return send(res,404,{error:"Not found"})});
server.listen(PORT,HOST,()=>console.log("NEX AI listening on "+HOST+":"+PORT));
