# Arquitetura nativa, módulos, ajustes e API

[English](../en/TECHNICAL.md) · [Português](TECNICO.md)

## Fluxo

~~~text
Interface Windows 98 original
  → linhas ricas normalizadas ou bitmaps monocromáticos
  → HTTP no loopback
  → C: validação, perfil, CP850/estilos ou fallback raster
  → ESC/Bema por serial, USB de impressão ou fila RAW
~~~

Interface e algoritmos dos utilitários continuam HTML/CSS/JavaScript.
Backend e acesso ao dispositivo são C99, sem Python, usuários ou autenticação.
A demo não tem processo nativo e não descobre/abre impressora.

## Módulos

| Arquivo | Responsabilidade |
| --- | --- |
| include/bematech.h | API C de buffers, opções, CP850, texto, bitmap/PBM e servidor |
| include/native.h | Estado/API interna, transporte, processos e diagnósticos |
| src/bematech.c | UTF-8, CP850, limites, quebra de texto e faixas ESC-star |
| src/app.c | Perfil, validação, API, texto rico, calibração, histórico, base64 e CSV |
| src/server.c | HTTP loopback, Host/Origin, assets e despacho síncrono |
| src/device.c | Enumeração, parâmetros seriais, USB direto, spooler RAW e CUPS |
| src/process.c | Execução/timeout de auxiliares nativos sem interpolação de shell |
| src/documents.c | PDF/Office temporário, limites, PGM, recorte, escala, realce e limpeza |
| src/diagnostic.c | Métricas Windows/Linux/macOS |
| src/main.c | CLI, argumentos, arquivos e exportação |
| third_party/cjson | Parser cJSON 1.7.19, MIT |
| cmake/EmbedWeb.cmake | Embute a interface e bibliotecas em arrays C |
| web/app.js | Estado comum e processamento original de texto/foto |
| web/patch.js | Calibração por faixas e ajustes originais |
| web/utilities.js | Lista/arquivo, testes, diagnóstico e RAW |
| web/editor-v2.js | Prévia por colunas, estilos, papel físico, divisor e zoom |
| web/photo-file-v2.js | Importação, páginas, presets e auto-ajuste |
| web/draw-v1.js | Desenho, pressão, balde, seleção e histórico |
| web/calculator-3d.js | Calculadora original completa e seus cupons |
| web/model-3d.js | Visualizador original sem alterações, parsers, materiais e saída térmica |
| web/server-diagnostic.js | Relatório imprimível adaptado ao computador local |
| web/local-bridge.js | Ponte C, linhas ricas, raster fallback, simulação e exportação |
| web/local-documents.js | PDF.js e extração Office no navegador |
| web/local-settings.js | Configurador USB/Serial e inicialização |
| web/i18n.js | Inglês principal e PT-BR |
| web/styles.css e design.css | Estética Windows 98 original |
| Demais CSS originais | Layouts de papel e de cada utilitário |
| web/local-settings.css | Adições de conexão/idioma/responsividade |
| web/pdf*.mjs | PDF.js e worker locais, Apache-2.0 |
| tests/ | Contratos C, integração, serial virtual e fixtures |
| packaging/ e tools/ | Pacotes, lançadores e checksums |

## Perfil local

| Sistema | Local |
| --- | --- |
| Windows | %APPDATA%/Bematech-Printer/settings.json |
| macOS | ~/Library/Application Support/Bematech-Printer/settings.json |
| Linux | $XDG_CONFIG_HOME/bematech-printer/settings.json ou ~/.config/bematech-printer/settings.json |

--config escolhe outro arquivo. O perfil contém ajustes, conexão, impressoras
cadastradas, 100 orçamentos, 100 metadados de trabalhos e contador de IDs.
A API recente retorna 20 trabalhos. Fotos, modelos e editor não são guardados.

A gravação usa arquivo temporário/substituição e permissões privadas POSIX.
Arquivo inválido existente não é sobrescrito silenciosamente. Faça backup do
perfil para preservar o histórico. A demo guarda dados separados por origem
no armazenamento do navegador.

## Todos os ajustes

| Chave | Padrão | Limite/efeito |
| --- | ---: | --- |
| cols_a | 48 | 20–80 colunas normais |
| cols_b | 64 | 30–120 condensadas |
| dots | 576 | 320–832 pontos úteis |
| image_width | 576 | 8..dots |
| line_spacing | 17 | 1–60, ESC 3 |
| default_feed | 3 | 0–20 linhas |
| auto_cut | 1 | Corte padrão 0/1 |
| italic | 1 | Permite ESC 4/5 0/1 |
| condensed_esc | 0 | Permite ESC M 0/1 |
| raster_fallback | 1 | Fallback para Unicode fora de CP850 0/1 |

Requisições ricas enviam linhas com estilos e páginas de fallback. O C emite
texto/estilos nativos quando possível. Unicode incompatível usa o raster quando
habilitado; sem fallback, caracteres não representáveis são substituídos.
Ferramentas de imagem sempre usam gráficos. Expandido/condensado respeitam a
mesma contagem efetiva de colunas da interface.

