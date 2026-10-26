# Arquitetura, configuração e API

[English](../en/TECHNICAL.md)

## Fluxo

```text
Interface Windows 98 → ponte local → páginas monocromáticas → HTTP loopback
→ aplicação C → codificador ESC/Bema → transporte escolhido
```

O executável embute a interface. Toda comunicação com dispositivo e persistência
é feita pelo backend C. O navegador processa fotos, desenhos, documentos e
modelos 3D para a prévia. A demo hospedada força simulação no navegador.

## Mapa de módulos

| Arquivo | Função |
| --- | --- |
| `include/bematech.h`, `src/bematech.c` | API C, UTF-8/CP850, PBM P4 e faixas ESC/Bema de 24 pontos |
| `include/native.h` | Contratos do backend, JSON, dispositivos, diagnóstico e conversão |
| `src/main.c` | CLI, arquivos e inicialização do servidor |
| `src/app.c` | Rotas, validação, configurações, histórico, calibração e calculadora |
| `src/device.c` | Descoberta, serial Win32/POSIX, USB da classe de impressão e fila RAW |
| `src/server.c` | HTTP local, verificação Host/Origin, assets embutidos e abertura do navegador |
| `src/documents.c`, `src/process.c` | PDF/Office via Poppler/LibreOffice, temporários privados e limites de execução |
| `src/diagnostic.c` | CPU, RAM, disco, sistema e uptime em Windows/Linux/macOS |
| `third_party/cjson/` | cJSON incorporado, licença MIT |
| `web/index.html`, `styles.css`, `design.css` | Janela Windows 98, abas responsivas e prévia de papel |
| `web/app.js`, `patch.js`, `utilities.js` | Utilitários originais, testes, calibração e prévias |
| `web/editor-v2.js`, `photo-file-v2.js`, `draw-v1.js` | Editor, arquivos/foto e desenho avançados |
| `web/calculator-3d.js`, `model-3d.js`, `server-diagnostic.js` | Orçamentos, modelos 3D e relatório do computador |
| `web/local-bridge.js`, `local-documents.js`, `pdf*.mjs` | Adaptador nativo/simulação, importação web e PDF.js |
| `web/local-settings.js`, `i18n.js` | Conexão USB/Serial, exportação e tradução EN/PT-BR |
| `cmake/EmbedWeb.cmake` | Embute os assets em arrays C |
| `tests/`, `packaging/`, `.github/workflows/build.yml` | Testes, pacotes e CI |

## Configuração persistente

A primeira execução começa em simulação. O programa restaura a conexão salva
sem abrir o dispositivo; teste ou impressão faz a abertura. `--device PORTA`
sobrepõe a conexão por serial naquela execução. Comandos CLI `text` e `image`
usam seus argumentos, não as opções do perfil.

| Sistema | Arquivo padrão |
| --- | --- |
| Windows | `%APPDATA%/Bematech-Printer/settings.json` |
| macOS | `~/Library/Application Support/Bematech-Printer/settings.json` |
| Linux | `$XDG_CONFIG_HOME/bematech-printer/settings.json` ou `~/.config/bematech-printer/settings.json` |

`--config ARQUIVO` escolhe outro perfil. O JSON tem `settings`, `connection`,
`printers` personalizados, últimos 100 `quotes` e `jobs`, e contador. A gravação
usa arquivo temporário com substituição; no POSIX, permissão 0600. Perfil inválido
impede a inicialização para evitar perda silenciosa. A demo guarda ajustes e
histórico no localStorage; texto, foto, desenho e malha não são salvos automaticamente.

| Ajuste | Padrão | Limites |
| --- | --- | --- |
| `cols_a`, `cols_b` | 48, 64 | 20–80, 30–120 |
| `dots`, `image_width` | 576, 576 | 320–832, 8–832; largura ≤ dots |
| `line_spacing` | 17 | 1–60 |
| `default_feed` | 3 | 0–20 |
| `auto_cut`, `italic`, `raster_fallback` | 1 | 0/1 |
| `condensed_esc` | 0 | 0/1 |

A conexão aceita `simulation`, `serial`, `usb` e `system`. Serial usa velocidades
1200/2400/4800/9600/19200/38400/57600/115200, 7/8 bits, paridade nenhuma/par/
ímpar e 1/2 bits de parada. Padrão: 9600 8N1. USB CDC usa serial; `/dev/usb/lpN`
serve para USB da classe de impressão no Linux; Windows/macOS podem usar fila RAW
instalada. Não há driver libusb bulk genérico.

## CLI

`bematech-printer [serve|text ARQUIVO|image ARQUIVO] [opções]`

