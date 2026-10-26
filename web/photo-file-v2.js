(function(){
  const E=id=>document.getElementById(id), textExt=/\.(txt|md|csv|log|json|xml|html?|py|pyw|c|h|cpp|hpp|cs|go|rs|java|js|ts|tsx|jsx|sh|bash|sql|ya?ml|toml|ini|conf|css|php|rb|lua|swift|kt|dart|r|m|ps1)$/i;
  let pages=[], importedMode='text', selectedFile=null;
  function file64(file){return new Promise((resolve,reject)=>{let reader=new FileReader();reader.onload=()=>{const bytes=new Uint8Array(reader.result);let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve(btoa(text))};reader.onerror=()=>reject(Error('Não consegui ler o arquivo.'));reader.readAsArrayBuffer(file)})}
  function esc(text){return String(text).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
  function plainToHtml(text,lineOffset=0){return text.split(/\r?\n/).map((line,index)=>{
    const listed=E('fileNumber').checked?`${String(lineOffset+index+1).padStart(4,' ')}  ${line}`:line;
    // O <br> faz o parser da impressora manter linhas vazias.
    return `<div>${esc(listed)||'<br>'}</div>`;
  }).join('')}
  function linesBefore(pageIndex){return pages.slice(0,pageIndex).reduce((total,page)=>total+String(page).split(/\r?\n/).length,0)}
  async function importFile(file){
    if(!file)return;
    try {
      E('textFileName').textContent=`Lendo ${file.name}…`; importedMode=E('fileDocumentMode').value;
      if(textExt.test(file.name)) { importedMode='text'; const content=await file.text(); pages=[content]; }
      else { const result=await api('/api/document/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,data_base64:await file64(file),mode:importedMode})}); pages=result.pages; importedMode=result.mode; }
      window.bthermalImportedPages=importedMode==='text'?pages:[]; window.bthermalRasterPages=importedMode==='raster'?pages:[]; E('fileText').textContent=importedMode==='raster'?'Documento rasterizado e otimizado: a prévia mostra a página 1.':(pages[0]||'(esta página não contém texto extraível)'); E('textFileName').textContent=file.name;
      E('filePages').textContent=pages.length>1?`${pages.length} páginas ${importedMode==='raster'?'rasterizadas':'carregadas'}; a prévia mostra a primeira.`:`1 página ${importedMode==='raster'?'rasterizada':'carregada'}.`;
      window.renderBthermalPreview?.(); note(`${pages.length} página(s) pronta(s) para imprimir.`);
    } catch(error) { pages=[]; window.bthermalImportedPages=[]; E('textFileName').textContent='nenhum arquivo selecionado'; E('filePages').textContent=error.message; note(error.message,true); }
  }
  function stats(){
    if(!photo.image)return null; const w=192,h=Math.max(1,Math.round(w*photo.image.naturalHeight/photo.image.naturalWidth)),c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true});c.width=w;c.height=h;x.drawImage(photo.image,0,0,w,h);const data=x.getImageData(0,0,w,h).data,values=[];for(let i=0;i<data.length;i+=4)values.push(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);values.sort((a,b)=>a-b);const mean=values.reduce((a,b)=>a+b,0)/values.length,variance=values.reduce((a,b)=>a+(b-mean)**2,0)/values.length;return {mean,std:Math.sqrt(variance),lo:values[Math.floor(values.length*.015)],hi:values[Math.floor(values.length*.985)]};}
  function rerender(){ window.renderBthermalPreview?.(); }
  function autoAdjust(){const s=stats();if(!s)return;E('autoLevels').checked=true;E('brightness').value=Math.max(-.22,Math.min(.22,(128-s.mean)/255*.38));E('contrast').value=Math.max(.9,Math.min(2.1,1.08+(46-s.std)/110));E('gamma').value=s.mean<100?.78:s.mean>180?1.16:.96;E('threshold').value=Math.max(92,Math.min(168,128+(128-s.mean)*.20));E('dither').value=s.std<32?'floyd':'atkinson';rerender();note('Auto-ajuste aplicado a partir de brilho, contraste e alcance da imagem.');}
  function preset(kind){
    const values={photo:{auto:true,brightness:.03,contrast:1.25,gamma:.92,dither:'atkinson',threshold:128,pixel:1},receipt:{auto:true,brightness:.07,contrast:1.55,gamma:.9,dither:'floyd',threshold:138,pixel:1},logo:{auto:false,brightness:0,contrast:2.1,gamma:1,dither:'none',threshold:150,pixel:1},dark:{auto:true,brightness:.14,contrast:1.45,gamma:.72,dither:'atkinson',threshold:118,pixel:1}}[kind];
    E('autoLevels').checked=values.auto;for(const key of ['brightness','contrast','gamma','dither','threshold','pixel'])E(key).value=values[key];rerender();note(`Predefinição “${({photo:'Foto térmica',receipt:'Documento',logo:'Logo/QR',dark:'Foto escura'})[kind]}” aplicada.`);
  }
  // A versão original tratava “Sem meio-tom” como Floyd–Steinberg. Para QR,
  // logos e texto escaneado, limiar puro é o resultado previsível esperado.
  const previousDither=window.dither;
  window.dither=function(values,width,height,mode,threshold){
    if(mode!=='none')return previousDither(values,width,height,mode,threshold);
    const bits=new Uint8Array(width*height);for(let i=0;i<bits.length;i++)bits[i]=values[i]<threshold;return bits;
  };
  async function printFilePages(){
    const source=pages.length?pages:[E('fileText').textContent]; if(importedMode==='raster'?!source[0]?.data_base64:!source[0]?.trim())throw Error('Escolha um arquivo primeiro.'); const mode=E('filePageMode').value, feed=+E('filePageGap').value, condensed=E('fileCondensed').checked;
    if(importedMode==='raster') { if(mode==='cut'){let jobs=[];for(const page of source){const result=await api('/api/print/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...page,cut:true,feed})});jobs.push(result.id)}note(`${jobs.length} páginas raster enviadas, cada uma com corte.`);return}const result=await api('/api/print/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images:source,cut:E('cut').checked,gap:feed})});note(`Documento raster #${result.id} enviado sem cortar entre páginas.`);return; }
    const header=index=>E('fileHeader').checked?`<div style="text-align:center"><b>${E('textFileName').textContent}${source.length>1?` · Página ${index+1}/${source.length}`:''}</b></div><div>${'-'.repeat(Math.min(condensed?cfg.cols_b:cfg.cols_a,48))}</div>`:'';
    if(mode==='cut') { let jobs=[]; for(let i=0;i<source.length;i++){const result=await api('/api/print/document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html:header(i)+plainToHtml(source[i],linesBefore(i)),cut:true,feed,condensed,expanded:false})});jobs.push(result.id)}note(`${jobs.length} páginas enviadas, cada uma com corte.`);return; }
    const gap='<div><br></div>'.repeat(Math.max(0,Math.min(5,feed))),html=source.map((page,index)=>header(index)+plainToHtml(page,linesBefore(index))).join(gap);const result=await api('/api/print/document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html,cut:E('cut').checked,feed:0,condensed,expanded:false})});note(`Arquivo #${result.id} enviado sem cortes entre páginas.`);
  }
  function install(){
    E('textFile').accept='.txt,.md,.csv,.log,.json,.xml,.html,.py,.c,.cpp,.h,.cs,.go,.rs,.java,.js,.ts,.sql,.pdf,.doc,.docx,.odt,.rtf,.pptx,.xlsx,text/*,application/pdf'; E('textFile').onchange=e=>{selectedFile=e.target.files[0];importFile(selectedFile)};
    E('photoFile').addEventListener('change',()=>{let attempts=0,wait=setInterval(()=>{if(photo.image){clearInterval(wait);autoAdjust()}else if(++attempts>30)clearInterval(wait)},100)});
    const photoTools=document.createElement('fieldset');photoTools.className='quick-tools';photoTools.innerHTML='<legend>Ajuste rápido de imagem</legend><div class="preset-row"><button id="photoAuto" class="primary-photo" data-icon="settings">Auto-ajustar</button><button data-preset="photo" data-icon="photo">Foto térmica</button><button data-preset="receipt" data-icon="file">Documento</button><button data-preset="logo" data-icon="tests">Logo / QR</button><button data-preset="dark" data-icon="reset">Foto escura</button></div>';
    E('photo').querySelector('.photo-grid').after(photoTools);photoTools.querySelector('#photoAuto').onclick=autoAdjust;photoTools.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>preset(button.dataset.preset));
    const options=document.createElement('div');options.className='file-options';options.innerHTML='<label>Modo do documento<select id="fileDocumentMode"><option value="text">Texto literal</option><option value="raster">Rasterizar e otimizar</option></select></label><label>Impressão<select id="filePageMode"><option value="direct">Direto · espaço entre páginas</option><option value="cut">Página por página · cortar</option></select></label><label>Espaço entre páginas<input id="filePageGap" type="number" min="0" max="5" value="1"></label><output id="filePages" class="file-pages">Escolha texto, código, PDF ou Office.</output>';
    E('file').querySelector('.check-row').after(options); const prior=E('printButton').onclick;E('printButton').onclick=async()=>{if(tab!=='file')return prior();try{await printFilePages()}catch(error){note(error.message,true)}};
    E('fileDocumentMode').onchange=()=>{if(selectedFile&&!textExt.test(selectedFile.name))importFile(selectedFile)};
    [[E('wideToggle'),'Texto largo'],[E('condensedToggle'),'Texto condensado']].forEach(([button,label])=>button.setAttribute('aria-label',label));
    icons();
  }
  install();
})();
