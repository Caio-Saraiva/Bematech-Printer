# Instalar e usar

[English](../en/USER_GUIDE.md) · [Português](GUIA_DO_USUARIO.md)

## Instalação por plataforma

| Sistema | Pacote | Como abrir |
| --- | --- | --- |
| Windows x86-64 | Instalador NSIS (.exe) ou ZIP portátil | Atalho do menu Iniciar ou bin/bematech-printer.exe |
| Linux x86-64 | Debian .deb, AppImage ou ZIP | Menu de aplicativos ou terminal |
| macOS Apple silicon / Intel | DMG com .app ou ZIP | Abra o app ou execute pelo Terminal |

Escolha a arquitetura do seu computador. A versão inicial não possui
certificado público de assinatura do Windows nem notarização Apple. O app
macOS recebe assinatura ad-hoc de integridade. Siga a política do seu sistema
para programas compilados localmente; também é possível compilar a fonte.

Debian/Ubuntu:

~~~sh
sudo apt install ./*bematech-printer*.deb
bematech-printer
~~~

AppImage:

~~~sh
chmod +x bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage
./bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage
# Se não houver FUSE:
./bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage --appimage-extract-and-run
~~~

A interface está embutida no executável. Mantenha o programa aberto enquanto
usa o estúdio. Ctrl+C encerra uma execução pelo terminal. No macOS, o Monitor
de Atividade permite encerrar um app iniciado sem terminal. Para outra instância,
use uma porta diferente, por exemplo --port 8425.

No DMG macOS, arraste o app para Aplicativos. Para escolher a impressora real,
execute o binário embutido pelo Terminal:

~~~sh
"/Applications/Bematech Printer.app/Contents/MacOS/bematech-printer" serve --device /dev/cu.usbmodem1234
~~~

Nos ZIPs, o executável fica no diretório bin/ extraído. No Windows, abra o
PowerShell nesse diretório antes de usar .\bematech-printer.exe. No AppImage,
adicione --device PORTA ao próprio comando do AppImage.

## Primeira execução: simulação

Sem --device, o aplicativo abre http://127.0.0.1:8421 em SIMULAÇÃO.
Experimente as ferramentas, use Simular impressão, confira o histórico da
sessão e salve um PNG. Nenhuma porta serial é aberta nesse modo.

Para uma prévia web estritamente local, sirva web/ com um servidor estático.
Exemplo opcional para quem já tem Python:

~~~sh
python3 -m http.server 8422 --bind 127.0.0.1 --directory web
~~~

Esse modo estático permite prévia/exportação. A impressão real precisa do
executável C. A demo hospedada funciona inteiramente no navegador e possui um
wrapper separado que desativa a procura pela API local.

## Conectar a MP-4200 TH

1. Ligue a impressora, conecte USB, coloque papel e feche a tampa.
2. Identifique a serial CDC: Gerenciador de Dispositivos → Portas no Windows;
   /dev/ttyACM* ou /dev/serial/by-id/ no Linux; /dev/cu.usbmodem* no macOS.
3. Encerre a simulação e inicie com a porta:

~~~sh
# Linux
bematech-printer serve --device /dev/ttyACM0
# macOS: substitua a porta
bematech-printer serve --device /dev/cu.usbmodem1234
# PowerShell
.\bematech-printer.exe serve --device COM3
~~~

SERIAL ATIVA indica que uma porta foi configurada ao iniciar; não é uma
consulta física de papel/tampa. Imprima algo curto e confira o dialeto
ESC/Bema. Use apenas um programa por porta.

No Linux, permita acesso ao grupo da serial, normalmente dialout. Depois de
adicionar o usuário ao grupo, saia e entre na sessão. Não use permissão global
de escrita no dispositivo. /dev/serial/by-id/ pode oferecer um nome estável
quando o número ttyACM muda ao reconectar.

## Estúdio de texto

Digite ou importe TXT, Markdown, CSV e LOG em UTF-8. A leitura é texto puro.
Escolha tamanho normal/grande e alinhamento. A primeira linha recebe destaque;
as outras preservam as quebras explícitas e quebram por contagem de caracteres.

O navegador desenha o texto como bitmap usando fonte monoespaçada. Os glifos
dependem das fontes do sistema; emoji/CJK podem faltar. PNG e PBM preservam
exatamente o bitmap gerado. Limites: 16.000 caracteres, importação de 64 KB e
recibo de 6.000 linhas de pixels. Divida documentos extensos em vários trabalhos.

## Listas e notas

Informe o título e um item por linha. Linhas vazias são ignoradas. Marcadores e
recuos de continuação são automáticos. Use para compras, separação ou tarefas.

## Laboratório de imagem

Escolha PNG, JPEG ou WebP de até 10 MB e 32 megapixels. A imagem fica no
navegador; áreas transparentes são compostas sobre branco.

| Controle | Efeito |
| --- | --- |
| Atkinson | Pontilhamento contrastado, apropriado ao papel térmico |
| Floyd–Steinberg | Propaga erro e preserva mais gradações |
| Bayer 4×4 | Padrão regular ordenado |
| Limiar | Conversão direta preto/branco |
| Largura | Total, 75% ou 50% da cabeça configurada, centralizada |
| Brilho | Deslocamento de -100 a +100 |
| Contraste | Escala entre 0,25 e 2,5 |
| Girar | Rotação de 90 graus |

Carregar arte de teste gera uma paisagem original no próprio navegador.
A altura raster é limitada a 1.800 pixels antes das margens. Imagens muito
altas são ajustadas a esse limite; recorte a origem para preservar a proporção.

## Prancheta

Desenhe com mouse, caneta ou dedo. O pincel varia de 1 a 24 pixels da superfície
original. A borracha pinta branco. Desfazer recupera até 12 estados anteriores.
Limpar também salva um estado antes de apagar. O desenho por toque fica dentro
da superfície, sem arrastar a página.

## Calculadora de impressão 3D

Use a mesma moeda em todos os campos. Informe peso, preço por kg, perda,
duração, potência média, tarifa por kWh e trabalho/extras. Potência máxima
nominal não equivale ao consumo médio durante a impressão.

~~~text
material = gramas / 1000 × preço_kg × (1 + perda / 100)
energia  = horas × watts_médios / 1000 × tarifa_kWh
custo    = material + energia + extras
preço    = custo / (1 - margem / 100)
~~~

Margem de 30% é uma fração do preço de venda. Para custo 10, o preço é 14,29,
não 13. Use extras para depreciação, embalagem, trabalho e outros custos.
Impostos, taxas, desconto e reserva de falhas não são campos independentes:
incorpore-os deliberadamente ao seu modelo. Nenhuma tarifa é consultada na
internet; nenhum orçamento fica no servidor.

## Calibração

Imprima a folha e confira margens e continuidade das faixas de 24 pontos.
Reinicie com --dots e --spacing ajustados. --columns define a quebra do texto
simples. A medida na tela não determina a largura física da cabeça térmica.

## Exportação e histórico

- PNG: prévia monocromática exata.
- PBM: P4 binário, bits MSB, linhas alinhadas a bytes; 1 significa preto.
  Pode ser reimpresso com o comando image.
- ESC/Bema: trabalho completo com inicialização, faixas, avanço e corte.
  É binário específico da impressora, não um arquivo de imagem.

O histórico fica em memória e mostra os últimos cinco itens e o contador total.
Recarregar elimina conteúdo e histórico; exporte o que quiser guardar.
Sucesso na serial confirma entrega dos bytes, não papel sem atolamento.
Evite repetição automática se o resultado físico estiver incerto.

## Solução de problemas

| Sintoma | Verificação |
| --- | --- |
| Porta HTTP ocupada | Encerre a outra instância ou escolha --port |
| Navegador sem acesso | Mantenha o executável aberto e use a URL 127.0.0.1 exata |
| Erro de serial/permissão | Nome da porta, cabo, grupo de acesso e outros programas |
| Comandos saem escritos | Dialeto incorreto: a implementação requer ESC/Bema |
| Listras brancas | Ajuste --spacing depois do teste físico |
| CLI recusa caracteres | CLI aceita somente Unicode representável em CP850; use o bitmap web para outros |
| Apenas prévia no navegador | Reinicie o executável e abra a URL impressa por ele |
| Conteúdo desaparece | Operação em memória; salve antes de recarregar |
