# Arquitetura, configuração e API

[English](../en/TECHNICAL.md) · [Português](TECNICO.md)

## Fluxo

~~~text
Estúdio HTML/CSS/JS → canvas → limiar/pontilhamento → PBM P4
  → POST /api/print no loopback
  → parser C → faixas ESC * de 24 pontos → serial
~~~

A CLI usa o motor diretamente: text converte UTF-8/CP850, image usa o parser
P4. --output grava bytes sem abrir dispositivo. A demo hospedada não possui
processo C nem ponte de impressão.

## Módulos

| Arquivo | Função |
| --- | --- |
| include/bematech.h | API pública C, opções, buffers, versão e limite de trabalho |
| src/bematech.c | Buffer limitado, validação, UTF-8 estrito, tabela CP850, quebra de texto, parser P4 e comandos ESC/Bema |
| src/transport.c | Serial Win32 COM ou POSIX termios |
| src/server.c | HTTP síncrono limitado, assets explícitos, verificação local e abertura do navegador |
| src/main.c | CLI, leitura de arquivo, exportação e despacho |
| web/index.html | Painéis, navegação, controles e prévia semântica |
| web/style.css | Aparência e comportamento responsivo |
| web/app.js | Traduções, canvas, imagens, desenho, fórmulas, exportação e estado da sessão |
| web/icon.svg | Ícone original |
| cmake/EmbedWeb.cmake | Embute assets em arrays C durante a compilação |
| tests/test_core.c | Contratos de bytes e rejeição de entradas |
| tests/test_integration.py | Processo, HTTP, CLI e serial virtual POSIX |
| packaging/ | Lançadores, desktop entry, AppImage e metadados macOS |
| .github/workflows/build.yml | Matriz nativa e releases |
| tools/checksums.py | Manifesto SHA-256 de pacotes |
| docs/ | Documentação em inglês e português e capturas reais |

A biblioteca CMake bematech contém o motor. O executável adiciona servidor e
transporte. web_assets.h é gerado dentro de build/; alterar web/ provoca
regeneração e relink.

## Todas as opções CLI

Não há arquivo de configuração, banco, parser de ambiente ou serviço do sistema.
Os comandos são serve (padrão), text ARQUIVO e image ARQUIVO.

| Opção | Padrão | Limite e efeito |
| --- | --- | --- |
| --device PORTA | ausente | Sem porta, serve simula; CLI exige porta ou --output |
| --output ARQUIVO | ausente | Exporta bytes CLI, prevalece sobre dispositivo; não vale em serve |
| --port N | 8421 | 1024–65535, somente IPv4 loopback |
| --columns N | 48 | 20–120 caracteres por linha de texto simples |
| --dots N | 576 | 320–832 pontos úteis |
| --spacing N | 17 | 1–60, espaçamento ESC 3 |
| --feed N | 3 | 0–20 quebras de linha finais |
| --no-cut | desligado | Desativa ESC w 00 |
| --no-open | desligado | Não abre navegador |
| --help | — | Mostra ajuda sem abrir dispositivo |
| --version | — | Mostra versão |

Os argumentos são validados antes de I/O. Código de saída 0: sucesso; 1:
falha de I/O/codificação; 2: argumentos inválidos. As opções nativas são
consultadas em /api/info e não podem ser alteradas por API.

## API C

bp_defaults fornece padrões; bp_append e bp_free gerenciam buffers limitados.
bp_text converte texto, bp_bitmap transpõe pixels, bp_pbm interpreta P4,
bp_send escreve/drena a serial e bp_serve inicia o app.

Os codificadores retornam 0 ou -1. Falhas podem deixar bytes parciais no buffer:
descarte-os com bp_free e não os envie. Texto deve terminar em NUL; bitmaps
usam tamanho explícito.

## Protocolo de impressão

| Operação | Comando |
| --- | --- |
| Inicializar | ESC @ |
| CP850 | ESC t 02 |
| Espaçamento gráfico | ESC 3 n |
| Faixa de 24 pontos | ESC * 33 nL nH e três bytes por coluna |
| Restaurar espaçamento de texto | ESC 2 |
| Corte total | ESC w 00 |

P4 possui ceil(largura/8) bytes por linha, MSB primeiro, 1=preto. Os bits finais
de preenchimento são ignorados. O motor transpõe para colunas de 24 pixels e
preenche a última faixa com zeros.

Windows usa CreateFileA, DCB, 9600/8N1, sem controle de fluxo, timeout de escrita
de 15 segundos, WriteFile e FlushFileBuffers. POSIX usa termios em modo bruto,
9600/8N1, sem HUPCL e tcdrain antes de fechar. Há uma pequena pausa após drenar.

## API HTTP

Escuta sempre em 127.0.0.1. Host deve corresponder a 127.0.0.1:PORTA.
POST exige Content-Length e X-Bematech-Client: 1. Se Origin existir, deve ser
http://127.0.0.1:PORTA. Não há CORS, contas ou autenticação.

| Método/rota | Entrada | Saída de sucesso |
| --- | --- | --- |
| GET /api/info | nenhuma | JSON 200 com version, mode, dots, columns, spacing, feed, cut |
| GET / e assets explícitos | nenhuma | Interface embutida |
| POST /api/print | PBM P4 binário | JSON 202 com status simulated/sent e bytes |
| POST /api/text | UTF-8 sem NUL | JSON 202 com status e bytes |

~~~sh
curl http://127.0.0.1:8421/api/info
curl --fail http://127.0.0.1:8421/api/print \
  -H 'X-Bematech-Client: 1' \
  -H 'Content-Type: image/x-portable-bitmap' \
  --data-binary @recibo.pbm
~~~

400 significa entrada inválida; 403, recusa da fronteira local; 404, rota
inexistente; 500, memória/serial. Detalhes da serial aparecem no stderr do
executável. O servidor fecha cada conexão e rejeita corpo chunked.

## Limites e persistência

- HTTP: 16 KiB de cabeçalhos, alocação de até 2 MiB, timeout de socket de
  10 segundos, uma conexão por vez.
- Trabalho codificado: 4 MiB. Bitmap: largura de 1 até dots e altura 1–6000.
- Texto CLI: rejeita ESC, controles de dispositivo, UTF-8 inválido e caracteres
  fora de CP850. Aceita newline, normalização de CR e expansão de tab.
- Navegador: histórico, conteúdos e opções ficam somente em memória da página.
- Trabalhos HTTP são síncronos e não intercalam bytes; outros processos ainda
  podem disputar o dispositivo. Use um app por impressora.

Host/Origin limitam uso indevido pelo navegador, mas não protegem contra
software malicioso na própria máquina. Quem adicionar acesso remoto deve
implementar autorização, segurança de transporte e concorrência.

Referências:
[serial Win32](https://learn.microsoft.com/en-us/windows/win32/devio/communications-resource-handles),
[configuração Win32](https://learn.microsoft.com/en-us/windows/win32/devio/modification-of-communications-resource-settings),
[AppDir](https://docs.appimage.org/reference/appdir.html).
