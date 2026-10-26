/* Browser document adapter for local static previews and the isolated demo.
   The native C application uses Poppler/LibreOffice for full-fidelity Office conversion. */
(function(){
'use strict';
function bytes64(value){return Uint8Array.from(atob(value),char=>char.charCodeAt(0));}
const xml=source=>{const doc=new DOMParser().parseFromString(source,'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid Office XML');return doc;};
const elements=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
const text=node=>elements(node,'t').map(n=>n.textContent).join('');
async function inflate(bytes,expected){
 if(expected>20000000)throw Error('Expanded Office entry exceeds 20 MB');
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')),reader=stream.getReader(),chunks=[];let size=0;
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>20000000){await reader.cancel();throw Error('Expanded Office entry exceeds 20 MB');}chunks.push(value);}
 const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}return out;
}
async function unzip(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),files=new Map();let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('Invalid Office ZIP container');
 const count=view.getUint16(end+10,true);let cursor=view.getUint32(end+16,true);
 if(count>10000)throw Error('Office archive has too many entries');
 for(let i=0;i<count;i++){
   if(cursor+46>bytes.length||view.getUint32(cursor,true)!==0x02014b50)throw Error('Truncated Office archive');
   const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),compressed=view.getUint32(cursor+20,true),expanded=view.getUint32(cursor+24,true),length=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true),local=view.getUint32(cursor+42,true),name=new TextDecoder().decode(bytes.subarray(cursor+46,cursor+46+length));
   if(flags&1)throw Error('Password-protected Office documents are unsupported');
   if(local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)throw Error('Invalid Office entry');
   const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
   if(start+compressed>bytes.length)throw Error('Truncated Office entry');
   if(/\.xml$/.test(name)&&/^(word\/document|ppt\/slides\/slide\d+|xl\/(sharedStrings|worksheets\/sheet\d+)|content)\.xml$/.test(name)){
     let data=bytes.slice(start,start+compressed);if(method===8)data=await inflate(data,expanded);else if(method!==0)throw Error('Unsupported Office compression');
     files.set(name,new TextDecoder().decode(data));
   }
   cursor+=46+length+extra+comment;
 }
 return files;
}
function rtf(source){
 let output='',skip=false,stack=[],i=0;
 while(i<source.length){
   const c=source[i++];if(c==='{'){stack.push(skip);continue;}if(c==='}'){skip=stack.pop()??false;continue;}
   if(c!=='\\'){if(!skip&&c!=='\r'&&c!=='\n')output+=c;continue;}
   const rest=source.slice(i),escaped=source[i];
   if(['\\','{','}'].includes(escaped)){if(!skip)output+=escaped;i++;continue;}
   if(escaped==="'"){const byte=parseInt(source.slice(i+1,i+3),16);if(!skip&&Number.isFinite(byte))output+=new TextDecoder('windows-1252').decode(new Uint8Array([byte]));i+=3;continue;}
   if(escaped==='*'){skip=true;i++;continue;}
   const match=/^([a-z]+)(-?\d+)? ?/i.exec(rest);if(!match){if(!skip&&escaped==='~')output+=' ';i++;continue;}
   i+=match[0].length;const word=match[1],number=Number(match[2]);
   if(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer'].includes(word)){skip=true;continue;}
   if(skip)continue;if(word==='par'||word==='line')output+='\n';else if(word==='tab')output+='\t';else if(word==='u'&&Number.isFinite(number)){output+=String.fromCharCode(number<0?number+65536:number);if(source[i]&&source[i]!=='\\'&&source[i]!=='{'&&source[i]!=='}')i++;}
 }
 return output;
}
async function office(bytes,ext){
 if(ext==='rtf')return [rtf(new TextDecoder('windows-1252').decode(bytes))];
 if(['doc','xls','ppt'].includes(ext))throw Error('Legacy binary Office files require the native app with LibreOffice. Export as PDF or DOCX/XLSX/PPTX to try them in the browser demo.');
 const files=await unzip(bytes);
 if(ext==='docx'){
   const source=files.get('word/document.xml');if(!source)throw Error('DOCX document.xml not found');
   return [elements(xml(source),'p').map(paragraph=>{
     let result='';const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_ELEMENT);
     let node;while((node=walker.nextNode())){if(node.localName==='t')result+=node.textContent;if(node.localName==='tab')result+='\t';if(node.localName==='br')result+=node.getAttribute('w:type')==='page'?'\f':'\n';}
     return result;
   }).join('\n')].flatMap(s=>s.split('\f'));
 }
 if(ext==='odt'){const source=files.get('content.xml');if(!source)throw Error('ODT content.xml not found');const doc=xml(source);return [[...doc.getElementsByTagNameNS('*','p'),...doc.getElementsByTagNameNS('*','h')].map(n=>n.textContent).join('\n')];}
 if(ext==='pptx')return [...files.keys()].filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0])).map(k=>elements(xml(files.get(k)),'p').map(text).join('\n'));
 if(ext==='xlsx'){
   const shared=files.has('xl/sharedStrings.xml')?elements(xml(files.get('xl/sharedStrings.xml')),'si').map(text):[];
   return [...files.keys()].filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort().map(k=>elements(xml(files.get(k)),'row').slice(0,10000).map(row=>elements(row,'c').map(cell=>{
     const type=cell.getAttribute('t'),value=elements(cell,'v')[0]?.textContent||'';return type==='s'?shared[Number(value)]||'':type==='inlineStr'?text(cell):value;
   }).join('\t')).join('\n'));
 }
 throw Error('Unsupported Office document');
}
function optimize(canvas,dots){
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,canvas.width,canvas.height).data,w=canvas.width,h=canvas.height;
 let left=w,right=0,top=h,bottom=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(Math.min(data[i],data[i+1],data[i+2])<245){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}}
 if(right<=left||bottom<=top){left=top=0;right=w;bottom=h;}
 const px=Math.max(12,Math.floor(w/50)),py=Math.max(12,Math.floor(h/80));left=Math.max(0,left-px);right=Math.min(w,right+px);top=Math.max(0,top-py);bottom=Math.min(h,bottom+py);
 const scale=Math.min(dots/(right-left),2000/(bottom-top)),out=document.createElement('canvas');out.width=Math.max(1,Math.round((right-left)*scale));out.height=Math.max(1,Math.round((bottom-top)*scale));
 const x=out.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,out.width,out.height);x.drawImage(canvas,left,top,right-left,bottom-top,0,0,out.width,out.height);
 const pixels=x.getImageData(0,0,out.width,out.height);for(let i=0;i<pixels.data.length;i+=4){const v=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2],n=v>=245?255:Math.max(0,Math.min(255,128+(v-128)*1.55));pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;}
 x.putImageData(pixels,0,0);return window.localBridge.packedCanvas(out);
}
async function read(body,dots){
 const bytes=bytes64(body.data_base64),ext=String(body.filename||'').split('.').pop().toLowerCase(),mode=body.mode||'text';
 if(!bytes.length||bytes.length>10000000)throw Error('Document must be between 1 byte and 10 MB');
 if(!['text','raster'].includes(mode))throw Error('Invalid document mode');
 if(ext==='pdf'){
   const pdfjs=await import('/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
   const loading=pdfjs.getDocument({data:bytes,useSystemFonts:true,isEvalSupported:false}),pdf=await loading.promise,pages=[];
   try{
     if(pdf.numPages>(mode==='raster'?50:100))throw Error('Document exceeds the page limit');
     for(let i=1;i<=pdf.numPages;i++){
       const page=await pdf.getPage(i);
       if(mode==='text'){const data=await page.getTextContent();let text='';for(const item of data.items)text+=item.str+(item.hasEOL?'\n':' ');pages.push(text.slice(0,20000).trimEnd());}
       else{const initial=page.getViewport({scale:1}),scale=Math.min(dots*2/initial.width,4000/initial.height),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'#fff'}).promise;pages.push(optimize(canvas,dots));}
       page.cleanup();
     }
     return {filename:body.filename,mode,pages};
   }finally{await pdf.destroy();}
 }
 const textPages=await office(bytes,ext);if(!textPages.length||textPages.length>(mode==='raster'?50:100))throw Error('Invalid document page count');
 if(mode==='text')return {filename:body.filename,mode,pages:textPages.map(s=>s.slice(0,20000))};
 const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 const pages=textPages.flatMap(text=>window.localBridge.documentPages({html:text.split(/\r?\n/).map(s=>'<div>'+(escape(s)||'<br>')+'</div>').join('')}));
 return {filename:body.filename,mode,pages,notice:'Browser Office raster uses extracted text; the native app with LibreOffice preserves page layout.'};
}
window.localDocuments={read};
})();
