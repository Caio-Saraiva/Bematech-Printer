# Compilar, testar, empacotar e manter

[English](../en/DEVELOPMENT.md) · [Português](DESENVOLVIMENTO.md)

## Ferramentas

Compilador C99, CMake 3.20+ e Make/Ninja ou Visual Studio. cJSON e PDF.js são
vendorizados em versões fixas. Executar o app não requer Python/Node/npm/pip
nem download de dependências.

Windows: Visual Studio Desktop C/C++, CMake e NSIS. Linux: GCC/Clang, CMake e
Make/Ninja; dpkg para DEB. macOS: Xcode Command Line Tools e CMake;
hdiutil/codesign para DMG.

Python 3 é opcional nos testes/fixtures/checksums. Node pode validar JavaScript.
Poppler/LibreOffice são auxiliares nativos opcionais para documentos.

~~~sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
./build/bematech-printer --no-open --config /tmp/bematech-dev/settings.json
~~~

No Visual Studio, o binário fica em build/Release/. Assets web são embutidos:
recompile e reinicie após editar web/.

## Testes

O teste C valida bytes CP850, Unicode incompatível, UTF-8 inválido, controles
injetados, quebra, limites de bitmap e parser P4. Continua ativo em Release.

A integração Python inicia servidor simulado com perfil temporário. Confere
ajustes, conexão/dispositivos, histórico, proteção CSV, calibração, diagnóstico,
CLI e texto rico C. Em POSIX, captura bytes por serial virtual, sem abrir a
impressora física. PDF/Office são testados quando os auxiliares existem.

~~~sh
python3 tests/make_fixtures.py
~~~

Gera PDF/DOCX/OBJ originais em output/fixtures/, ignorado. Há também fixtures
públicas de cubo OBJ, texto e padrão vetorial de foto.

Valide as oito abas em EN/PT-BR e 360/768/1280 pixels: editor, lista, arquivo,
foto, desenho, calculadora, computador e modelo. Verifique prévia visível
depois de sair de foto/modelo, estilos, numeração/linhas vazias, PDF/Office,
desfazer/refazer, versão de cliente, histórico/CSV, materiais/pose/impressão 3D
e salvar/testar conexão. Sucesso HTTP não prova a visibilidade da prévia.

Compare exportação ESC web com codificação C para um bitmap e examine cada
captura. Não use mockup como prova de implementação.

## Preservar a interface original

CSS e utilitários Windows 98 originais são a referência: chanfros, controles
compactos, título azul, área cinza e papel físico. Controles de plataforma
devem ser aditivos; não substitua módulos por versões reduzidas.
Mantenha formatos, materiais e câmeras do visualizador 3D.
Consulte FEATURE_PARITY.md antes de limitar ou remover comportamentos.

Inglês é o padrão e PT-BR continua disponível. Tradução preserva valores dos
controles e conteúdo do usuário. Atualize o dicionário e teste textos longos.

## Pacotes

~~~sh
cpack --config build/CPackConfig.cmake -C Release -G ZIP
cpack --config build/CPackConfig.cmake -G DEB
cpack --config build/CPackConfig.cmake -C Release -G NSIS
sh packaging/macos.sh build
sh packaging/appimage.sh build /caminho/absoluto/appimagetool-x86_64.AppImage
~~~

Windows usa runtime MSVC estático. AppImage contém AppRun, ícone, desktop entry
e executável; não embute glibc nem auxiliares Office. Compile Linux numa base
compatível com o público. macOS é compilado para Intel e Apple silicon, com
assinatura ad-hoc. Certificados/notarização públicos não ficam no repositório.

Inclua avisos de licença. Poppler/LibreOffice permanecem instalações opcionais
do sistema. Não embuta ambientes de máquina nem configuração privada.

## CI e releases

Workflow testa e empacota Linux x86-64, Windows x86-64, macOS arm64 e x86-64.
Branches/PRs geram artefatos; tags geram pré-release depois do sucesso dos jobs.
SHA256SUMS geral corresponde aos nomes finais dos downloads.

Atualize BP_VERSION, versão CMake e bundle macOS juntos. Atualize notas,
capturas e paridade nos dois idiomas. Teste, faça commit e envie a tag vX.Y.Z.
Confira os pacotes baixados e hashes antes de entregar.

## Demo e higiene

A demo local usa `tools/serve_demo.py` e o serviço de usuário em
`packaging/bematech-demo.service`. Uma cópia estática temporária de `web/` é
servida em `127.0.0.1:8422`, com o flag de simulação definido antes dos scripts
da aplicação. Confirme ausência de chamadas /api/ ou hardware.
O Cloudflare Tunnel encaminha o domínio público a esse serviço local;
credenciais e configuração da conta ficam fora do repositório.
Não use o serviço privado como backend.
As diferenças de PDF/Office por ambiente estão documentadas.

Não versione perfis, orçamentos, imagens/modelos do usuário, credenciais,
builds ou saídas de teste. Capturas aprovadas ficam em docs/screenshots/.
Use perfis temporários fora do checkout ou caminhos ignorados.
