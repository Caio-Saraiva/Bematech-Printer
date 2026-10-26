/* Local printing configuration. No accounts, sessions or authentication. */
(function(){
 const byId=id=>document.getElementById(id);
 async function connectionDialog(){
  const dialog=document.createElement('div');dialog.className='dialog-body local-connection';const current=await api('/api/connection');
  dialog.innerHTML='<h2>Conexão local da impressora</h2><p>Escolha como este computador envia bytes ESC/Bema para a impressora.</p><p id="connectionMode" class="status-card"></p><div class="local-connection-grid"><label>Transporte<select id="connectionTransport"><option value="simulation">Simulação · sem dispositivo</option><option value="serial">Serial / USB CDC</option><option value="usb">USB · impressora / fila RAW</option><option value="system">Fila de impressão do sistema (RAW)</option></select></label><label>Dispositivos detectados<select id="connectionDetected"><option value="">Selecione ou informe a porta abaixo</option></select></label><label class="local-full">Porta / nome da fila<input id="connectionDevice" maxlength="255" placeholder="COM3 · /dev/ttyACM0 · /dev/cu.usbmodem…"></label><label>Velocidade (baud)<select id="connectionBaud"><option>1200</option><option>2400</option><option>4800</option><option>9600</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label><label>Bits de dados<select id="connectionBits"><option>8</option><option>7</option></select></label><label>Paridade<select id="connectionParity"><option value="none">Nenhuma</option><option value="even">Par</option><option value="odd">Ímpar</option></select></label><label>Bits de parada<select id="connectionStop"><option>1</option><option>2</option></select></label></div><p class="local-connection-help">A MP-4200 TH em USB CDC usa uma porta serial. Impressoras USB da classe de impressão podem usar /dev/usb/lpN no Linux ou uma fila RAW instalada no Windows/macOS. Configure a impressora para ESC/Bema.</p><p id="connectionResult" class="status-card" role="status"></p><details><summary>Onde ficam os ajustes</summary><code id="connectionStorage"></code></details><div class="dialog-actions"><button id="connectionDetect">Detectar dispositivos</button><button id="connectionTest">Salvar e testar conexão</button><button id="connectionSave" class="default">Salvar</button></div>';
  modal('Conexão USB / Serial',dialog);
  byId('connectionTransport').value=current.transport;byId('connectionDevice').value=current.device||'';
  byId('connectionBaud').value=current.baud||9600;byId('connectionBits').value=current.data_bits||8;byId('connectionParity').value=current.parity||'none';byId('connectionStop').value=current.stop_bits||1;
  byId('connectionStorage').textContent=current.config_path||'Browser local storage';
  byId('connectionMode').textContent=window.localBridge.native?'Aplicativo C local · a porta só é aberta ao testar ou imprimir.':'Demonstração: todas as conexões e impressões são simuladas. Nenhum USB ou serial será aberto.';
  function inputs(){
    const type=byId('connectionTransport').value,isSerial=type==='serial';for(const id of ['connectionBaud','connectionBits','connectionParity','connectionStop'])byId(id).disabled=!isSerial;
    byId('connectionDevice').disabled=type==='simulation';
  }
  byId('connectionTransport').onchange=inputs;inputs();
  async function detect(){
    const select=byId('connectionDetected');try{
      const result=await api('/api/devices');select.replaceChildren(new Option(window.i18n.t('Selecione ou informe a porta abaixo'),''));
      result.devices.forEach(device=>select.append(new Option(device.transport+' · '+device.label,JSON.stringify(device))));
      byId('connectionResult').textContent=result.devices.length?window.i18n.t('Dispositivos encontrados: ')+result.devices.length:window.i18n.t('Nenhum dispositivo detectado. Você pode informar a porta manualmente.');
    }catch(error){byId('connectionResult').textContent=error.message;}
  }
  function selectDetected(){const value=byId('connectionDetected').value;if(!value)return;const chosen=JSON.parse(value);byId('connectionTransport').value=chosen.transport;byId('connectionDevice').value=chosen.device;inputs();}
  byId('connectionDetected').onchange=selectDetected;
  async function save(test){
    try{
      const body={transport:byId('connectionTransport').value,device:byId('connectionDevice').value.trim(),baud:Number(byId('connectionBaud').value),data_bits:Number(byId('connectionBits').value),parity:byId('connectionParity').value,stop_bits:Number(byId('connectionStop').value)};
      if(body.transport!=='simulation'&&!body.device)throw Error(window.i18n.t('Informe a porta ou o nome da fila.'));
      await api('/api/connection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(test){const result=await api('/api/connection/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});byId('connectionResult').textContent=window.i18n.t(result.state==='simulation'?'Simulação confirmada. Nenhum dispositivo foi aberto.':'Conexão aberta com sucesso, sem imprimir.');}
      else{closeModal();await refreshStatus();note('Conexão salva neste computador.');}
    }catch(error){byId('connectionResult').textContent=error.message;note(error.message,true);}
  }
  byId('connectionDetect').onclick=detect;byId('connectionTest').onclick=()=>save(true);byId('connectionSave').onclick=()=>save(false);detect();
 }
 byId('connectionButton').onclick=()=>connectionDialog().catch(error=>note(error.message,true));
 const exports=document.createElement('span');exports.className='local-exports';exports.innerHTML='<label for="exportFormat">Exportar</label><select id="exportFormat"><option value="png">PNG</option><option value="pbm">PBM</option><option value="esc">ESC/Bema</option></select><button id="exportPreview">Salvar prévia</button>';document.querySelector('.print-options').append(exports);
 byId('exportPreview').onclick=()=>window.localBridge.exportCurrent(byId('exportFormat').value).catch(error=>note(error.message,true));
 const banner=document.createElement('p');banner.id='localDemoNotice';banner.className='local-demo-notice';banner.hidden=true;document.querySelector('.main-toolbar').after(banner);
 window.addEventListener('bematech:connection',()=>refreshStatus());
 window.addEventListener('bematech:job',event=>{if(event.detail.status==='simulated')byId('headerStatus').textContent=window.i18n.t('Impressão simulada · nenhum dispositivo acionado');});
 window.localBridge.ready.then(()=>{
   cfg=window.localBridge.settings;byId('feed').value=cfg.default_feed;byId('cut').checked=!!cfg.auto_cut;
   byId('photoWidth').max=cfg.dots;byId('photoWidth').value=Math.min(cfg.image_width,cfg.dots);byId('photoWidth').dispatchEvent(new Event('input'));
   if(!window.localBridge.native){banner.hidden=false;banner.textContent='Demonstração local: impressão simulada. Arquivos são processados neste navegador. Dados do computador são exemplos.';}
   byId('console').classList.remove('hidden');refreshStatus();window.renderBthermalPreview?.();window.i18n.apply();
 }).catch(error=>note(error.message,true));
})();
