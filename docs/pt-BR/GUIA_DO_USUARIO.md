# Instalação e guia completo

[English](../en/USER_GUIDE.md) · [Português](GUIA_DO_USUARIO.md)

## Instalar e abrir

| Plataforma | Pacote | Abertura |
| --- | --- | --- |
| Windows x86-64 | Instalador NSIS ou ZIP | Menu Iniciar ou bin/bematech-printer.exe |
| Linux x86-64 | DEB, AppImage ou ZIP | Menu ou terminal |
| macOS Intel/Apple silicon | DMG ou ZIP | Arraste .app para Aplicativos e abra |

Escolha a arquitetura correta. Windows não possui certificado público de
assinatura; macOS usa assinatura ad-hoc, sem notarização. Siga a política do
sistema ou compile a fonte.

~~~sh
# Debian/Ubuntu
sudo apt install ./*bematech-printer*.deb
bematech-printer
# AppImage
chmod +x bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage
./bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage
# Sem FUSE
./bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage --appimage-extract-and-run
~~~

O executável abre http://127.0.0.1:8421. Mantenha-o em execução enquanto usa
a interface. Ctrl+C encerra a sessão do terminal; no macOS, também é possível
encerrar no Monitor de Atividade. Fechar o navegador não encerra o servidor C.
Use --port 8425 para outra instância.

No Windows, abra PowerShell no diretório bin/ extraído. No macOS instalado:

~~~sh
"/Applications/Bematech Printer.app/Contents/MacOS/bematech-printer" --help
~~~

## Configurar USB/Serial

Abra **Conexão**, que substitui a ação de autenticação do serviço original.

| Transporte | Dispositivo | Uso |
| --- | --- | --- |
| Simulação | Nenhum | Experimentar sem abrir equipamento |
| Serial / USB CDC | COM3, /dev/ttyACM0, /dev/ttyUSB0, /dev/cu.usbmodem… | MP-4200 como serial virtual |
| USB | /dev/usb/lpN no Linux; fila USB instalada no Windows | Classe USB de impressão |
| Fila RAW do sistema | Nome da impressora instalada | Spooler Windows ou CUPS Unix/macOS |

Detecte dispositivos ou informe a porta/fila. Configure e salve. **Salvar e
testar conexão** abre o dispositivo sem imprimir; não certifica papel/tampa.
A demo nunca abre USB/serial.

Padrões: 9600 baud, 8 bits, sem paridade, 1 parada. Velocidades: 1200, 2400,
4800, 9600, 19200, 38400, 57600, 115200. Dados: 7/8. Paridade: nenhuma/par/ímpar.
Parada: 1/2. Os controles seriais não se aplicam às filas RAW.

USB CDC usa transporte serial apesar do cabo USB. Fila Windows requer
impressora/porta instaladas. CUPS deve encaminhar bytes RAW, sem renderizar
o trabalho. Configure o equipamento em ESC/Bema.

No Linux, use o grupo de acesso apropriado (normalmente dialout ou lp), saia e
entre após alterar o grupo. Não deixe o dispositivo gravável por qualquer
usuário. Prefira /dev/serial/by-id/ quando disponível. Use um processo por
impressora física.

## Editor e prévia

Selecione texto para negrito, itálico e sublinhado. Use alinhamento, expandido
e condensado. A compatibilidade do condensado é controlada em Ajustes.
Editor rico, quebra por colunas, papel, zoom e divisor redimensionável originais
foram preservados.

48 colunas normais e 64 condensadas são pontos de partida. Calibre a unidade.
A web rasteriza caracteres fora de CP850 conforme as fontes do navegador.
O C converte o bitmap em comandos gráficos; a CLI também possui texto CP850
direto. Configure corte e avanço no rodapé da prévia.

## Lista

Informe título e itens ricos, um por linha. Data/hora, marcadores e recuos são
automáticos. Os estilos internos são preservados na impressão/exportação.

## Arquivo, PDF e Office

Mantém numeração, cabeçalho, condensada, corte por página ou impressão contínua,
e intervalo entre páginas. Texto/código é lido no navegador, preservando linhas
vazias e contador global.

| Ambiente | PDF | Office |
| --- | --- | --- |
| App C | Poppler: texto/raster | LibreOffice → PDF → Poppler |
| Demo/navegador estático | PDF.js embutido | Extração XML de Office moderno; raster por texto |

Os auxiliares nativos opcionais devem estar disponíveis como pdfinfo,
pdftotext, pdftoppm e libreoffice. O caminho padrão Program Files do LibreOffice
também é reconhecido no Windows. Não são pacotes Python.
Debian/Ubuntu fornece Poppler em poppler-utils; instale também LibreOffice.
No macOS, use sua instalação preferida de Poppler/LibreOffice. Coloque os
executáveis no PATH antes de iniciar o app.

Office nativo: DOC, DOCX, ODT, RTF, PPT, PPTX, XLS e XLSX. No navegador:
DOCX, ODT, PPTX, XLSX e RTF. DOC/PPT/XLS binários precisam do app nativo ou
exportação prévia para PDF/formato moderno. O raster Office da demo não
reproduz todo o layout do LibreOffice.

Limites: 10 MB; 100 páginas de texto ou 50 raster. Texto nativo é limitado a
20.000 caracteres por página. Raster é recortado, redimensionado, realçado
e convertido com altura máxima de 2.000 pixels. Arquivos nativos temporários
são removidos ao concluir; a demo não faz upload.

## Foto

Mantém largura útil, auto-níveis, ajuste automático, predefinições Foto térmica/
Documento/Logo-QR/Foto escura, brilho -1..1, contraste .2..4, gama .2..4,
limiar 0..255, Atkinson/Floyd/Bayer/limiar puro, inversão, rotação, ampliação
de pixels e Game Boy Camera.

Escolha uma imagem suportada pelo navegador. A origem fica na memória; somente
o bitmap monocromático segue para o C. Para QR e logos, prefira limiar puro
quando a nitidez das bordas for essencial.

## Desenho

Pincel, sombra, balde, borracha, seleção retangular/livre e exclusão da área
selecionada são os originais. Há tamanhos fino/médio/grosso, tons de cinza,
opacidade, pressão contínua, proporção, orientação e desfazer/refazer.

Use mouse, caneta ou toque. Cinzas viram pontilhamento térmico. Alterar
proporção/orientação reinicia o histórico do canvas, como no aplicativo original.

## Calculadora 3D completa

Mantém todos os campos originais:

1. Material, preço do rolo, peso do slicer, quantidade e purga/perda.
2. Catálogo/cadastro de impressoras, potência média, tempo e tarifa.
3. Depreciação, valor da impressora, vida útil e residual.
4. Trabalho manual, embalagem, extras e reserva para falhas.
5. Taxa de pagamento, margem real, desconto, mínimo e arredondamento.
6. Cupom detalhado ou versão para cliente, histórico e CSV.

Tempo aceita decimal, 06:30 ou 6h30. Tarifa e consumos são referências editáveis;
use custo efetivo e potência média medida. Valores permanecem em reais.

~~~text
peso faturado = peso × (1 + perda/100)
energia = watts/1000 × horas × tarifa
depreciação/hora = valor × (1 - residual/100) / vida útil
operacional = material + energia + máquina + trabalho + embalagem + extras
custo total = operacional × (1 + reserva/100)
tabela = max(custo / (1 - margem/100 - taxa/100), mínimo)
final = tabela × (1 - desconto/100)
lucro = final × (1 - taxa/100) - custo
~~~

Margem + taxa deve ser menor que 100%. Desconto muda a margem efetiva.
Arredondamento comercial aparece separadamente. O histórico guarda os últimos
100 orçamentos; o CSV mantém as colunas originais e bloqueia fórmulas de planilha.

## Visualizar e imprimir modelos 3D

Abra STL ASCII/binário, OBJ, 3MF ou FBX ASCII. O modelo fica no navegador.
O parser original normaliza/otimiza a malha; arquivos têm limite de 30 MB,
com até 35.000 triângulos renderizados após redução.

- Arrastar: orbitar. Alt + arrastar: rotação Z. Botão direito/Shift: mover.
- Roda ou campo numérico: zoom até 4×.
- Posição/rotação por campos ou cubo de orientação.
- Eixo UP de origem ±X/±Y/±Z; perspectiva ou ortogonal; reenquadrar.
- Fosco, metálico, reflexivo, CAD, wireframe, arestas, arestas sólidas e Custom.
- Luz, chão/sombra, brilho, contraste, gama, limiar e pontilhamento.
- Custom: cinza, roughness, metallic, smoothness e material iluminado.
- Multiplicador de resolução para o efeito de pixelização original.

Imprimir envia a imagem térmica da pose, não G-code nem um objeto 3D físico.
A compactação 3MF depende do navegador. Converta FBX binário para ASCII FBX,
STL ou OBJ se não for aceito.

## Diagnóstico, calibração e exportação

Computador mostra relatório local imprimível de sistema, CPU, RAM, disco e
uptime. Na demo, os dados de hardware são exemplos identificados.

Testes oferece status, página de fontes/acentos, gráfico, avanço, corte, histórico,
RAW e calibração. O assistente calibra colunas normal/condensada, largura e
espaçamento: desloque/refine a faixa, imprima, confira e aplique o escolhido
ou um valor manual. Aplicação manual pede confirmação. Ajustes expõe os dez
valores de papel/compatibilidade descritos no guia técnico.

Exporte PNG, PBM P4 ou bytes ESC/Bema. Sucesso na serial confirma entrega dos
bytes; não confirma papel sem atolamento. Confira o resultado incerto antes
de emitir segunda via.

## Persistência e problemas

Perfil nativo guarda ajustes, conexão, catálogo, orçamentos e trabalhos.
Conteúdo em edição/foto/modelo/desenho fica na página: exporte antes de
recarregar. A demo guarda ajustes/catálogo/histórico no local storage; limpar
os dados do site os remove.

| Problema | Verifique |
| --- | --- |
| Porta HTTP ocupada | Outra instância ou --port |
| Falha de impressão | Porta/fila, cabo, permissões e concorrência |
| Comandos saem escritos | Modo ESC/Bema |
| Faixas brancas | Calibração do espaçamento |
| PDF/Office nativo falha | Auxiliares e PATH |
| Layout Office diferente na demo | App nativo/LibreOffice ou exportar PDF |
| CLI recusa Unicode | Caminho bitmap web ou texto compatível com CP850 |
| Não salva ajustes | Permissão/espaço/validade do perfil |
| Web sem conexão | Executável aberto e URL 127.0.0.1 exata |
