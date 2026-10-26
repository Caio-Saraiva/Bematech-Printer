/* Compatibility bridge for the original Windows 98 UI.
   Native mode uses the C backend. Demo mode never discovers a printer or calls it. */
(function(){
'use strict';
const defaults={cols_a:48,cols_b:64,dots:576,line_spacing:17,image_width:576,default_feed:3,auto_cut:1,italic:1,condensed_esc:0,raster_fallback:1};
const defaultConnection={transport:'simulation',device:'',baud:9600,data_bits:8,parity:'none',stop_bits:1};
const builtins=[{name:'Bambu Lab A1',power_w:95,max_power_w:1300,note:'95 W reference average; maximum 1300 W at 220 V.'},{name:'Bambu Lab A1 mini',power_w:80,max_power_w:150,note:'80 W reference average; maximum 150 W.'}];
const key='bematech-printer-local-v2';
let native=false,ready,mode='simulation',lastJob=null,store;
try{store=JSON.parse(localStorage.getItem(key)||'null');}catch{store=null;}
if(!store||typeof store!=='object')store={};
store={settings:{...defaults,...store.settings},connection:{...defaultConnection,...store.connection},printers:Array.isArray(store.printers)?store.printers:[],quotes:Array.isArray(store.quotes)?store.quotes:[],jobs:Array.isArray(store.jobs)?store.jobs:[],counter:Number(store.counter)||0};
const clone=value=>JSON.parse(JSON.stringify(value));
const text64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
function persist(){try{localStorage.setItem(key,JSON.stringify(store));}catch{throw Error('Cannot save local browser data. Check available storage.');}}
async function wire(path,opt={}){
 const r=await fetch(path,{...opt,headers:{...opt.headers,'X-Bematech-Client':'1'}});
 const value=path.endsWith('.csv')?await r.text():await r.json().catch(()=>({error:'Invalid response from the native application'}));
 if(!r.ok)throw Error(value.error||String(value));return value;
}
function options(body={}){return {dots:store.settings.dots,spacing:store.settings.line_spacing,feed:body.feed??store.settings.default_feed,cut:body.cut??!!store.settings.auto_cut};}
function packedCanvas(canvas){
 const width=canvas.width,height=canvas.height,ctx=canvas.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,width,height).data,bytes=new Uint8Array(Math.ceil(width/8)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,a=pixels[i+3]/255,v=255-(255-(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]))*a;if(v<170)bytes[y*Math.ceil(width/8)+(x>>3)]|=128>>(x&7);}
 return {width,height,data_base64:text64(bytes),packing:'row'};
}
function richLines(html){
 const root=document.createElement('div');root.innerHTML=html;const lines=[];let line={align:'left',parts:[]};
 const flush=force=>{if(force||line.parts.length)lines.push(line);line={align:line.align,parts:[]};};
 function visit(node,style,align){
   if(node.nodeType===3){let value=node.nodeValue.replace(/\u00a0/g,' ');if(value)line.parts.push({text:value,...style});return;}
   if(node.nodeType!==1)return;const tag=node.tagName;
   if(tag==='BR'){flush(true);return;}
   if(['SCRIPT','STYLE','IMG','IFRAME','OBJECT'].includes(tag))return;
   const block=['DIV','P','LI'].includes(tag),direct=(node.getAttribute('align')||'').toLowerCase(),css=/text-align\s*:\s*(left|center|right)/i.exec(node.getAttribute('style')||'');
   const nextAlign=['left','center','right'].includes(direct)?direct:css?css[1].toLowerCase():align;
   if(block&&line.parts.length)flush(false);line.align=nextAlign;
   const next={...style};if(['B','STRONG'].includes(tag))next.bold=true;if(['I','EM'].includes(tag))next.italic=true;if(tag==='U')next.underline=true;
   [...node.childNodes].forEach(n=>visit(n,next,nextAlign));if(block)flush(true);
 }
 [...root.childNodes].forEach(node=>visit(node,{bold:false,italic:false,underline:false},'left'));
 if(line.parts.length)lines.push(line);return lines;
}
function wrap(parts,columns){
 const out=[];let line=[],count=0;
 for(const part of parts)for(const token of part.text.match(/\S+|\s+/gu)||[]){
   const chars=[...token];while(chars.length){
     let room=columns-count;if(room<=0){out.push(line);line=[];count=0;room=columns;}
     const take=chars.splice(0,room).join('');
     if(!(count===0&&/^\s+$/u.test(take))){const previous=line[line.length-1];if(previous&&previous.bold===part.bold&&previous.italic===part.italic&&previous.underline===part.underline)previous.text+=take;else line.push({...part,text:take});count+=[...take].length;}
     if(count>=columns){out.push(line);line=[];count=0;}
   }
 }
 if(line.length||!out.length)out.push(line);return out;
}
function documentPages(body,list=false){
 const s=store.settings,condensed=!!body.condensed&&!!s.condensed_esc;
 let columns=condensed?s.cols_b:s.cols_a;if(body.expanded)columns=Math.max(1,Math.floor(columns/2));
 let lines=[];
 if(list){
   const title=String(body.title||'LISTA'),date=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).replace(',','');
   lines=[{align:'center',parts:[{text:title,bold:true}]},{align:'center',parts:[{text:date}]},{align:'left',parts:[{text:'-'.repeat(Math.max(3,Math.min(columns,title.length)))}]}];
   for(const source of richLines(body.html||'').filter(x=>x.parts.some(p=>p.text.trim())))wrap(source.parts,columns-2).forEach((row,i)=>lines.push({align:'left',parts:[{text:i?'  ':'- '},...row]}));
 }else for(const source of richLines(body.html||''))for(const parts of wrap(source.parts,columns))lines.push({align:source.align,parts});
 if(!lines.some(line=>line.parts.some(p=>p.text.trim())))throw Error('No content to print.');
 if(lines.length>2000)throw Error('Split this document into smaller jobs (maximum 2,000 text rows).');
 const pages=[],lineHeight=24,rowsPerPage=75,charWidth=(s.dots-8)/columns;
 for(let start=0;start<lines.length;start+=rowsPerPage){
   const rows=lines.slice(start,start+rowsPerPage),canvas=document.createElement('canvas');canvas.width=s.dots;canvas.height=Math.max(24,rows.length*lineHeight+8);
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';ctx.textBaseline='top';
   rows.forEach((line,i)=>{
     const count=line.parts.reduce((n,p)=>n+[...p.text].length,0);let x=line.align==='center'?(s.dots-count*charWidth)/2:line.align==='right'?s.dots-4-count*charWidth:4;
     for(const part of line.parts){
       const w=[...part.text].length*charWidth;
       ctx.save();ctx.font=(part.italic?'italic ':'')+(part.bold?'bold ':'')+'20px "Courier New",monospace';
       const natural=ctx.measureText(part.text).width;if(natural>0){ctx.translate(x,4+i*lineHeight);ctx.scale(w/natural,1);ctx.fillText(part.text,0,0);}ctx.restore();
       if(part.underline){ctx.fillRect(x,4+i*lineHeight+21,w,1);}x+=w;
     }
   });pages.push(packedCanvas(canvas));
 }return pages;
}
function imageBytes(image){
 const raw=Uint8Array.from(atob(image.data_base64),c=>c.charCodeAt(0)),w=image.width,h=image.height,row=Math.ceil(w/8);
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||w>store.settings.dots||h<1||h>6000)throw Error('Invalid image dimensions');
 const expected=image.packing==='row'?row*h:Math.ceil(w*h/8);if(raw.length!==expected)throw Error('Incomplete bitmap');
 const at=(x,y)=>image.packing==='row'?!!(raw[y*row+(x>>3)]&(128>>(x&7))):!!(raw[(y*w+x)>>3]&(128>>((y*w+x)&7)));
 return {raw,w,h,row,at};
}
function escJob(images,body={}){
 const s=store.settings,out=[],cut=body.cut??!!s.auto_cut,feed=body.feed??s.default_feed,gap=body.gap??1;
 for(let j=0;j<images.length;j++){
   const image=imageBytes(images[j]),{w,h,at}=image,margin=Math.floor((s.dots-w)/2),total=s.dots;
   out.push(27,64,27,116,2,27,51,s.line_spacing);
   for(let band=0;band<h;band+=24){out.push(27,42,33,total&255,total>>8);for(let x=0;x<total;x++)for(let offset=0;offset<3;offset++){let byte=0;for(let bit=0;bit<8;bit++){const y=band+offset*8+bit;if(x>=margin&&x<margin+w&&y<h&&at(x-margin,y))byte|=128>>bit;}out.push(byte);}out.push(10);}
   out.push(27,50);if(j+1<images.length)for(let n=0;n<gap;n++)out.push(10);
 }
 for(let n=0;n<feed;n++)out.push(10);if(cut)out.push(27,119,0);return new Uint8Array(out);
}
function record(path,bytes){
 const id=++store.counter,item={id,created_at:Math.floor(Date.now()/1000),kind:path.split('/').pop(),bytes,status:'simulated'};
 store.jobs.push(item);store.jobs=store.jobs.slice(-100);persist();window.dispatchEvent(new CustomEvent('bematech:job',{detail:item}));return {id,status:'simulated',bytes};
}
function validateSettings(s){
 const ranges={cols_a:[20,80],cols_b:[30,120],dots:[320,832],image_width:[8,832],line_spacing:[1,60],default_feed:[0,20],auto_cut:[0,1],italic:[0,1],condensed_esc:[0,1],raster_fallback:[0,1]};
 for(const [k,v]of Object.entries(s))if(!ranges[k]||!Number.isInteger(v)||v<ranges[k][0]||v>ranges[k][1])throw Error('Invalid calibration value');
 if(s.image_width>s.dots)throw Error('Image width cannot exceed print-head width');
}
async function simulate(path,body,post){
 if(path==='/api/info')return {version:'0.2.0',mode:'simulation',...options()};
 if(path==='/api/settings'){
   if(post){const next={...store.settings,...body};validateSettings(next);store.settings=next;persist();return {ok:true,settings:clone(next)};}return clone(store.settings);
 }
 if(path==='/api/connection'){
   if(post){store.connection={...defaultConnection,...body};persist();}return {...store.connection,config_path:'Browser local storage (demo; no hardware)'};
 }
 if(path==='/api/devices')return {devices:[]};
 if(path==='/api/connection/test')return {ok:true,state:'simulation',message:'Browser demo: no physical device is opened.'};
 if(path==='/api/status')return {state:'simulation',configured_device:'Simulation',transport:'simulation',message:'Demo: no printer connection.'};
 if(path==='/api/jobs')return {jobs:clone(store.jobs.slice(-20).reverse())};
 if(path==='/api/calculator/printers'){
   if(post){if(!String(body.name||'').trim()||body.name.length>80||!(body.power_w>=1&&body.power_w<=5000)||body.max_power_w<0||body.max_power_w>10000)throw Error('Invalid printer data');if([...builtins,...store.printers].some(x=>x.name===body.name))throw Error('Printer name already exists');store.printers.push(clone(body));persist();}
   return {printers:clone([...builtins,...store.printers])};
 }
 if(path==='/api/calculator/quotes'){if(!body.data||!body.result)throw Error('Invalid quote');const id=(store.quotes.at(-1)?.id||0)+1;store.quotes.push({id,created_at:Math.floor(Date.now()/1000),data:clone(body.data),result:clone(body.result)});store.quotes=store.quotes.slice(-100);persist();return {ok:true,id};}
 if(path==='/api/calculator/history')return {quotes:clone(store.quotes.slice().reverse())};
 if(path==='/api/calculator/history.csv')return quoteCsv(store.quotes.slice().reverse());
 if(path==='/api/server-diagnostic')return {hostname:'Browser demo (simulated)',ip:'No printer connection',system:navigator.userAgent,uptime_seconds:Math.round(performance.now()/1000),cpu:{model:'Browser sandbox — sample values',logical_cores:navigator.hardwareConcurrency||1,usage_percent:null,load_average:null},memory:{total_bytes:8*1024**3,used_bytes:2*1024**3},disk:{path:'Simulated',total_bytes:128*1024**3,used_bytes:32*1024**3,free_bytes:96*1024**3},simulated:true};
 if(path==='/api/calibration/apply'){const keys={columns_normal:'cols_a',columns_condensed:'cols_b',width:'dots',line_spacing:'line_spacing'},key=keys[body.kind];if(!key)throw Error('Invalid calibration kind');const next={...store.settings,[key]:body.value};if(key==='dots'&&next.image_width>next.dots)next.image_width=next.dots;validateSettings(next);store.settings=next;persist();return {ok:true,settings:clone(next)};}
 if(path==='/api/document/read')return window.localDocuments.read(body,store.settings.dots);
 if(path.startsWith('/api/print/')||path==='/api/feed'||path==='/api/cut'||path==='/api/calibration/print'){
   let bytes=0;if(body.pages||body.images){lastJob={images:body.pages||body.images,body};bytes=escJob(lastJob.images,body).length;}
   else if(path==='/api/print/image'){lastJob={images:[body],body};bytes=escJob([body],body).length;}
   else if(path==='/api/print/raw')bytes=atob(body.data_base64).length;
   else bytes=new TextEncoder().encode(JSON.stringify(body)).length;
   return record(path,bytes);
 }
 throw Error('Unknown demo route: '+path);
}
function quoteCsv(quotes){
 const headers=['data','material','preco_kg','peso_g','quantidade_pecas','impressora','potencia_w','tempo_horas','tarifa_kwh','custo_material','custo_energia','custo_maquina','mao_obra','embalagem','outros_custos','reserva_falha_pct','custo_total','margem_alvo_pct','taxa_pagamento_pct','preco_tabela','desconto_pct','preco_final','lucro_final','margem_efetiva_pct'];
 const escape=v=>{let s=String(v??'');if(typeof v==='string'&&/^\s*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const rows=quotes.map(({created_at,data:d,result:r})=>[new Date(created_at*1000).toISOString(),d.material,d.priceKg,d.weight,d.quantity,d.printer,d.power,d.hours,d.tariff,r.materialCost,r.energyCost,r.machineCost,r.laborCost,d.packaging,d.other,d.failureReserve,r.totalCost,d.margin,d.paymentFee,r.listPrice,d.discount,r.finalPrice,r.profit,r.effectiveMargin].map(escape).join(';'));
 return '\ufeff'+headers.join(';')+'\r\n'+rows.join('\r\n')+'\r\n';
}
async function request(path,opt={}){
 await ready;const post=(opt.method||'GET')==='POST';let body=post&&typeof opt.body==='string'?JSON.parse(opt.body):{};
 if(path==='/api/print/document'||path==='/api/print/list-rich'){
   body={...body,pages:documentPages(body,path==='/api/print/list-rich')};delete body.html;
   opt={...opt,body:JSON.stringify(body)};
 }
 if(path==='/api/print/image')lastJob={images:[clone(body)],body:clone(body)};
 if(body.pages||body.images)lastJob={images:clone(body.pages||body.images),body:clone(body)};
 const result=native?await wire(path,opt):await simulate(path,body,post);
 if(path==='/api/settings')store.settings=post?clone(result.settings):clone(result);
 if(path==='/api/calibration/apply')store.settings=clone(result.settings);
 if(path==='/api/connection'){store.connection=clone(result);mode=native?result.transport:'simulation';window.dispatchEvent(new Event('bematech:connection'));}
 if(native&&post&&(path.startsWith('/api/print')||['/api/feed','/api/cut','/api/calibration/print'].includes(path)))window.dispatchEvent(new CustomEvent('bematech:job',{detail:result}));
 return result;
}
function download(data,name,type='application/octet-stream'){
 const blob=data instanceof Blob?data:new Blob([data],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function currentImages(){
 if(typeof tab!=='undefined'&&['photo','model3d'].includes(tab))return [packedCanvas(document.getElementById('photoCanvas'))];
 if(typeof tab!=='undefined'&&tab==='draw'){const c=document.getElementById('drawCanvas');return [packedCanvas(c)];}
 const paper=document.getElementById('paper'),raster=paper.querySelector('canvas');if(raster)return [packedCanvas(raster)];
 return documentPages({html:paper.innerHTML,condensed:false,expanded:false});
}
async function exportCurrent(type){
 const images=currentImages(),body={feed:Number(document.getElementById('feed').value),cut:document.getElementById('cut').checked,gap:1},image=images[0],{w,h,at}=imageBytes(image);
 if(type==='esc'){download(escJob(images,body),'bematech-job.bin');return;}
 if(type==='pbm'){const stride=Math.ceil(w/8),pixels=new Uint8Array(stride*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(at(x,y))pixels[y*stride+(x>>3)]|=128>>(x&7);
   const header=new TextEncoder().encode('P4\n'+w+' '+h+'\n');download(new Blob([header,pixels]),'bematech-preview.pbm','image/x-portable-bitmap');return;}
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),data=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,v=at(x,y)?0:255;data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}ctx.putImageData(data,0,0);
 canvas.toBlob(blob=>download(blob,'bematech-preview.png','image/png'));
}
ready=(async()=>{
 if(window.BEMATECH_DEMO_ONLY===true)return;
 try{const info=await wire('/api/info',{signal:AbortSignal.timeout(2500)});if(!info.version)throw Error();native=true;mode=info.mode;store.settings=await wire('/api/settings');store.connection=await wire('/api/connection');}
 catch{native=false;mode='simulation';}
})();
window.localBridge={request,ready,get native(){return native;},get mode(){return mode;},get settings(){return clone(store.settings);},get connection(){return clone(store.connection);},get lastJob(){return lastJob;},exportCurrent,download,packedCanvas,documentPages,escJob,quoteCsv};
document.addEventListener('click',async event=>{const link=event.target.closest?.('.calc-csv-button');if(!link)return;event.preventDefault();try{download(await request('/api/calculator/history.csv'),'orcamentos_3d.csv','text/csv;charset=utf-8');}catch(error){window.note?.(error.message,true);}});
})();
