/* English first, Brazilian Portuguese second; preserves the original UI structure. */
(function(){
'use strict';
const dictionary={
'Impressão Bematech MP-4200 TH':'Bematech MP-4200 TH Printing','Consultando impressora…':'Checking printer…','Idioma':'Language','Conexão':'Connection',
'Fechar':'Close','Opacidade':'Opacity','Sombreador':'Shader','Pressão contínua':'Continuous pressure','Escurece suavemente enquanto o toque é mantido.':'Gradually darkens while the pointer is held down.','Texto largo':'Double-width text','Texto condensado':'Condensed text',
'Orçamento 3D · prévia pronta para imprimir':'3D quote · preview ready to print','PREÇO COMERCIAL SUGERIDO':'SUGGESTED COMMERCIAL PRICE',
'ORÇAMENTO DE IMPRESSÃO 3D':'3D PRINT QUOTE','DADOS DO TRABALHO':'JOB DETAILS','COMPOSIÇÃO DO CUSTO':'COST BREAKDOWN','FORMAÇÃO DO PREÇO':'PRICING','RESULTADO':'RESULT','PREÇO FINAL':'FINAL PRICE','CUSTO TOTAL':'TOTAL COST',
'Peças':'Parts','Peso do modelo':'Model weight','Perda / purga':'Waste / purge','Filamento':'Filament','Peso informado':'Input weight','Peso faturado':'Billed weight','Quantidade':'Quantity','Potência média':'Average power','Consumo estimado':'Estimated consumption','Tarifa de energia':'Electricity tariff','Energia':'Energy','Uso / depreciação':'Machine use / depreciation','Mão de obra':'Labor','Embalagem':'Packaging','Outros custos':'Other costs','Custo por peça':'Cost per part','Margem alvo':'Target margin','Taxa de pagamento':'Payment fee','Preço de tabela':'List price','Taxa em reais':'Payment fee amount','Receita após taxa':'Net revenue','Lucro final':'Final profit','Margem efetiva':'Effective margin','Markup efetivo':'Effective markup','Preço por peça':'Price per part','Lucro por peça':'Profit per part','Preço comercial sugerido':'Suggested commercial price','DIAGNÓSTICO DO COMPUTADOR':'COMPUTER DIAGNOSTICS','SISTEMA':'SYSTEM','MEMÓRIA':'MEMORY',
'Editor':'Editor','Lista':'List','Arquivo':'File','Foto':'Photo','Desenho':'Drawing','3D':'3D','Modelo':'Model','Computador':'Computer','Ajustes':'Settings','Testes':'Tests','Imprimir':'Print',
'Áreas e ações':'Tools and actions','Selecione o texto para aplicar a formatação.':'Select text to apply formatting.','Negrito':'Bold','Itálico':'Italic','Sublinhado':'Underline',
'Alinhar à esquerda':'Align left','Centralizar':'Align center','Alinhar à direita':'Align right','Texto expandido':'Double-width text','Fonte condensada':'Condensed font',
'Escreva ou cole o cupom aqui…':'Type or paste your receipt here…','Título':'Title','Um item por linha; a continuação recua no papel.':'One item per line; continuation lines are indented.',
'Primeiro item\nSegundo item':'First item\nSecond item','Arquivo de texto':'Text file','O conteúdo é lido localmente e não fica salvo no servidor.':'Files are read locally on your computer.',
'Escolher arquivo':'Choose file','Condensada':'Condensed','Numerar linhas':'Number lines','Cabeçalho':'Header','Foto':'Photo','Prévia monocromática para a bobina térmica.':'Monochrome preview for thermal paper.',
'Escolher foto':'Choose photo','Largura':'Width','Brilho':'Brightness','Contraste':'Contrast','Gama':'Gamma','Dithering':'Dithering','Limiar':'Threshold','Sem meio-tom':'Threshold only',
'Auto-níveis':'Auto levels','Inverter':'Invert','Game Boy Camera':'Game Boy Camera','Pixel':'Pixel','Girar 90° à esquerda':'Rotate 90° left','Girar 90° à direita':'Rotate 90° right','Restaurar ajustes':'Reset adjustments',
'Ajuste rápido de imagem':'Quick image adjustment','Auto-ajustar':'Auto-adjust','Foto térmica':'Thermal photo','Documento':'Document','Logo / QR':'Logo / QR','Foto escura':'Dark photo',
'Modo do documento':'Document mode','Texto literal':'Literal text','Rasterizar e otimizar':'Rasterize and optimize','Impressão':'Printing','Direto · espaço entre páginas':'Continuous · page spacing',
'Página por página · cortar':'Page by page · cut','Espaço entre páginas':'Page spacing','Escolha texto, código, PDF ou Office.':'Choose text, code, PDF or Office.',
'Desenho livre':'Free drawing','Desenhe diretamente na prévia; tons de cinza saem em meio-tom.':'Draw directly in the preview; gray tones are dithered.',
'Ferramentas':'Tools','Ferramentas de desenho':'Drawing tools','Pincel':'Brush','Sombra':'Shade','Balde':'Fill','Borracha':'Eraser','Seleção':'Selection',
'Sombreador de opacidade acumulada':'Build-up opacity shading','Preencher uma área':'Fill an area','Selecionar área':'Select an area','Fino':'Fine','Médio':'Medium','Grosso':'Thick',
'Tamanho do pincel':'Brush size','Escala de cinza':'Grayscale','Tom do pincel':'Brush tone','Preto':'Black','Cinza escuro':'Dark gray','Cinza claro':'Light gray','Branco':'White','Escuro':'Dark','Claro':'Light',
'Proporção':'Aspect ratio','Orientação':'Orientation','Retrato':'Portrait','Paisagem':'Landscape','Retângulo':'Rectangle','Livre':'Freehand','Apagar':'Delete','Apagar área selecionada':'Delete selected area',
'Desfazer':'Undo','Refazer':'Redo','Limpar tela':'Clear canvas','Limpar todo o canvas':'Clear the entire canvas',
'Calculadora 3D':'3D Calculator','Custos, margem real e prévia do orçamento.':'Costs, true profit margin and quote preview.','Trabalho e material':'Job and material',
'Material':'Material','Nome do material':'Material name','Ex.: Resina':'e.g. Resin','Rolo de 1 kg (R$)':'1 kg spool (R$)','Peso total do slicer (g)':'Total slicer weight (g)','Quantidade de peças':'Number of parts','Perda / purga (%)':'Waste / purge (%)',
'Impressão e energia':'Printing and energy','Impressora':'Printer','Potência média (W)':'Average power (W)','Tempo de impressão':'Print duration','Tarifa de energia (R$/kWh)':'Electricity tariff (R$/kWh)',
'Base SP: Enel B1 + bandeira amarela, antes de tributos.':'SP reference: Enel B1 + yellow flag, before taxes.','Adicionar impressora':'Add printer','Custos operacionais':'Operating costs',
'Incluir uso / depreciação':'Include machine use / depreciation','Valor da impressora (R$)':'Printer value (R$)','Vida útil estimada (h)':'Estimated useful life (h)','Valor residual (%)':'Residual value (%)',
'Tempo manual (min)':'Manual work (min)','Valor da sua hora (R$)':'Hourly labor rate (R$)','Embalagem (R$)':'Packaging (R$)','Outros custos (R$)':'Other costs (R$)','Reserva para falhas (%)':'Failure reserve (%)',
'Preço e venda':'Pricing and sales','Taxa de pagamento (%)':'Payment fee (%)','Margem desejada (%)':'Target margin (%)','Desconto (%)':'Discount (%)','Cobrança mínima (R$)':'Minimum charge (R$)',
'Arredondar para múltiplos de R$':'Round up to multiples of R$','Atualizar orçamento':'Update quote','Salvar no histórico':'Save to history','Histórico / CSV':'History / CSV','Versão para cliente':'Customer version',
'Como vai ficar no papel':'Paper preview','Cortar ao terminar':'Cut when finished','Avançar':'Feed','linhas':'lines','Pronto.':'Ready.','Exportar':'Export','Salvar prévia':'Save preview',
'Modelo 3D':'3D Model','Pose e aparência para impressão.':'Pose and appearance for printing.','Escolher modelo':'Choose model','STL, OBJ, 3MF ou FBX ASCII · processado localmente':'STL, OBJ, 3MF or ASCII FBX · processed locally',
'Pose da câmera':'Camera pose','Frente':'Front','Topo':'Top','Isométrica':'Isometric','Reenquadrar':'Reframe','Projeção':'Projection','Projeção da câmera':'Camera projection','Perspectiva':'Perspective','Ortogonal':'Orthographic',
'Posição X':'Position X','Posição Y':'Position Y','Rotação X (°)':'X rotation (°)','Rotação Y (°)':'Y rotation (°)','Rotação Z (°)':'Z rotation (°)','Aparência no papel':'Paper appearance',
'Fosco':'Matte','Metalizado':'Metallic','Metálico':'Metallic','Reflexivo':'Reflective','CAD técnico':'Technical CAD','Arestas principais':'Principal edges','Arestas principais sólidas':'Solid principal edges',
'Resolução':'Resolution','Multiplicador de resolução':'Resolution multiplier','Valor do multiplicador de resolução':'Resolution multiplier value','Chão e sombra':'Ground and shadow',
'Luz horizontal (°)':'Horizontal light (°)','Azimute da luz (°)':'Light azimuth (°)','UP do modelo':'Model UP axis','Y · padrão':'Y · default','Normaliza topo, frente, luz e chão conforme o eixo vertical de origem.':'Normalizes top, front, light and ground using the source vertical axis.',
'GreyColor · branco → preto':'Gray color · white → black','Material iluminado':'Lit material','+ arrastar: rotação Z · botão direito ou':'+ drag: Z rotation · right button or','+ arrastar: mover · roda: zoom (máximo 4×).':'+ drag: pan · wheel: zoom (maximum 4×).',
'Arraste à direita/esquerda ou para cima/baixo para girar o modelo nessa direção.':'Drag horizontally or vertically to rotate in that direction.',
'Cubo de orientação: clique em uma face, aresta ou vértice para aplicar a pose.':'Orientation cube: click a face, edge or vertex to apply a pose.',
'Cubo de orientação 3D; use as faces, arestas e vértices para mudar a pose':'3D orientation cube; use faces, edges and vertices to change the pose',
'Diagnóstico do computador':'Computer diagnostics','Confira o relatório que será enviado para a impressora.':'Review the report that will be sent to the printer.',
'Sistema, uptime, CPU, memória, disco e carga atual.':'System, uptime, CPU, memory, disk and current load.','Atualizar relatório':'Refresh report',
'Clique em “Atualizar relatório” para consultar o computador.':'Click “Refresh report” to query this computer.','Dados atualizados. A prévia à direita é o relatório que será impresso.':'Data refreshed. The preview on the right is the report that will be printed.',
'Testes e diagnóstico':'Tests and diagnostics','Página de teste':'Test page','fontes, acentos e régua':'fonts, accents and ruler','Teste gráfico de 1 cm':'1 cm graphics test','verifica imagem ESC/Bema':'checks ESC/Bema graphics',
'Status da impressora':'Printer status','Avançar 5 linhas':'Feed 5 lines','Cortar agora':'Cut now','Assistente de calibração':'Calibration wizard','Fila recente':'Recent jobs','Nenhum trabalho recente.':'No recent jobs.',
'Informações de hardware e uso atual dos recursos.':'Hardware information and current resource use.','Atualizar diagnóstico local':'Refresh local diagnostics','RAW ESC/Bema':'RAW ESC/Bema','Enviar RAW':'Send RAW','Bytes Base64':'Base64 bytes',
'Configuração que controla papel e prévia':'Paper and preview configuration','Colunas e largura útil são globais. A largura útil deve corresponder à área física medida — por exemplo, 596 pontos.':'Columns and usable width apply to all jobs. Usable width must match the measured physical print head, for example 596 dots.',
'Segurança de compatibilidade: a fonte condensada usa ESC M. Nesta unidade ela ficou desativada porque o comando apareceu no papel como “M”. Só ligue após validar uma tira de teste.':'Compatibility: condensed font uses ESC M. Enable it only after validating a physical test strip with your printer.',
'Colunas · fonte normal':'Columns · normal font','Colunas · condensada':'Columns · condensed font','Largura útil da cabeça':'Usable head width','Largura padrão de foto':'Default photo width',
'Espaçamento gráfico':'Graphic band spacing','Avanço padrão':'Default feed','Cortar por padrão':'Cut by default','Itálico ESC 4/5':'Italic ESC 4/5','Habilitar ESC M':'Enable ESC M','Rasterizar Unicode incompatível':'Rasterize unsupported Unicode',
'Valores sugeridos':'Suggested values','Salvar':'Save','Ajustes da impressora':'Printer settings','Ajustes e calibração':'Settings and calibration','Padrões':'Defaults',
'Configuração salva e prévia recalculada.':'Settings saved and preview recalculated.','A largura padrão da foto não pode ultrapassar a largura útil.':'Default photo width cannot exceed usable head width.',
'Imprima uma tira, compare o papel e escolha o melhor número. Você pode deslocar a faixa, refiná-la de 1 em 1 ou aplicar um valor medido manualmente.':'Print a strip, compare the paper and choose the best number. Shift the range, refine by one or apply a measured value.',
'Teste':'Test','Colunas — normal':'Columns — normal','Colunas — condensada':'Columns — condensed','Espaçamento de foto':'Photo band spacing','Centro':'Center','Passo':'Step','◀ Menores':'◀ Smaller','Maiores ▶':'Larger ▶',
'Afinar ±1':'Refine ±1','1. Imprimir tira desta faixa':'1. Print this range','Valor manual':'Manual value','Número medido':'Measured number','Aplicar valor manual':'Apply manual value','Imprima a tira primeiro':'Print the strip first','Assistente · calibração':'Wizard · calibration',
'Conexão local da impressora':'Local printer connection','Escolha como este computador envia bytes ESC/Bema para a impressora.':'Choose how this computer sends ESC/Bema bytes to the printer.',
'Transporte':'Transport','Simulação · sem dispositivo':'Simulation · no device','Serial / USB CDC':'Serial / USB CDC','USB · impressora / fila RAW':'USB · printer / RAW queue','Fila de impressão do sistema (RAW)':'System print queue (RAW)',
'Dispositivos detectados':'Detected devices','Selecione ou informe a porta abaixo':'Select a device or enter the port below','Porta / nome da fila':'Port / queue name','Velocidade (baud)':'Baud rate','Bits de dados':'Data bits',
'Paridade':'Parity','Nenhuma':'None','Par':'Even','Ímpar':'Odd','Bits de parada':'Stop bits',
'A MP-4200 TH em USB CDC usa uma porta serial. Impressoras USB da classe de impressão podem usar /dev/usb/lpN no Linux ou uma fila RAW instalada no Windows/macOS. Configure a impressora para ESC/Bema.':'The MP-4200 TH in USB CDC mode uses a serial port. USB printer-class devices can use /dev/usb/lpN on Linux or an installed RAW queue on Windows/macOS. Configure the printer for ESC/Bema.',
'Onde ficam os ajustes':'Where settings are stored','Detectar dispositivos':'Detect devices','Salvar e testar conexão':'Save and test connection','Conexão USB / Serial':'USB / Serial connection',
'Aplicativo C local · a porta só é aberta ao testar ou imprimir.':'Local C application · the device is opened only when testing or printing.',
'Demonstração: todas as conexões e impressões são simuladas. Nenhum USB ou serial será aberto.':'Demo: all connections and printing are simulated. No USB or serial device will be opened.',
'Dispositivos encontrados: ':'Devices found: ','Nenhum dispositivo detectado. Você pode informar a porta manualmente.':'No devices detected. You can enter a port manually.',
'Informe a porta ou o nome da fila.':'Enter a port or queue name.','Simulação confirmada. Nenhum dispositivo foi aberto.':'Simulation confirmed. No device was opened.',
'Conexão aberta com sucesso, sem imprimir.':'Connection opened successfully without printing.','Conexão salva neste computador.':'Connection saved on this computer.',
'Impressão simulada · nenhum dispositivo acionado':'Print simulated · no device contacted',
'Demonstração local: impressão simulada. Arquivos são processados neste navegador. Dados do computador são exemplos.':'Local demo: printing is simulated. Files are processed in this browser. Computer metrics are sample data.',
'Adicionar impressora 3D':'Add 3D printer','Ela ficará disponível para os próximos orçamentos deste utilitário.':'It will be available for future quotes on this computer.',
'Nome / modelo':'Name / model','Potência máxima (W)':'Maximum power (W)','Observação':'Note','Adicionar':'Add','Histórico de orçamentos':'Quote history',
'Os últimos 100 orçamentos locais. O CSV segue o mesmo formato do programa original.':'The latest 100 local quotes. CSV uses the original application format.','Nenhum orçamento salvo.':'No saved quotes.','Baixar CSV':'Download CSV',
'Redimensionar utilitário e prévia':'Resize tool and preview','Prévia da imagem':'Image preview','Canvas · tons de cinza em meio-tom':'Canvas · gray tones use dithering',
'Modelo 3D · arraste para posicionar':'3D model · drag to position','Escolha um modelo 3D para começar.':'Choose a 3D model to begin.',
'Escolha uma foto primeiro':'Choose a photo first','Escolha um arquivo primeiro.':'Choose a file first.','Não há conteúdo para imprimir.':'No content to print.',
'Editor · prévia sincronizada.':'Editor · preview synchronized.','Lista · prévia sincronizada.':'List · preview synchronized.','Arquivo · prévia sincronizada.':'File · preview synchronized.',
'8 até a largura útil':'8 to usable width','320–832 pontos':'320–832 dots','0–20':'0–20','Computador · aguardando consulta':'Computer · waiting for report','Computador · prévia pronta para imprimir':'Computer · report ready to print'
};
Object.assign(dictionary,{'Lucro / hora':'Profit / hour','ATENÇÃO: este orçamento gera prejuízo.':'WARNING: this quote results in a loss.','O desconto reduziu a margem efetiva em relação à margem-alvo.':'The discount reduced the effective margin below the target margin.'});
let locale='en';try{locale=localStorage.getItem('bematech-printer-language')||'en';}catch{}
if(!['en','pt-BR'].includes(locale))locale='en';
const values=new WeakMap(),attributes=new WeakMap();
function t(text){
 if(locale==='pt-BR')return text;
 if(dictionary[text])return dictionary[text];
 const trim=text.trim();if(dictionary[trim])return text.replace(trim,dictionary[trim]);
 return text
 .replace(/^Impressora: /,'Printer: ').replace(/^Trabalho #/,'Job #').replace(/^Documento #/,'Document #').replace(/^Arquivo #/,'File #').replace(/^Cupom #/,'Receipt #').replace(/^Lista #/,'List #').replace(/^Desenho #/,'Drawing #').replace(/^Tira #/,'Strip #').replace(/^Modelo 3D #/,'3D model #').replace(/^Orçamento #/,'Quote #').replace(/^Foto #/,'Photo #')
 .replace(/^Reserva para falhas /,'Failure reserve ').replace(/^Desconto /,'Discount ').replace(/^Uso atual: /,'Current usage: ').replace(/^Núcleos lógicos: /,'Logical cores: ').replace(/^Carga 1\/5\/15 min: /,'Load 1/5/15 min: ').replace(/^Disco \/: /,'Disk /: ').replace(/^Livre no disco: /,'Free disk space: ')
 .replace(/ enviado à fila\./g,' sent to the print queue.').replace(/ enviada à fila\./g,' sent to the print queue.').replace(/ salvo no histórico\./g,' saved to history.').replace(/Calibração aplicada: /g,'Calibration applied: ')
 .replace(/ colunas · /g,' columns · ').replace(/ pontos úteis\./g,' usable dots.').replace(/ triângulos/g,' triangles').replace(/malha otimizada/g,'mesh optimized').replace(/ pontos/g,' dots')
 .replace(/pose pronta para imprimir/g,'pose ready to print').replace(/ajustando…/g,'adjusting…').replace(/enviada\. Compare o papel antes de aplicar\./g,'sent. Compare the paper before applying.')
 .replace(/Faixa atual:/g,'Current range:').replace(/A tira ainda não foi impressa\./g,'The strip has not been printed yet.').replace(/Escolha no papel ou ajuste a faixa\./g,'Choose on paper or adjust the range.')
 .replace(/^Lendo /,'Reading ').replace(/ páginas carregadas; a prévia mostra a primeira\./g,' pages loaded; preview shows the first.').replace(/ páginas rasterizadas; a prévia mostra a primeira\./g,' rasterized pages; preview shows the first.')
 .replace(/Página rasterizada (\d+) de (\d+)/g,'Rasterized page $1 of $2').replace(/página carregada/g,'page loaded').replace(/página rasterizada/g,'rasterized page').replace(/^Documento raster #/,'Raster document #').replace(/ enviado sem cortar entre páginas\./g,' sent without cuts between pages.').replace(/ cm de papel/g,' cm of paper')
 .replace(/^Informe um valor entre /,'Enter a value between ').replace(/ e (\d+)\.$/,' and $1.')
 .replace(/Configuração salva/g,'Settings saved').replace(/Impressora adicionada\./g,'Printer added.');
}
function blocked(node){
 const element=node.nodeType===1?node:node.parentElement;
 return !element||!!element.closest('script,style,.rich-editor,.paper,.file-preview,#textFileName,#listTitle,#diagRaw,#connectionStorage,#connectionDevice');
}
function apply(root=document.body){
 if(!root)return;document.documentElement.lang=locale;
 for(const option of root.querySelectorAll('option'))if(!option.hasAttribute('value'))option.setAttribute('value',option.value);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;while((node=walker.nextNode())){
  if(blocked(node))continue;
  const previous=values.get(node);let source=previous&&node.nodeValue===previous.shown?previous.source:node.nodeValue;const shown=t(source);
  values.set(node,{source,shown});if(node.nodeValue!==shown)node.nodeValue=shown;
 }
 for(const element of root.querySelectorAll('[title],[aria-label],[data-placeholder],[placeholder],option')){
  if(element.tagName==='OPTION'&&!element.hasAttribute('value'))element.setAttribute('value',element.value);
  let map=attributes.get(element);if(!map){map={};attributes.set(element,map);}
  for(const attr of ['title','aria-label','data-placeholder','placeholder']){
    if(!element.hasAttribute(attr))continue;
    const now=element.getAttribute(attr),prior=map[attr],source=prior&&prior.shown===now?prior.source:now,shown=t(source);map[attr]={source,shown};if(now!==shown)element.setAttribute(attr,shown);
  }
 }
 const select=document.getElementById('interfaceLanguage');if(select)select.value=locale;
}
let scheduled=false;
const observer=new MutationObserver(changes=>{if(!changes.some(c=>!blocked(c.target)))return;if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;observer.disconnect();apply();observer.observe(document.body,{childList:true,subtree:true,characterData:true});});}});
window.i18n={t,apply,get locale(){return locale;},set(next){locale=next==='pt-BR'?'pt-BR':'en';try{localStorage.setItem('bematech-printer-language',locale);}catch{}observer.disconnect();apply();observer.observe(document.body,{childList:true,subtree:true,characterData:true});}};
document.addEventListener('DOMContentLoaded',()=>{
 const select=document.getElementById('interfaceLanguage');if(select)select.onchange=()=>window.i18n.set(select.value);
 apply();observer.observe(document.body,{childList:true,subtree:true,characterData:true});
});
})();
