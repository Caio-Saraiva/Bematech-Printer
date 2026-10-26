/* Calculadora de custo e preço para impressão 3D. Os cálculos são locais; só
   impressoras e orçamentos salvos seguem para o armazenamento local. */
(function(){
  const byId=id=>document.getElementById(id), money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value||0);
  const fixed=(value,digits=2)=>Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const escape=value=>String(value??'').replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
  let printers=[], initialized=false, latest=null;
  const number=id=>{let raw=String(byId(id).value||'').trim().replace('R$',''); raw=raw.includes(',')&&raw.includes('.')?raw.replace(/\./g,'').replace(',','.'):raw.replace(',','.'); const value=Number(raw); if(!Number.isFinite(value))throw Error(`Confira o campo “${byId(id).closest('label')?.childNodes[0]?.textContent?.trim()||id}”.`); return value;};
  function hours(){const raw=byId('calcHours').value.trim().toLowerCase().replace(',','.');let value;
    if(raw.includes('h')){const [hour,minute='0']=raw.split('h',2);value=Number(hour||0)+Number(minute||0)/60;}
    else if(raw.includes(':')){const [hour,minute='0']=raw.split(':',2);value=Number(hour||0)+Number(minute||0)/60;}
    else value=Number(raw);
    if(!Number.isFinite(value)||value<=0)throw Error('Tempo de impressão inválido. Use 6,5, 06:30 ou 6h30.'); return value;
  }
  function timestamp(){return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date()).replace(',',' ·');}
  function input(){
    const custom=byId('calcMaterial').value==='Outro'; const data={material:custom?(byId('calcOtherMaterial').value.trim()||'Outro'):byId('calcMaterial').value,priceKg:number('calcPriceKg'),weight:number('calcWeight'),quantity:Math.trunc(number('calcQuantity')),loss:number('calcLoss'),printer:byId('calcPrinter').value||'Bambu Lab A1',power:number('calcPower'),hours:hours(),tariff:number('calcTariff'),depreciationOn:byId('calcDepreciationOn').checked,printerValue:number('calcPrinterValue'),lifeHours:number('calcLifeHours'),residual:number('calcResidual'),laborMinutes:number('calcLaborMinutes'),laborHour:number('calcLaborHour'),packaging:number('calcPackaging'),other:number('calcOther'),failureReserve:number('calcFailureReserve'),paymentFee:number('calcPaymentFee'),margin:number('calcMargin'),discount:number('calcDiscount'),minimum:number('calcMinimum'),round:number('calcRound'),clientVersion:byId('calcClientVersion').checked};
    for(const [key,value] of Object.entries(data))if(typeof value==='number'&&value<0)throw Error(`“${key}” não pode ser negativo.`);
    if(data.quantity<1||data.lifeHours<1||data.power<1||data.hours<=0)throw Error('Quantidade, potência, vida útil e tempo precisam ser maiores que zero.');
    if(data.residual>100||data.failureReserve>100||data.discount>100||data.paymentFee>=100||data.margin>=100||data.paymentFee+data.margin>=100)throw Error('Margem + taxa de pagamento precisa ser menor que 100%.');
    return data;
  }
  function calculate(data){
    const billedWeight=data.weight*(1+data.loss/100), materialCost=data.priceKg/1000*billedWeight, consumption=data.power/1000*data.hours, energyCost=consumption*data.tariff;
    const depreciationHour=data.depreciationOn?data.printerValue*(1-data.residual/100)/data.lifeHours:0, machineCost=depreciationHour*data.hours, laborCost=data.laborMinutes/60*data.laborHour;
    const operational=materialCost+energyCost+machineCost+laborCost+data.packaging+data.other, failureReserve=operational*data.failureReserve/100, totalCost=operational+failureReserve;
    const listPrice=Math.max(totalCost/(1-data.margin/100-data.paymentFee/100),data.minimum), discountValue=listPrice*data.discount/100, finalPrice=listPrice-discountValue, paymentValue=finalPrice*data.paymentFee/100, netRevenue=finalPrice-paymentValue, profit=netRevenue-totalCost;
    return {billedWeight,materialCost,consumption,energyCost,depreciationHour,machineCost,laborCost,operational,failureReserve,totalCost,listPrice,discountValue,finalPrice,paymentValue,netRevenue,profit,effectiveMargin:finalPrice?profit/finalPrice*100:0,markup:totalCost?((finalPrice/totalCost)-1)*100:0,costPerPiece:totalCost/data.quantity,pricePerPiece:finalPrice/data.quantity,profitPerPiece:profit/data.quantity,costPerHour:totalCost/data.hours,profitPerHour:profit/data.hours,commercial:data.round>0?Math.ceil(finalPrice/data.round)*data.round:finalPrice};
  }
  function row(label,value,bold=false){
    // A impressora recebe texto, não CSS. Completamos cada linha até a mesma
    // coluna usada pelo servidor para que o valor permaneça à direita tanto no
    // papel quanto na prévia de fonte monoespaçada.
    const columns=Number(cfg?.cols_a)||48, left=window.i18n.t(String(label)), right=String(value), space=columns-[...left].length-[...right].length;
    if(space>=3){const text=`${left}${' '.repeat(space)}${right}`;return `<div class="calc-receipt-row">${bold?'<b>':''}${escape(text)}${bold?'</b>':''}</div>`;}
    return `<div class="calc-receipt-row">${bold?'<b>':''}${escape(left)}${bold?'</b>':''}</div><div class="calc-receipt-row" style="text-align:right">${bold?'<b>':''}${escape(right)}${bold?'</b>':''}</div>`;
  }
  function duration(value){const seconds=Math.round(value*3600),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;return [days,hours,minutes,secs].map(part=>String(part).padStart(2,'0')).join(':');}
  function clientReceipt(data,result){
    const gap='<div><br></div>', loss=data.weight*data.loss/100, price=data.round>0?result.commercial:result.finalPrice;
    return `<div class="calc-receipt-title" style="text-align:center"><b><u>${window.i18n.t('ORÇAMENTO DE IMPRESSÃO 3D')}</u></b></div><div class="calc-receipt-date" style="text-align:center">${timestamp()}</div>${gap}`+
      row('Material',data.material)+row('Peças',String(data.quantity))+row('Peso do modelo',`${fixed(data.weight)} g`)+row('Perda / purga',`${fixed(loss)} g (${fixed(data.loss,1)}%)`)+row('Impressora',data.printer)+row('Tempo de impressão',duration(data.hours))+`${gap}<div class="calc-receipt-highlight" style="text-align:center"><b><u>${window.i18n.t('PREÇO FINAL')}</u></b></div><div style="text-align:center"><b>${money(price)}</b></div>`;
  }
  function receipt(data,result){
    if(data.clientVersion)return clientReceipt(data,result);
    const section=title=>`<div class="calc-receipt-section" style="text-align:center"><b><u>${escape(window.i18n.t(title))}</u></b></div>`;
    const gap='<div><br></div>';
    let html=`<div class="calc-receipt-title" style="text-align:center"><b><u>${window.i18n.t('ORÇAMENTO DE IMPRESSÃO 3D')}</u></b></div><div class="calc-receipt-date" style="text-align:center">${timestamp()}</div>${gap}${section('DADOS DO TRABALHO')}`;
    html+=row('Material',data.material)+row('Filamento',`${money(data.priceKg)}/kg`)+row('Peso informado',`${fixed(data.weight)} g`)+row('Perda / purga',`${fixed(data.loss)}%`)+row('Peso faturado',`${fixed(result.billedWeight)} g`)+row('Quantidade',String(data.quantity))+row('Impressora',data.printer)+row('Potência média',`${fixed(data.power,0)} W`)+row('Tempo de impressão',`${fixed(data.hours)} h`)+row('Consumo estimado',`${fixed(result.consumption,3)} kWh`)+row('Tarifa de energia',`${money(data.tariff)}/kWh`);
    html+=gap+section('COMPOSIÇÃO DO CUSTO')+row('Material',money(result.materialCost))+row('Energia',money(result.energyCost))+row('Uso / depreciação',money(result.machineCost))+row('Mão de obra',money(result.laborCost))+row('Embalagem',money(data.packaging))+row('Outros custos',money(data.other))+row(`Reserva para falhas (${fixed(data.failureReserve,1)}%)`,money(result.failureReserve))+`<div class="calc-receipt-rule">${'-'.repeat(Number(cfg?.cols_a)||48)}</div>`+row('CUSTO TOTAL',money(result.totalCost),true)+row('Custo por peça',money(result.costPerPiece),true);
    html+=gap+section('FORMAÇÃO DO PREÇO')+row('Margem alvo',`${fixed(data.margin)}%`)+row('Taxa de pagamento',`${fixed(data.paymentFee)}%`)+row('Preço de tabela',money(result.listPrice),true)+row(`Desconto (${fixed(data.discount)}%)`,`-${money(result.discountValue)}`)+row('PREÇO FINAL',money(result.finalPrice),true);
    html+=gap+section('RESULTADO')+row('Taxa em reais',money(result.paymentValue))+row('Receita após taxa',money(result.netRevenue))+row('Lucro final',money(result.profit),true)+row('Margem efetiva',`${fixed(result.effectiveMargin)}%`,true)+row('Markup efetivo',`${fixed(result.markup)}%`)+row('Preço por peça',money(result.pricePerPiece))+row('Lucro por peça',money(result.profitPerPiece))+row('Lucro / hora',`${money(result.profitPerHour)}/h`);
    if(data.round>0)html+=`${gap}<div class="calc-receipt-highlight" style="text-align:center"><b><u>PREÇO COMERCIAL SUGERIDO</u></b><br><b>${money(result.commercial)}</b></div>`;
    if(result.profit<0)html+='<div class="calc-receipt-alert" style="text-align:center"><b>ATENÇÃO: este orçamento gera prejuízo.</b></div>';
    else if(result.effectiveMargin<data.margin)html+='<div class="calc-receipt-alert" style="text-align:center">O desconto reduziu a margem efetiva em relação à margem-alvo.</div>';
    return html;
  }
  function fitPreview(columns){const paper=byId('paper'),usable=Math.max(1,paper.clientWidth-18),context=document.createElement('canvas').getContext('2d');context.font='100px "Courier New", monospace';const glyph=Math.max(1,context.measureText('0').width),size=Math.max(6,Math.min(18,(usable/(Math.max(1,columns)*glyph))*100*.985));paper.style.setProperty('font-size',`${size}px`,'important');}
  function render(){
    if(tab!=='calculator')return; const paper=byId('paper');paper.classList.remove('hidden');byId('previewMeta').textContent=window.i18n.t('Orçamento 3D · prévia pronta para imprimir'); byId('photoCanvas').classList.add('hidden'); byId('drawStage').classList.add('hidden'); document.querySelector('.paper-zoom-stage')?.classList.remove('hidden');
    try{const data=input(),result=calculate(data);latest={data,result,html:receipt(data,result)};paper.innerHTML=latest.html;fitPreview(Number(cfg?.cols_a)||48);note(`${data.clientVersion?'Versão para cliente':'Orçamento'} · ${money(data.round>0?result.commercial:result.finalPrice)}.`);}
    catch(error){latest=null;paper.innerHTML='<div class="calc-receipt-alert">Preencha os dados para gerar o orçamento.</div>';note(error.message,true);}
  }
  function populatePrinters(){const select=byId('calcPrinter'),current=select.value;select.replaceChildren(...printers.map(item=>{const option=document.createElement('option');option.value=item.name;option.textContent=item.name;return option;}));select.value=printers.some(item=>item.name===current)?current:(printers[0]?.name||'');printerChanged();}
  function printerChanged(){const printer=printers.find(item=>item.name===byId('calcPrinter').value);if(!printer)return;byId('calcPower').value=printer.power_w;byId('calcPrinterNote').textContent=printer.note||`Potência máxima cadastrada: ${printer.max_power_w||'não informada'} W.`;render();}
  async function loadPrinters(){try{printers=(await api('/api/calculator/printers')).printers;populatePrinters();initialized=true;}catch(error){note(error.message,true);}}
  async function addPrinter(){const dialog=document.createElement('div');dialog.className='dialog-body';dialog.innerHTML='<h2>Adicionar impressora 3D</h2><p>Ela ficará disponível para os próximos orçamentos deste utilitário.</p><div class="calculator-grid"><label>Nome / modelo<input id="newCalcPrinterName" maxlength="80" required></label><label>Potência média (W)<input id="newCalcPrinterPower" type="number" min="1" value="100"></label><label>Potência máxima (W)<input id="newCalcPrinterMax" type="number" min="0" value="0"></label><label class="calculator-wide">Observação<input id="newCalcPrinterNote" maxlength="240"></label></div><div class="dialog-actions"><button id="newCalcPrinterSave" class="default">Adicionar</button></div>';dialog.querySelector('#newCalcPrinterSave').onclick=async()=>{try{const body={name:dialog.querySelector('#newCalcPrinterName').value,power_w:+dialog.querySelector('#newCalcPrinterPower').value,max_power_w:+dialog.querySelector('#newCalcPrinterMax').value,note:dialog.querySelector('#newCalcPrinterNote').value};const answer=await api('/api/calculator/printers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});printers=answer.printers;populatePrinters();byId('calcPrinter').value=body.name;printerChanged();closeModal();note('Impressora adicionada.');}catch(error){note(error.message,true);}};modal('Calculadora 3D',dialog);}
  async function save(){render();if(!latest)return;try{const reply=await api('/api/calculator/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:latest.data,result:latest.result})});note(`Orçamento #${reply.id} salvo no histórico.`);}catch(error){note(error.message,true);}}
  async function history(){try{const answer=await api('/api/calculator/history');const dialog=document.createElement('div');dialog.className='dialog-body';const list=answer.quotes.map(item=>`<li><b>${escape(item.data.material)}</b> · ${escape(item.data.printer)} · ${money(item.result.finalPrice)}<small>${new Date(item.created_at*1000).toLocaleString('pt-BR')}</small></li>`).join('')||'<li>Nenhum orçamento salvo.</li>';dialog.innerHTML=`<h2>Histórico de orçamentos</h2><p>Os últimos 100 orçamentos locais. O CSV segue o mesmo formato do programa original.</p><ol class="calc-history">${list}</ol><div class="dialog-actions"><a class="calc-csv-button" href="/api/calculator/history.csv">Baixar CSV</a></div>`;modal('Histórico 3D',dialog);}catch(error){note(error.message,true);}}
  async function print(){render();if(!latest)return;try{const reply=await api('/api/print/document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html:latest.html,cut:byId('cut').checked,feed:+byId('feed').value,expanded:false,condensed:false})});note(`Orçamento #${reply.id} enviado à fila.`);}catch(error){note(error.message,true);}}
  function show(name){tab=name;document.querySelectorAll('.tab').forEach(element=>element.classList.toggle('hidden',element.id!==name));document.querySelectorAll('[data-tab]').forEach(element=>element.classList.toggle('selected',element.dataset.tab===name));document.getElementById('modelAxisGizmo')?.classList.toggle('hidden',name!=='model3d');if(name==='calculator'){if(!initialized)loadPrinters();render();}else if(name==='model3d')window.modelThermal?.show();else window.renderBthermalPreview?.();}
  function bind(){
    const actions=document.querySelector('.calculator-actions'); if(!byId('calcClientVersion')&&actions){const label=document.createElement('label');label.className='calculator-client-toggle';label.innerHTML='<input id="calcClientVersion" type="checkbox"> Versão para cliente';actions.before(label);}
    document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>show(button.dataset.tab));
    byId('calculatorForm').onsubmit=event=>{event.preventDefault();render();}; byId('calcSave').onclick=save;byId('calcHistory').onclick=history;byId('calcAddPrinter').onclick=addPrinter;byId('calcPrinter').onchange=printerChanged;byId('calcMaterial').onchange=()=>{byId('calcOtherMaterialRow').classList.toggle('hidden',byId('calcMaterial').value!=='Outro');render();};
    byId('calculatorForm').addEventListener('input',render);byId('printButton').addEventListener('click',event=>{if(tab==='calculator'){event.stopImmediatePropagation();print();}},true);
  }
  bind();
  window.addEventListener('resize',()=>{if(tab==='calculator')fitPreview(Number(cfg?.cols_a)||48);});
  window.showBthermalTab=show;
  const modelCss=document.createElement('link');modelCss.rel='stylesheet';modelCss.href='/model-3d.css';document.head.append(modelCss);
  const modelScript=document.createElement('script');modelScript.src='/model-3d.js';document.body.append(modelScript);
})();
