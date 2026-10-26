# Compilar, testar e empacotar

[English](../en/DEVELOPMENT.md) · [Português](DESENVOLVIMENTO.md)

## Ferramentas

Windows: Visual Studio Build Tools com Desktop C/C++, CMake e NSIS para
instalador. Linux: GCC/Clang, CMake 3.20+, Make/Ninja e dpkg para DEB.
macOS: Xcode Command Line Tools e CMake; hdiutil/codesign produzem o DMG.
Python 3 é opcional nos testes de integração/checksums; Node é opcional para
validar sintaxe JavaScript. Nenhum deles é necessário ao executar o app.

~~~sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
~~~

No Linux/macOS, rode ./build/bematech-printer. No Visual Studio, o executável
fica em build/Release/. As bibliotecas de sistema são as únicas dependências C.

## Testes

O teste C confere bytes CP850 exatos, UTF-8 estrito, rejeição de ESC,
quebra de linha, dimensões de bitmap e parser P4, inclusive raster que começa
com um byte cujo valor corresponde a espaço em branco. Os testes continuam
ativos em Release.

Se Python estiver disponível na configuração, CTest inclui integração:
inicia servidor em simulação, testa Host/Origin, entradas válidas/inválidas,
exportação CLI e serial POSIX virtual. Não há descoberta nem acesso automático
à impressora real.

A validação de navegador cobre seis utilitários, exportações, erros,
EN/PT-BR e larguras 360, 768 e 1280. Ao editar web/, recompile: os assets são
embutidos durante a compilação.

## Pacotes

~~~sh
cpack --config build/CPackConfig.cmake -C Release -G ZIP
# Debian
cpack --config build/CPackConfig.cmake -G DEB
# Windows
cpack --config build/CPackConfig.cmake -C Release -G NSIS
# macOS
sh packaging/macos.sh build
# AppImage: obtenha appimagetool 1.9.1 na release oficial
sh packaging/appimage.sh build /caminho/absoluto/appimagetool-x86_64.AppImage
~~~

O AppImage reúne AppRun, executável, ícone e desktop entry. Não embute glibc:
compile numa distribuição compatível com o público-alvo. DEB também usa a libc
do sistema de compilação.

O macOS é compilado separadamente para Apple silicon e Intel. Assinatura ad-hoc
confere integridade, sem notarização. Notarização e assinatura pública Windows
dependem de identidades/certificados próprios, que não ficam no repositório.

## CI e releases

O workflow testa Linux x86-64, Windows x86-64, macOS arm64 e macOS x86-64.
Produz ZIP, DEB, AppImage, NSIS, DMG e SHA256SUMS. Branches e PRs geram
artefatos; tags v* publicam uma pré-release depois do sucesso das plataformas.

Para uma nova versão:

1. Atualize BP_VERSION, versão CMake e metadados do bundle macOS.
2. Atualize notas EN/PT-BR e capturas.
3. Rode CTest e valide o navegador.
4. Faça commit, crie e envie a tag vX.Y.Z.
5. Confira jobs nativos e downloads antes de promover a versão.

Compilar e empacotar não certifica o hardware: teste um recibo curto no modo
ESC/Bema em cada combinação de sistema/impressora antes de anunciar suporte
físico verificado.

## Manutenção

Mantenha bytes de dispositivo no motor C. Ferramentas web devem gerar o
bitmap pelo contrato P4. Adicione testes de bytes exatos ao criar comandos.
Preserve limites de entrada e a escuta no loopback.

Textos ingleses ficam em index.html; traduções PT-BR e frases dinâmicas ficam
em app.js. Atualize os dois idiomas e teste rótulos longos.

A hospedagem da demo fica em checkout privado separado. Copie apenas os assets
aprovados para lá e preserve o wrapper que impede acesso à ponte local.
Identidade de hospedagem e credenciais nunca entram neste repositório.
Capturas aprovadas ficam em docs/screenshots/.

build*/, dist/, logs, binários de trabalho, .env*, caches Playwright e
metadados de hospedagem são ignorados. A história Git pública é independente
da história do serviço privado.
