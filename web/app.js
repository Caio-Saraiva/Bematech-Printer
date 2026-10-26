/* Local UI shared by the native app. Hosted demo packaging is kept outside this repository. */
'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const en=Object.fromEntries([...document.querySelectorAll('[data-i18n]')].map(e=>[e.dataset.i18n,e.textContent]));
  const pt={workspace:'ÁREA DE TRABALHO',editor:'Estúdio de texto',list:'Listas e notas',photo:'Laboratório de imagem',draw:'Prancheta',calculator:'Custo de impressão 3D',calibration:'Calibração',source:'Código e documentação ↗',localStudio:'ESTÚDIO LOCAL',eyebrow:'UM POUCO DE PAPEL. INFINITAS POSSIBILIDADES.',demoNotice:'Demonstração no navegador · Tudo fica neste dispositivo. A impressão é simulada.',compose:'Componha seu recibo',livePreview:'PRÉVIA AO VIVO',align:'Alinhamento',left:'Esquerda',center:'Centro',right:'Direita',size:'Tamanho',normal:'Normal',large:'Grande',loadSample:'Carregar exemplo ↺',importText:'Importar .txt ↗',editorHint:'Sua prévia é sua impressão. O texto vira bitmap para preservar acentos e caracteres disponíveis na fonte do navegador.',listTitle:'Uma lista para guardar.',title:'Título',onePerLine:'Um item por linha',listHint:'Marcadores e recuos de continuação são adicionados automaticamente.',imageTitle:'Um mundo em preto e branco.',chooseImage:'Escolher imagem',imageFormats:'PNG, JPEG ou WebP · processada neste dispositivo',dither:'Pontilhamento',threshold:'Limiar',imageWidth:'Largura da imagem',fullWidth:'Largura total',brightness:'Brilho',contrast:'Contraste',sampleImage:'Carregar arte de teste',rotate:'Girar 90°',imageHint:'A imagem original nunca é enviada. Pixels escuros viram calor no papel.',drawTitle:'Deixe sua marca.',brush:'Pincel',eraser:'Borracha',undo:'Desfazer',clear:'Limpar',drawHint:'Desenhe com mouse, caneta ou dedo. A prévia do papel acompanha os traços.',calcTitle:'Saiba quanto custa imprimir.',calcNote:'Informe os custos na sua moeda. É uma estimativa de custo, não uma nota fiscal.',grams:'Filamento usado (g)',priceKg:'Preço do filamento / kg',hours:'Tempo de impressão (horas)',power:'Potência média (W)',tariff:'Energia / kWh',extras:'Trabalho e outros custos',waste:'Perda de material (%)',margin:'Margem de lucro (%)',totalCost:'Custo total',suggestedPrice:'Preço sugerido',calTitle:'Encontre o ajuste do seu papel.',calHint:'Gere uma régua de largura e faixas gráficas de 24 pontos. Imprima, examine o papel e ajuste as opções de inicialização do app.',headWidth:'Largura da cabeça',bandSpacing:'Espaçamento entre faixas',calPhysical:'A régua na tela não mede o equipamento. É necessário testar no papel.',session:'NESTA SESSÃO',emptySession:'Sua próxima pequena criação começa aqui.',paperPreview:'Prévia do papel',actualBitmap:'BITMAP DE 1 BIT · DADOS REAIS DA IMPRESSÃO',savePng:'Salvar PNG',savePbm:'Salvar PBM',saveEsc:'ESC/Bema',ready:'Tudo pronto por aqui.',footer:'Feito para as pequenas coisas que merecem papel.'};
  const titles={en:{editor:['Make something tangible.','Write a note, make a receipt, or turn a thought into a strip of paper.'],list:['Small plans. Real paper.','Keep the essentials together, one line at a time.'],photo:['Less color. More character.','Turn your favorite image into something beautifully monochrome.'],draw:['Start with a single line.','A small canvas for ideas that deserve to leave the screen.'],calculator:['A good print starts with a plan.','Work out material, energy and margin. Keep the estimate on paper.'],calibration:['Get to know your printer.','A simple test sheet for finding the right width and graphic spacing.']},pt:{editor:['Dê forma às suas ideias.','Escreva uma nota, faça um recibo ou transforme uma ideia em papel.'],list:['Pequenos planos. Papel de verdade.','Guarde o essencial, uma linha por vez.'],photo:['Menos cor. Mais personalidade.','Transforme sua imagem favorita em algo marcante em preto e branco.'],draw:['Comece com um único traço.','Um pequeno espaço para ideias que merecem sair da tela.'],calculator:['Uma boa impressão começa no plano.','Calcule material, energia e margem. Guarde a estimativa em papel.'],calibration:['Conheça sua impressora.','Uma folha de teste para ajustar largura e espaçamento gráfico.']}};
  const samples={en:'THE LITTLE PAPER CLUB\nGood things, printed simply.\n\n----------------------------------------\nORDER #0042              TABLE 03\n----------------------------------------\n\nFlat white                       4.50\nButter croissant                 3.80\nA moment to yourself             0.00\n\n----------------------------------------\nTOTAL                            8.30\n----------------------------------------\n\nTake a breath.\nMake a small thing.\nKeep the receipt.\n\n          THANK YOU FOR STOPPING BY\n                 * * *',pt:'O CLUBE DO PAPEL\nCoisas boas, impressas com simplicidade.\n\n----------------------------------------\nPEDIDO #0042                 MESA 03\n----------------------------------------\n\nCafé com leite                   4,50\nCroissant amanteigado            3,80\nUm momento para você             0,00\n\n----------------------------------------\nTOTAL                            8,30\n----------------------------------------\n\nRespire.\nCrie algo pequeno.\nGuarde o recibo.\n\n              OBRIGADO PELA VISITA\n                    * * *'};
  let lang='en',tab='editor',info={mode:'simulation',dots:576,columns:48,spacing:17,feed:3,cut:true},hosted=false,connected=false,photo=null,angle=0,erasing=false,pen=false,previous=null;
  let bits=new Uint8Array(),lastValid=true;
  const receipt=$('receipt'),ctx=receipt.getContext('2d',{willReadFrequently:true}),drawing=$('drawing'),draw=drawing.getContext('2d',{willReadFrequently:true}),history=[],undo=[];
  const t=k=>(lang==='pt'?pt[k]:en[k])||en[k]||k;
  const say=(a,b)=>lang==='pt'?b:a;
  const notice=message=>$('status').textContent=message;
  function translate(){
    document.documentElement.lang=lang==='pt'?'pt-BR':'en';
    document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));
    const [title,description]=titles[lang][tab];$('pageTitle').textContent=title;$('pageDescription').textContent=description;
    $('mode').textContent=connected&&info.mode==='serial'?say('SERIAL READY','SERIAL ATIVA'):say('SIMULATION','SIMULAÇÃO');
    $('mode').classList.toggle('live',connected&&info.mode==='serial');
    $('printLabel').textContent=connected&&info.mode==='serial'?say('Print receipt','Imprimir recibo'):say('Simulate print','Simular impressão');
    $('demoNotice').hidden=!hosted;
    renderHistory();render();
  }
  function setTab(name){tab=name;document.querySelectorAll('[data-panel]').forEach(e=>e.hidden=e.dataset.panel!==tab);document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));translate();notice(t('ready'));}
  function white(w,h){receipt.width=w;receipt.height=h;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.fillStyle='#000';}
  function wrap(text,columns){const output=[];for(const raw of text.replace(/\r\n?/g,'\n').split('\n')){const chars=[...raw.replace(/\t/g,'    ')];if(!chars.length)output.push('');while(chars.length)output.push(chars.splice(0,columns).join(''));}return output;}
  function textReceipt(text,{large=false,align='left'}={}){
    const font=large?28:20,columns=large?Math.floor(info.columns/1.4):info.columns;
    const lines=wrap(text,columns),lineHeight=font+12,height=Math.max(450,lines.length*lineHeight+48);
    if(height>6000)throw Error(say('Too much text for one receipt. Split it into smaller jobs.','Texto longo demais. Divida em trabalhos menores.'));
    white(info.dots,height);ctx.font=font+'px monospace';ctx.textBaseline='top';ctx.textAlign=align;
    lines.forEach((line,i)=>{ctx.font=(i===0?'bold ':'')+font+'px monospace';ctx.fillText(line,align==='center'?info.dots/2:align==='right'?info.dots-20:20,24+i*lineHeight,info.dots-40);});
  }
  function quantize(mode='threshold'){
    const w=receipt.width,h=receipt.height,data=ctx.getImageData(0,0,w,h),gray=new Float32Array(w*h);
    for(let i=0;i<gray.length;i++)gray[i]=(.2126*data.data[i*4]+.7152*data.data[i*4+1]+.0722*data.data[i*4+2]);
    bits=new Uint8Array(w*h);
    const matrix=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
    const add=(x,y,v)=>{if(x>=0&&x<w&&y>=0&&y<h)gray[y*w+x]+=v;};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,old=gray[i],black=old<(mode==='bayer'?(matrix[y%4][x%4]+.5)*16:170);bits[i]=black?1:0;
      const error=old-(black?0:255);
      if(mode==='floyd'){add(x+1,y,error*7/16);add(x-1,y+1,error*3/16);add(x,y+1,error*5/16);add(x+1,y+1,error/16);}
      if(mode==='atkinson')for(const [dx,dy] of [[1,0],[2,0],[-1,1],[0,1],[1,1],[0,2]])add(x+dx,y+dy,error/8);
      data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=black?0:255;data.data[i*4+3]=255;
    }
    ctx.putImageData(data,0,0);
  }
  function photoReceipt(){
    if(!photo)sampleArt();
    const turn=angle%180!==0,sw=turn?photo.height:photo.width,sh=turn?photo.width:photo.height;
    const w=Math.round(info.dots*+$('imageWidth').value),h=Math.min(1800,Math.round(w*sh/sw));
    white(info.dots,h+40);ctx.save();ctx.translate(info.dots/2,(h+40)/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(photo,-(turn?h:w)/2,-(turn?w:h)/2,turn?h:w,turn?w:h);ctx.restore();
    const image=ctx.getImageData(0,0,receipt.width,receipt.height),contrast=+$('contrast').value,brightness=+$('brightness').value;
    for(let i=0;i<image.data.length;i+=4)for(let c=0;c<3;c++)image.data[i+c]=Math.max(0,Math.min(255,(image.data[i+c]-128)*contrast+128+brightness));
    ctx.putImageData(image,0,0);quantize($('dither').value);
  }
  function sampleArt(){
    photo=document.createElement('canvas');photo.width=576;photo.height=640;const c=photo.getContext('2d');
    const gradient=c.createLinearGradient(0,0,576,640);gradient.addColorStop(0,'#ece8d7');gradient.addColorStop(1,'#506357');c.fillStyle=gradient;c.fillRect(0,0,576,640);
    c.fillStyle='#fff6df';c.beginPath();c.arc(390,155,83,0,Math.PI*2);c.fill();
    for(let i=0;i<5;i++){c.fillStyle=['#b7bfaa','#8f9c83','#6b806d','#425c4c','#263e34'][i];c.beginPath();c.moveTo(0,350+i*45);for(let x=0;x<=576;x+=8)c.lineTo(x,340+i*47+Math.sin(x/105+i)*60+Math.cos(x/62)*20);c.lineTo(576,640);c.lineTo(0,640);c.fill();}
    c.fillStyle='#fff';c.font='bold 35px monospace';c.fillText('TAKE THE SLOW ROAD',33,590);angle=0;
  }
  function calculate(){
    const ids=['grams','priceKg','hours','power','tariff','extras','waste','margin'],v={};
    for(const id of ids){const input=$(id),n=input.valueAsNumber;if(!Number.isFinite(n)||n<0||n>1e6||(id==='margin'&&n>95)||(id==='waste'&&n>500))throw Error(say('Enter valid non-negative costs; margin must be 0–95%.','Informe custos positivos e margem entre 0 e 95%.'));v[id]=n;}
    const material=v.grams/1000*v.priceKg*(1+v.waste/100),energy=v.hours*v.power/1000*v.tariff,cost=material+energy+v.extras,price=cost/(1-v.margin/100);
    $('totalCost').textContent=cost.toFixed(2);$('suggestedPrice').textContent=price.toFixed(2);
    return {v,material,energy,cost,price};
  }
  function calibration(){
    white(info.dots,620);ctx.font='bold 22px monospace';ctx.fillText('BEMATECH / CALIBRATION',20,36);ctx.font='18px monospace';ctx.fillText(info.dots+' DOTS · SPACING '+info.spacing,20,70);
    ctx.strokeStyle='#000';ctx.strokeRect(.5,100.5,info.dots-1,85);
    for(let x=0;x<info.dots;x+=48){ctx.fillRect(x,100,1,55);ctx.fillText(String(x),Math.min(x+3,info.dots-45),177);}
    ctx.fillText('24-DOT GRAPHIC BANDS',20,245);
    for(let y=0;y<6;y++)for(let x=0;x<info.dots;x++)if((x+y*12)%48<24)ctx.fillRect(x,270+y*24,1,24);
    ctx.fillText('CHECK EVEN MARGINS',20,470);ctx.fillText('NO GAPS BETWEEN BANDS',20,505);ctx.fillText('PHYSICAL TEST REQUIRED',20,555);
  }
  function render(){
    try{
      lastValid=true;
      if(tab==='editor')textReceipt($('editor').value,{large:$('textSize').value==='large',align:$('align').value});
      else if(tab==='list'){const lines=$('listText').value.split('\n').filter(x=>x.trim());textReceipt($('listTitle').value+'\n'+'─'.repeat(36)+'\n\n'+lines.map(x=>wrap(x,info.columns-4).map((l,i)=>(i?'  ':'• ')+l).join('\n')).join('\n\n'));}
      else if(tab==='photo')photoReceipt();
      else if(tab==='draw'){white(info.dots,Math.round(500*info.dots/576));ctx.drawImage(drawing,0,0,receipt.width,receipt.height);}
      else if(tab==='calculator'){const {v,material,energy,cost,price}=calculate();textReceipt(say('3D PRINT ESTIMATE','ORÇAMENTO DE IMPRESSÃO 3D')+'\n'+'─'.repeat(36)+'\n\n'+t('grams')+': '+v.grams+'\n'+t('hours')+': '+v.hours+'\n\n'+say('Material','Material')+': '+material.toFixed(2)+'\n'+say('Energy','Energia')+': '+energy.toFixed(2)+'\n'+t('extras')+': '+v.extras.toFixed(2)+'\n\n'+t('totalCost').toUpperCase()+': '+cost.toFixed(2)+'\n'+t('margin')+': '+v.margin+'%\n\n'+t('suggestedPrice').toUpperCase()+': '+price.toFixed(2)+'\n\n'+say('Estimate only. Currency as entered.','Estimativa. Moeda dos valores informados.'));}
      else calibration();
      if(tab!=='photo')quantize();
      $('characterCount').textContent=$('editor').value.length+' / 16,000 '+say('characters','caracteres');
      $('paperSpec').textContent='80 MM / '+info.dots+' DOTS';$('calWidth').textContent=info.dots;$('calSpacing').textContent=info.spacing;
    }catch(e){lastValid=false;notice(e.message);}
  }
  function packed(){const row=Math.ceil(receipt.width/8),bytes=new Uint8Array(row*receipt.height);bits.forEach((v,i)=>{if(v){const y=Math.floor(i/receipt.width),x=i%receipt.width;bytes[y*row+(x>>3)]|=128>>(x&7);}});return bytes;}
  function pbm(){const header=new TextEncoder().encode('P4\n'+receipt.width+' '+receipt.height+'\n'),pixels=packed(),result=new Uint8Array(header.length+pixels.length);result.set(header);result.set(pixels,header.length);return result;}
  function esc(){const w=receipt.width,h=receipt.height,out=[27,64,27,116,2,27,51,info.spacing];for(let y=0;y<h;y+=24){out.push(27,42,33,w&255,w>>8);for(let x=0;x<w;x++)for(let k=0;k<3;k++){let v=0;for(let b=0;b<8;b++){const yy=y+k*8+b;if(yy<h&&bits[yy*w+x])v|=128>>b;}out.push(v);}out.push(10);}out.push(27,50);for(let i=0;i<info.feed;i++)out.push(10);if(info.cut)out.push(27,119,0);return new Uint8Array(out);}
  function download(data,name,type){if(!lastValid)return;const blob=data instanceof Blob?data:new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function renderHistory(){
    $('jobCount').textContent=history.length;$('jobs').replaceChildren();
    if(!history.length){const li=document.createElement('li');li.className='empty';li.textContent=t('emptySession');$('jobs').append(li);return;}
    for(const job of history.slice(-5).reverse()){const li=document.createElement('li'),span=document.createElement('span'),meta=document.createElement('span');span.textContent=(job.real?say('Sent','Enviado'):say('Simulated','Simulado'))+' · '+t(job.tab);meta.textContent=job.bytes.toLocaleString()+' B · '+job.time;li.append(span,meta);$('jobs').append(li);}
  }
  $('print').onclick=async()=>{
    if(!lastValid)return;const button=$('print');button.disabled=true;
    try{
      let result={bytes:esc().length,status:'simulated'};
      if(connected){const r=await fetch('/api/print',{method:'POST',headers:{'Content-Type':'image/x-portable-bitmap','X-Bematech-Client':'1'},body:pbm()});const data=await r.json();if(!r.ok)throw Error(data.error);result=data;}
      history.push({tab,real:result.status==='sent',bytes:result.bytes,time:new Date().toLocaleTimeString(lang==='pt'?'pt-BR':'en-GB',{hour:'2-digit',minute:'2-digit'})});renderHistory();
      notice(result.status==='sent'?say('Delivered to serial. Check the paper.','Entregue à serial. Confira o papel.'):say('Print simulated. No printer was contacted.','Impressão simulada. Nenhuma impressora foi acionada.'));
    }catch(e){notice(say('Print failed: ','Falha na impressão: ')+e.message);}finally{button.disabled=false;}
  };
  $('exportPng').onclick=()=>{if(lastValid)receipt.toBlob(b=>download(b,'bematech-receipt.png','image/png'));};
  $('exportPbm').onclick=()=>download(pbm(),'bematech-receipt.pbm','image/x-portable-bitmap');
  $('exportEsc').onclick=()=>download(esc(),'bematech-receipt.bin','application/octet-stream');
  document.querySelectorAll('[data-tab]').forEach(e=>e.onclick=()=>setTab(e.dataset.tab));
  $('language').onchange=()=>{lang=$('language').value;translate();};
  $('sample').onclick=()=>{$('editor').value=samples[lang];render();};
  $('textFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>64000){notice(say('Text file exceeds 64 KB.','O arquivo excede 64 KB.'));return;}$('editor').value=(await file.text()).slice(0,16000);render();};
  $('photoFile').onchange=e=>{const file=e.target.files[0];if(!file)return;if(file.size>10000000){notice(say('Image exceeds 10 MB.','A imagem excede 10 MB.'));return;}const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{if(image.width*image.height>32000000){notice(say('Image exceeds 32 megapixels.','Imagem maior que 32 megapixels.'));}else{photo=image;angle=0;render();}URL.revokeObjectURL(url);};image.onerror=()=>{URL.revokeObjectURL(url);notice(say('Cannot decode this image.','Não foi possível abrir a imagem.'));};image.src=url;};
  $('imageSample').onclick=()=>{sampleArt();render();};$('rotate').onclick=()=>{angle=(angle+90)%360;render();};
  const remember=()=>{undo.push(draw.getImageData(0,0,576,500));if(undo.length>12)undo.shift();};
  draw.fillStyle='#fff';draw.fillRect(0,0,576,500);
  const point=e=>{const r=drawing.getBoundingClientRect();return [(e.clientX-r.left)*576/r.width,(e.clientY-r.top)*500/r.height];};
  drawing.onpointerdown=e=>{e.preventDefault();remember();pen=true;previous=point(e);drawing.setPointerCapture(e.pointerId);draw.fillStyle=erasing?'#fff':'#000';draw.beginPath();draw.arc(...previous,+$('brush').value/2,0,2*Math.PI);draw.fill();render();};
  drawing.onpointermove=e=>{if(!pen)return;const current=point(e);draw.strokeStyle=erasing?'#fff':'#000';draw.lineWidth=+$('brush').value;draw.lineCap='round';draw.beginPath();draw.moveTo(...previous);draw.lineTo(...current);draw.stroke();previous=current;render();};
  drawing.onpointerup=drawing.onpointercancel=()=>{pen=false;previous=null;};
  $('erase').onclick=()=>{erasing=!erasing;$('erase').setAttribute('aria-pressed',String(erasing));};
  $('undo').onclick=()=>{if(undo.length)draw.putImageData(undo.pop(),0,0);render();};
  $('clearDrawing').onclick=()=>{remember();draw.fillStyle='#fff';draw.fillRect(0,0,576,500);render();};
  document.querySelectorAll('.panel input:not([type=file]),.panel select,.panel textarea').forEach(e=>e.addEventListener('input',render));
  $('editor').value=samples.en;translate();
  // Demo-only wrapper sets this flag before app.js. It has no local API bridge.
  if(window.BEMATECH_DEMO_ONLY===true){hosted=true;translate();}
  else fetch('/api/info',{cache:'no-store',signal:AbortSignal.timeout(3000)}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();if(!['simulation','serial'].includes(data.mode)||!Number.isInteger(data.dots)||data.dots<320||data.dots>832)throw Error();info=data;connected=true;translate();}).catch(()=>{hosted=true;connected=false;translate();notice(say('Browser-only mode. Local printer bridge unavailable.','Modo navegador. Conexão local indisponível.'));});
})();
