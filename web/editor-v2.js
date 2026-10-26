/*
 * Prévia determinística: a mesma quebra por coluna que o servidor usa, sem
 * deixar o navegador decidir onde uma linha termina.
 */
(function () {
  const byId = id => document.getElementById(id);
  const oldRender = window.render;
  const zoomLevels = [.75, 1, 1.25, 1.5, 2];
  let previewZoom = 1;

  function esc(text) { return String(text).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function styleCopy(s) { return { bold:s.bold, italic:s.italic, underline:s.underline }; }
  function addPart(line, text, style) {
    if (!text) return;
    const previous = line.parts[line.parts.length - 1];
    if (previous && previous.bold === style.bold && previous.italic === style.italic && previous.underline === style.underline) previous.text += text;
    else line.parts.push({text, ...styleCopy(style)});
  }
  function alignment(element, inherited) {
    const direct = (element.getAttribute && element.getAttribute('align') || '').toLowerCase();
    const style = element.getAttribute && element.getAttribute('style') || '';
    const match = /text-align\s*:\s*(left|center|right)/i.exec(style);
    return ['left','center','right'].includes(direct) ? direct : (match ? match[1].toLowerCase() : inherited);
  }
  function richLines(element) {
    const lines = []; let line = {align:'left', parts:[]};
    const flush = force => { if (force || line.parts.length) lines.push(line); line = {align:line.align,parts:[]}; };
    function visit(node, style, align) {
      if (node.nodeType === Node.TEXT_NODE) { addPart(line, node.nodeValue.replace(/\u00a0/g, ' '), style); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName;
      if (tag === 'BR') { flush(true); return; }
      const block = ['DIV','P','LI'].includes(tag);
      const lineAlign = alignment(node, align);
      if (block && line.parts.length) flush(false);
      line.align = lineAlign;
      const next = {...style};
      if (tag === 'B' || tag === 'STRONG') next.bold = true;
      if (tag === 'I' || tag === 'EM') next.italic = true;
      if (tag === 'U') next.underline = true;
      [...node.childNodes].forEach(child => visit(child, next, lineAlign));
      if (block) flush(true);
    }
    [...element.childNodes].forEach(node => visit(node, {bold:false,italic:false,underline:false}, 'left'));
    if (line.parts.length) lines.push(line);
    return lines;
  }
  function wrapParts(parts, cols) {
    const out = []; let line = [], width = 0;
    for (const part of parts) {
      const tokens = part.text.match(/\S+|\s+/gu) || [];
      for (let token of tokens) {
        let chars = [...token];
        while (chars.length) {
          let room = cols - width;
          if (room <= 0) { out.push(line); line=[]; width=0; room=cols; }
          const taken = chars.splice(0, room).join('');
          if (!(width === 0 && /^\s+$/u.test(taken))) {
            const last=line[line.length-1];
            if (last && last.bold===part.bold && last.italic===part.italic && last.underline===part.underline) last.text += taken;
            else line.push({text:taken,bold:part.bold,italic:part.italic,underline:part.underline});
            width += [...taken].length;
          }
          if (width >= cols) { out.push(line); line=[]; width=0; }
        }
      }
    }
    if (line.length || !out.length) out.push(line);
    return out;
  }
  function appendLine(paper, parts, align) {
    const row=document.createElement('div'); row.className='preview-line'; row.dataset.align=align || 'left';
    for (const p of parts) { const span=document.createElement('span'); span.textContent=p.text; if(p.bold)span.classList.add('preview-b'); if(p.italic)span.classList.add('preview-i'); if(p.underline)span.classList.add('preview-u'); row.append(span); }
    paper.append(row);
  }
  function activeColumns() {
    const wantsCondensed=byId('condensedToggle').classList.contains('is-on');
    const realCondensed=wantsCondensed && !!cfg.condensed_esc;
    let columns=realCondensed ? cfg.cols_b : cfg.cols_a;
    if (byId('wideToggle').classList.contains('is-on')) columns=Math.max(1,Math.floor(columns/2));
    return {columns, wantsCondensed, realCondensed};
  }
  function renderText(lines, columns) {
    const paper=byId('paper'); paper.replaceChildren();
    for (const source of lines) for (const wrapped of wrapParts(source.parts, columns)) appendLine(paper,wrapped,source.align);
  }
  function renderList() {
    const paper=byId('paper'); paper.replaceChildren(); const cols=cfg.cols_a;
    const title=byId('listTitle').value.trim() || 'LISTA';
    appendLine(paper,[{text:title,bold:true,italic:false,underline:false}],'center');
    const stamp=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).replace(',', '');
    appendLine(paper,[{text:stamp,bold:false,italic:false,underline:false}],'center');
    appendLine(paper,[{text:'-'.repeat(Math.max(3,Math.min(cols,title.length))),bold:false,italic:false,underline:false}],'left');
    for (const item of richLines(byId('listText')).filter(x=>x.parts.some(p=>p.text.trim()))) {
      const wrapped=wrapParts(item.parts,Math.max(1,cols-2));
      wrapped.forEach((line,index)=>appendLine(paper,[{text:index?'  ':'- ',bold:false,italic:false,underline:false},...line],'left'));
    }
    return cols;
  }
  function renderRasterDocument(pages) {
    const page=pages[0], paper=byId('paper'), image=document.createElement('canvas');
    image.className='document-raster-preview'; image.width=page.width; image.height=page.height;
    const raw=atob(page.data_base64), ctx=image.getContext('2d'), bitmap=ctx.createImageData(page.width,page.height);
    for(let i=0;i<page.width*page.height;i++){const x=i%page.width,y=Math.floor(i/page.width),byte=page.packing==='row'?y*Math.ceil(page.width/8)+(x>>3):i>>3,bit=page.packing==='row'?x&7:i&7,black=raw.charCodeAt(byte)&(0x80>>bit),pixel=black?0:255,offset=i*4;bitmap.data[offset]=bitmap.data[offset+1]=bitmap.data[offset+2]=pixel;bitmap.data[offset+3]=255;}
    ctx.putImageData(bitmap,0,0);paper.replaceChildren(image);
  }
  function fileHtml() {
    let lines=byId('fileText').textContent.split(/\r?\n/), name=byId('textFileName').textContent;
    const condensed=byId('fileCondensed').checked && !!cfg.condensed_esc, cols=condensed?cfg.cols_b:cfg.cols_a;
    if(byId('fileNumber').checked) lines=lines.map((value,i)=>`${String(i+1).padStart(4,' ')}  ${value}`);
    let output='';
    if(byId('fileHeader').checked && name!=='nenhum arquivo selecionado') output+=`<div style="text-align:center"><b>${esc(name)}</b></div><div>${'-'.repeat(Math.min(cols,48))}</div>`;
    // Uma div vazia não vira linha para o parser da impressora. O <br>
    // explícito preserva as linhas em branco do arquivo no papel.
    return output+lines.map(value=>`<div>${esc(value)||'<br>'}</div>`).join('');
  }
  function paperGeometry(columns, warning='') {
    const physical=document.querySelector('.paper-physical'); if(!physical) return;
    const useful=Math.max(320,Math.min(832,Number(cfg.dots)||576));
    physical.style.setProperty('--print-width',`${(useful / 832 * 100).toFixed(3)}%`);
    const paper=byId('paper');
    // Courier New pode ser substituída pelo sistema. Mede-se a fonte que o
    // navegador de fato escolheu, para que 48 colunas sejam 48 colunas e não
    // uma linha aparentemente correta mas cortada no último caractere.
    const usablePx=Math.max(1,paper.clientWidth-18);
    const measure=document.createElement('canvas').getContext('2d');
    measure.font='100px "Courier New", monospace';
    const glyph=Math.max(1,measure.measureText('0').width);
    const fontSize=Math.max(6,Math.min(18,(usablePx/(Math.max(1,columns)*glyph))*100*.985));
    // design.css declara o tamanho legado com !important; este valor é a
    // fonte de verdade para a prévia baseada em colunas.
    paper.style.setProperty('font-size',`${fontSize}px`,'important');
    const meta=byId('previewMeta');
    if(meta){meta.textContent=`${columns} colunas · ${useful} pontos${warning?` · ${warning}`:''}`;meta.classList.toggle('preview-warning',!!warning);}
  }
  function renderV2() {
    const paper=byId('paper'), canvas=byId('photoCanvas'), paperStage=paper.parentElement.parentElement;
    if (!paper || !cfg) return;
    if (tab==='photo') { byId('previewMeta').textContent='Prévia da imagem';byId('previewMeta').classList.remove('preview-warning');paperStage.classList.add('hidden'); canvas.classList.remove('hidden'); byId('drawStage').classList.add('hidden'); oldRender(); return; }
    if (tab==='draw') { byId('previewMeta').textContent='Canvas · tons de cinza em meio-tom';byId('previewMeta').classList.remove('preview-warning');paperStage.classList.add('hidden');canvas.classList.add('hidden');byId('drawStage').classList.remove('hidden');window.drawThermal?.show();note('Desenho · canvas pronto para imprimir.');return; }
    canvas.classList.add('hidden'); byId('drawStage').classList.add('hidden'); paperStage.classList.remove('hidden');paper.classList.remove('hidden');
    let cols=cfg.cols_a, warning='';
    if(tab==='editor') { const state=activeColumns(); cols=state.columns; if(state.wantsCondensed&&!state.realCondensed) warning='condensada desativada no hardware'; renderText(richLines(byId('editorText')),cols); }
    else if(tab==='list') cols=renderList();
    else { const raster=window.bthermalRasterPages;if(Array.isArray(raster)&&raster.length){renderRasterDocument(raster);warning=`Página rasterizada 1 de ${raster.length}`;}else{const holder=document.createElement('div'); holder.innerHTML=fileHtml(); const real=byId('fileCondensed').checked&&!!cfg.condensed_esc; cols=real?cfg.cols_b:cfg.cols_a; renderText(richLines(holder),cols); if(byId('fileCondensed').checked&&!real)warning='condensada desativada no hardware';} }
    paperGeometry(cols,warning);
    const labels={editor:'Editor',list:'Lista',file:'Arquivo'}; note(`${labels[tab]} · prévia sincronizada.`);
  }
  function setZoom() { const stage=document.querySelector('.paper-zoom-stage'),photoStage=document.querySelector('.photo-zoom-stage'),scroll=document.querySelector('.paper-scroll'); if(stage)stage.style.zoom=String(previewZoom); if(photoStage)photoStage.style.zoom=String(previewZoom); byId('zoomPaper').textContent=`${Math.round(previewZoom*100)}%`;requestAnimationFrame(()=>{if(scroll)scroll.scrollLeft=Math.max(0,(scroll.scrollWidth-scroll.clientWidth)/2);}); }
  function installPaper() {
    const paper=byId('paper'), scroll=paper.parentElement, pane=scroll.parentElement;
    const heading=pane.querySelector('.paper-head'), title=heading.querySelector('b'), headingCopy=document.createElement('div'), meta=document.createElement('small');
    headingCopy.className='preview-heading';meta.id='previewMeta';meta.setAttribute('aria-live','polite');headingCopy.append(title,meta);heading.prepend(headingCopy);
    const stage=document.createElement('div'); stage.className='paper-zoom-stage';
    const physical=document.createElement('div'); physical.className='paper-physical';
    scroll.insertBefore(stage,paper); stage.append(physical); physical.append(paper);
    const photoStage=document.createElement('div'); photoStage.className='photo-zoom-stage';
    scroll.insertBefore(photoStage,stage); photoStage.append(byId('photoCanvas'));
    const splitter=document.createElement('div'); splitter.id='workspaceSplitter'; splitter.tabIndex=0; splitter.setAttribute('role','separator'); splitter.setAttribute('aria-label','Redimensionar utilitário e prévia');
    pane.before(splitter);
    const workspace=document.querySelector('.workspace'); const saved=Number(localStorage.getItem('bthermal-work-width'));
    if(saved>=30&&saved<=70) workspace.style.setProperty('--work-width',`${saved}%`);
    function setWidth(clientX) { const rect=workspace.getBoundingClientRect(); const percent=Math.max(30,Math.min(70,(clientX-rect.left)/rect.width*100)); workspace.style.setProperty('--work-width',`${percent}%`); localStorage.setItem('bthermal-work-width',percent.toFixed(2)); }
    splitter.addEventListener('pointerdown',event=>{ splitter.setPointerCapture(event.pointerId); const move=e=>setWidth(e.clientX); const end=e=>{splitter.removeEventListener('pointermove',move);splitter.removeEventListener('pointerup',end);splitter.removeEventListener('pointercancel',end)}; splitter.addEventListener('pointermove',move);splitter.addEventListener('pointerup',end);splitter.addEventListener('pointercancel',end); });
    splitter.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return; const current=parseFloat(getComputedStyle(workspace).getPropertyValue('--work-width'))||50; const next=Math.max(30,Math.min(70,current+(event.key==='ArrowLeft'?-2:2))); workspace.style.setProperty('--work-width',`${next}%`);localStorage.setItem('bthermal-work-width',next);event.preventDefault();});
  }
  async function printV2() {
    try {
      if(tab==='photo') return printCurrent();
      if(tab==='draw') return window.drawThermal?.print();
      let path='/api/print/document', body, label='Documento';
      if(tab==='editor') { body={html:byId('editorText').innerHTML,cut:byId('cut').checked,feed:+byId('feed').value,expanded:byId('wideToggle').classList.contains('is-on'),condensed:byId('condensedToggle').classList.contains('is-on')}; }
      else if(tab==='list') { path='/api/print/list-rich'; label='Lista'; body={title:byId('listTitle').value,html:byId('listText').innerHTML,cut:byId('cut').checked,feed:+byId('feed').value}; }
      else { const html=fileHtml(); label='Arquivo'; body={html,cut:byId('cut').checked,feed:+byId('feed').value,expanded:false,condensed:byId('fileCondensed').checked}; }
      if(!body.html || !body.html.replace(/<[^>]+>/g,'').trim()) throw Error('Não há conteúdo para imprimir.');
      const result=await api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); note(`${label} #${result.id} enviado à fila.`);
    } catch(error) { note(error.message,true); }
  }
  function advancedSettings() {

    const dialog=document.createElement('div'); dialog.className='dialog-body';
    dialog.innerHTML='<h2>Configuração que controla papel e prévia</h2><p>Colunas e largura útil são globais. A largura útil deve corresponder à área física medida — por exemplo, 596 pontos.</p><div class="settings-grid" id="v2Settings"></div><p class="status-card">Segurança de compatibilidade: a fonte condensada usa ESC M. Nesta unidade ela ficou desativada porque o comando apareceu no papel como “M”. Só ligue após validar uma tira de teste.</p><div class="dialog-actions"><button id="v2Defaults">Valores sugeridos</button><button id="v2Save" class="default">Salvar</button></div>';
    const fields=[['cols_a','Colunas · fonte normal','20–80'],['cols_b','Colunas · condensada','30–120'],['dots','Largura útil da cabeça','320–832 pontos'],['image_width','Largura padrão de foto','8 até a largura útil'],['line_spacing','Espaçamento gráfico','1–60'],['default_feed','Avanço padrão','0–20'],['auto_cut','Cortar por padrão','0 ou 1'],['italic','Itálico ESC 4/5','0 ou 1'],['condensed_esc','Habilitar ESC M','0 ou 1'],['raster_fallback','Rasterizar Unicode incompatível','0 ou 1']];
    const grid=dialog.querySelector('#v2Settings'); fields.forEach(([key,label,help])=>{const row=document.createElement('label');row.className='setting';row.innerHTML=`<span>${label}</span><input id="v2_${key}" type="number" value="${cfg[key]??0}"><small>${help}</small>`;grid.append(row);});
    dialog.querySelector('#v2Defaults').onclick=()=>{const values={cols_a:48,cols_b:64,dots:596,image_width:596,line_spacing:17,default_feed:3,auto_cut:1,italic:1,condensed_esc:0,raster_fallback:1};fields.forEach(([key])=>dialog.querySelector('#v2_'+key).value=values[key]);};
    dialog.querySelector('#v2Save').onclick=async()=>{try{const values={};fields.forEach(([key])=>values[key]=Number(dialog.querySelector('#v2_'+key).value));if(values.image_width>values.dots)throw Error('A largura padrão da foto não pode ultrapassar a largura útil.');cfg=(await api('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)})).settings;byId('photoWidth').max=cfg.dots;byId('photoWidth').value=byId('photoWidth').max;byId('photoWidth').dispatchEvent(new Event('input'));byId('feed').value=cfg.default_feed;byId('cut').checked=!!cfg.auto_cut;closeModal();renderV2();note('Configuração salva e prévia recalculada.');}catch(error){note(error.message,true);}};
    modal('Ajustes da impressora',dialog);
  }
  function bind() {
    byId('printButton').onclick=printV2; byId('settingsButton').onclick=advancedSettings;
    byId('zoomPaper').onclick=()=>{const at=zoomLevels.indexOf(previewZoom);previewZoom=zoomLevels[(at+1)%zoomLevels.length];setZoom();};
    ['editorText','listText','listTitle','fileCondensed','fileNumber','fileHeader'].forEach(id=>{const element=byId(id);if(element)element.addEventListener(id.includes('Text')||id==='listTitle'?'input':'change',renderV2);});
    document.querySelectorAll('[data-command],[data-list-command],[data-align]').forEach(button=>{button.onmousedown=e=>e.preventDefault();button.onclick=()=>{const target=button.dataset.listCommand?'listText':'editorText';const command=button.dataset.align?'justify'+button.dataset.align[0].toUpperCase()+button.dataset.align.slice(1):(button.dataset.command||button.dataset.listCommand);byId(target).focus();document.execCommand(command);renderV2();};});
    ['wideToggle','condensedToggle'].forEach(id=>byId(id).onclick=()=>{byId(id).classList.toggle('is-on');byId(id).setAttribute('aria-pressed',byId(id).classList.contains('is-on'));renderV2();});
    document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.tab;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('hidden',x.id!==tab));document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('selected',x.dataset.tab===tab));renderV2();});
  }
  installPaper(); bind(); setZoom(); renderV2();
  window.renderBthermalPreview=renderV2;
})();