## Conexão

transport aceita simulation, serial, usb ou system. device identifica a porta
ou fila. Campos seriais: baud, data_bits, parity e stop_bits. Padrão 9600/8/
none/1, sem controle de fluxo. As velocidades aceitas estão no guia do usuário.

Windows usa CreateFile/DCB/WriteFile/FlushFileBuffers para serial, com timeout
de escrita de 15 segundos; filas usam OpenPrinter/StartDocPrinter em RAW.
POSIX usa termios bruto e tcdrain. USB Linux escreve /dev/usb/lpN. Filas
Unix/macOS usam lp -d NOME -o raw.

Listar dispositivos não imprime. Testar conexão abre o alvo sem bytes de
trabalho. Configurado/conectado não equivale a confirmação física de papel.

## CLI

Comandos: serve (padrão), text ARQUIVO e image ARQUIVO.

| Opção | Efeito |
| --- | --- |
| --device PORTA | Seleção serial explícita |
| --config ARQUIVO | Perfil |
| --output ARQUIVO | Exportação CLI sem dispositivo |
| --port N | 1024–65535; padrão 8421 |
| --columns N | 20–80; padrão 48 |
| --dots N | 320–832; padrão 576 |
| --spacing N | 1–60; padrão 17 |
| --feed N | 0–20; padrão 3 |
| --no-cut | Sem corte |
| --no-open | Sem abertura automática do navegador |
| --help / --version | Informações |

Argumentos explícitos de serve prevalecem sobre os valores correspondentes do
perfil naquele processo. A UI pode persistir os ajustes ativos. Impressão CLI
exige --device ou --output. Saída 0: sucesso; 1: I/O/codificação; 2: argumentos.

## ESC/Bema

Inicialização ESC @; CP850 ESC t 02; negrito ESC E/F; itálico ESC 4/5;
sublinhado ESC - n; alinhamento ESC a n; expandido SO/DC4; condensado ESC M n;
espaçamento ESC 3 n e restauração ESC 2; gráfico ESC * 33 nL nH; corte ESC w 00.

PBM P4 usa linhas alinhadas a byte, MSB primeiro, 1=preto. JSON aceita
empacotamento contínuo original ou packing:"row". C trata padding, centraliza
imagens web menores e transpõe para faixas verticais de 24 pontos. A última
faixa recebe zeros. Não misture ESC/POS.

bp_cp850 diferencia UTF-8 inválido de Unicode não representável. Erros podem
deixar bytes parciais: descarte com bp_free em vez de enviá-los.

## API

Sem login/token. POST exige X-Bematech-Client: 1, Content-Length, Host exato e
Origin correspondente se presente. Não oferece CORS.

| Rota | Função |
| --- | --- |
| GET /api/info | Versão, modo e opções |
| GET/POST /api/settings | Ajustes |
| GET/POST /api/connection | Transporte/porta/parâmetros |
| GET /api/devices | Dispositivos/filas |
| POST /api/connection/test | Verifica acesso sem imprimir |
| GET /api/status | Estado da configuração |
| GET /api/jobs | Últimos 20 trabalhos |
| GET /api/server-diagnostic | Métricas locais |
| GET/POST /api/calculator/printers | Catálogo |
| POST /api/calculator/quotes | Salva data/result |
| GET /api/calculator/history | 100 orçamentos |
| GET /api/calculator/history.csv | CSV original com proteção contra fórmulas |
| POST /api/document/read | filename, data_base64, mode |
| POST /api/print | Corpo P4 bruto |
| POST /api/text | Corpo UTF-8 bruto |
| POST /api/print/text | Texto JSON |
| POST /api/print/document e list-rich | rich_lines e/ou pages, corte/avanço |
| POST /api/print/image e images | Bitmaps, intervalo e acabamento |
| POST /api/print/test-page e probe | Diagnóstico de impressão |
| POST /api/calibration/print e apply | Faixa e valor escolhido |
| POST /api/feed, cut, print/raw | Avanço, corte e bytes explícitos |

A ponte web prepara rich_lines/pages; a API não é um renderizador HTML remoto.
200: consulta/ajuste; 201: dado criado; 202: enviado/simulado.
Erros JSON error usam 400/403/404/500. Sent confirma entrega de bytes, não papel.

## Limites e operação

Cabeçalhos 16 KiB; buffer HTTP 16 MiB; trabalho 4 MiB; imagem até dots×6000;
orçamento 80 KB; documento 10 MB e 100 páginas texto/50 raster.
Conversores têm timeout e diretório temporário privado. Requisições e trabalhos
são síncronos.

Não há transação física idempotente: evite repetir automaticamente uma resposta
perdida. Host/Origin reduzem abuso pelo navegador, sem proteger contra software
local malicioso. Quem publicar acesso remoto precisa projetar sua segurança.

Referências: [cJSON](https://github.com/DaveGamble/cJSON),
[PDF.js](https://github.com/mozilla/pdf.js),
[Win32](https://learn.microsoft.com/en-us/windows/win32/printdocs/writeprinter),
[AppDir](https://docs.appimage.org/reference/appdir.html).