| Opção | Efeito |
| --- | --- |
| `--device PORTA` | Seleção serial explícita; CLI exige dispositivo ou exportação |
| `--config ARQUIVO` | Perfil do servidor local |
| `--output ARQUIVO` | Exporta bytes ESC/Bema em vez de imprimir |
| `--port N` | 8421 por padrão; 1024–65535, somente IPv4 loopback |
| `--columns N` | 48 por padrão; 20–80 |
| `--dots N` | 576 por padrão; 320–832 |
| `--spacing N` | 17 por padrão; 1–60 |
| `--feed N` | 3 por padrão; 0–20 |
| `--no-cut`, `--no-open` | Desativa corte ou abertura do navegador |
| `--help`, `--version` | Ajuda e versão |

Saídas: 0 sucesso, 1 I/O/codificação, 2 argumentos inválidos.

## API HTTP

Todas as rotas usam Host `127.0.0.1:PORTA`. POST precisa de Content-Length e
`X-Bematech-Client: 1`; Origin, quando enviado, deve corresponder ao endereço
local. Sem CORS, contas ou corpo chunked. Respostas JSON, salvo CSV.

| Método/rota | Corpo ou retorno |
| --- | --- |
| GET `/api/info`, `/api/status` | Versão/modo/ajustes básicos; dispositivo configurado e estado |
| GET/POST `/api/settings` | Lê ou mescla ajustes inteiros validados; POST retorna `{ok,settings}` |
| GET/POST `/api/connection` | Lê ou substitui conexão; GET informa caminho do perfil |
| GET `/api/devices` | Lista `{transport,device,label}`; sem imprimir |
| POST `/api/connection/test` | Abre a conexão atual sem imprimir |
| GET `/api/jobs` | Últimos 20 trabalhos, mais recentes primeiro |
| GET `/api/server-diagnostic` | SO, uptime, CPU, RAM e disco |
| GET/POST `/api/calculator/printers` | Impressoras 3D embutidas/personalizadas |
| POST `/api/calculator/quotes` | Salva `{data,result}` do orçamento |
| GET `/api/calculator/history`, `/api/calculator/history.csv` | Últimos 100 orçamentos; CSV UTF-8 com proteção contra fórmulas |
| POST `/api/document/read` | `{filename,data_base64,mode:"text"|"raster"}` → páginas |
| POST `/api/print/document`, `/api/print/list-rich` | Páginas bitmap; o adaptador web converte HTML rico/lista |
| POST `/api/print/image`, `/api/print/images` | Uma ou várias imagens, avanço e corte |
| POST `/api/print/text`, `/api/print/raw` | Texto CP850 ou bytes ESC/Bema em Base64 |
| POST `/api/print/test-page`, `/api/print/probe` | Página de teste e prova gráfica |
| POST `/api/calibration/print`, `/api/calibration/apply` | Tira candidata e aplicação do valor medido |
| POST `/api/feed`, `/api/cut` | Avanço/corte |
| POST `/api/print`, `/api/text` | Compatibilidade: PBM P4 ou UTF-8 bruto |

Bitmap JSON: `width`, `height`, `data_base64`, `packing:"row"|"continuous"`.
No formato row há `ceil(width/8)` bytes por linha, bits mais significativos
primeiro; continuous não preenche o fim da linha. Pixels pretos valem 1.
Imagens menores são centralizadas nos `dots` configurados. A impressão retorna
HTTP 202 `{id,status,bytes}`; `sent` indica envio de bytes, não garante papel.

```sh
curl http://127.0.0.1:8421/api/info
curl --fail http://127.0.0.1:8421/api/print/text \
  -H 'X-Bematech-Client: 1' -H 'Content-Type: application/json' \
  --data '{"text":"Olá","feed":3,"cut":true}'
```

## Protocolo e limites

`bp_defaults`, `bp_append`/`bp_free`, `bp_text`, `bp_bitmap` e `bp_pbm` compõem
o motor público. Bytes: ESC @, ESC t 02 (CP850), ESC 3 n, ESC * 33 nL nH
(com três bytes por coluna), ESC 2 e ESC w 00 (corte). Erro do codificador
exige descarte do buffer parcial.

Cabeçalhos HTTP até 16 KiB; requisição total até 16 MiB; trabalho codificado
até 4 MiB; bitmap até 6000 linhas e largura ≤ `dots`; até 100 páginas por
trabalho. Arquivos PDF/Office até 10 MB, 100 páginas em texto ou 50 em raster.
O subprocesso de conversão tem timeout e os temporários são apagados.
Impressões deste processo são sequenciais. Outro processo concorrente ainda
pode disputar o mesmo dispositivo. A proteção loopback não bloqueia programas
maliciosos executados neste computador.
