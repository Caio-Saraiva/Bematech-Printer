# Bematech Printer

**Um pouco de papel. Infinitas possibilidades.**

Motor C99 e estúdio web local para a **Bematech MP-4200 TH**, com apps para
Windows, Linux e macOS. Inglês é o idioma principal; a interface também possui
português brasileiro.

[English](README.md) ·
[Experimentar a demo](https://bematech-printer-demo.lilbigcheetos.chatgpt.site) ·
[Downloads](https://github.com/Caio-Saraiva/Bematech-Printer/releases)

![Estúdio de texto em português](docs/screenshots/editor-pt-BR.png)

## Como começar

Baixe a versão da sua plataforma em Releases e abra o app. O executável C
inicia um servidor em `http://127.0.0.1:8421` e abre a interface no navegador.
O modo inicial é simulação. Para usar uma impressora real, escolha a serial:

~~~sh
# Linux
bematech-printer serve --device /dev/ttyACM0

# macOS: substitua pela porta real
bematech-printer serve --device /dev/cu.usbmodem1234

# Windows PowerShell
.\bematech-printer.exe serve --device COM3
~~~

O app não exige Python, Node, conta ou conexão com a nuvem. A demo hospedada
processa tudo no navegador e apenas simula a impressão.

## Utilitários

- Texto: editor, alinhamento, tamanho normal/grande, importação TXT/MD/CSV/LOG.
- Listas: título, marcadores e recuo automático.
- Imagem: PNG/JPEG/WebP, rotação, brilho, contraste e quatro modos de pontilhamento.
- Desenho: mouse, caneta, toque, borracha, desfazer e limpar.
- Calculadora 3D: material, perda, energia, trabalho/extras e margem sobre a venda.
- Calibração: régua de largura e faixas gráficas para conferência no papel.
- Exportação: PNG, PBM P4 e bytes ESC/Bema.

## Documentação

| Guia | Conteúdo |
| --- | --- |
| [Usuário](docs/pt-BR/GUIA_DO_USUARIO.md) | Instalação por sistema, uso de cada utilitário e solução de problemas |
| [Técnico](docs/pt-BR/TECNICO.md) | Todos os módulos, opções CLI, protocolo, API e limites |
| [Desenvolvimento](docs/pt-BR/DESENVOLVIMENTO.md) | Compilação, testes, pacotes e releases |
| [Capturas](docs/SCREENSHOTS.md) | Imagens reais do aplicativo em três tamanhos |
| [Notas da versão](docs/pt-BR/NOTAS_DA_VERSAO.md) | Compatibilidade e limitações da versão inicial |

~~~sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
~~~

O dialeto é **ESC/Bema proprietário**, não ESC/POS genérico. O app não possui
autenticação: fica restrito ao loopback da máquina. Configuração, histórico e
conteúdo ficam na memória; recarregar a página reinicia a sessão. O projeto é
independente do serviço privado e usa licença MIT.
