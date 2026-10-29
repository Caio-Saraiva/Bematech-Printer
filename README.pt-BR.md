# Bematech Printer

**A aplicação Windows 98 original, com backend nativo em C99.**

Mantém editor/listas ricos, arquivos/PDF/Office, foto, desenho completo,
calculadora completa, **visualização e impressão 3D**, diagnóstico, testes e
calibração. Sem autenticação. USB/Serial é configurado na própria interface.

[English](README.md) ·
[Demo](https://thermaldemo.caiosaraiva.com) ·
[Downloads](https://github.com/Caio-Saraiva/Bematech-Printer/releases)

![Aplicação original](docs/screenshots/editor-pt-BR.png)
![Modelo 3D](docs/screenshots/model-3d-en.png)

## Começar

1. Baixe e abra o pacote da sua plataforma.
2. Em **Conexão**, experimente a simulação.
3. Escolha Serial / USB CDC, USB ou uma fila RAW instalada.
4. Selecione ou informe a porta e ajuste os parâmetros seriais.
5. Salve, teste a conexão e imprima uma folha curta de teste.

A MP-4200 normalmente aparece como USB CDC: escolha a COM ou /dev/tty ou
/dev/cu correspondente. USB da classe de impressão usa /dev/usb/lpN no Linux
ou uma fila RAW instalada no Windows/macOS. O dialeto é **ESC/Bema**.

~~~sh
bematech-printer
bematech-printer serve --device /dev/ttyACM0
bematech-printer serve --config /caminho/settings.json --port 8425
~~~

O executável C abre a interface original no navegador em 127.0.0.1:8421.
Python e Node não são dependências de execução. Auxiliares opcionais para
PDF/Office estão documentados no guia.

A web local usa o mesmo executável e a mesma interface. A demo hospedada usa
os mesmos utilitários e apenas simula a impressão, em um serviço estático separado.

## Hospedar a demo no servidor

A demo pública usa `https://thermaldemo.caiosaraiva.com`, com Cloudflare Tunnel
apontando para `http://127.0.0.1:8422` neste servidor.
Python 3 é necessário apenas para esse servidor estático da demo:

~~~sh
python3 tools/serve_demo.py --port 8422
~~~

O comando serve uma cópia temporária de `web/` e força a simulação no navegador
antes de carregar a aplicação. Não disponibiliza API nativa nem acesso à
impressora. Apenas os arquivos estáticos da interface são publicados;
os demais arquivos do repositório ficam fora da raiz web.

Para executar como serviço de usuário Linux (checkout em `~/Bematech-Printer`):

~~~sh
mkdir -p ~/.config/systemd/user
cp packaging/bematech-demo.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now bematech-demo.service
~~~

Execute `sudo loginctl enable-linger "$USER"` para iniciar no boot e continuar
executando após logout. Reinicie `bematech-demo.service` após atualizar o código
para renovar a cópia dos arquivos estáticos.

No Cloudflare Tunnel existente, adicione uma rota de aplicação publicada para
`thermaldemo.caiosaraiva.com`, com tipo **HTTP** e URL `127.0.0.1:8422`.
O conector do túnel deve executar neste servidor para alcançar o loopback.
Use o registro DNS do túnel em vez do destino de domínio personalizado do Sites.
Credenciais e configuração da conta Cloudflare ficam fora do Git.

## Documentação

| Guia | Conteúdo |
| --- | --- |
| [Usuário](docs/pt-BR/GUIA_DO_USUARIO.md) | Instalação, conexão e todos os utilitários |
| [Técnico](docs/pt-BR/TECNICO.md) | Módulos C, ajustes, API e protocolo |
| [Desenvolvimento](docs/pt-BR/DESENVOLVIMENTO.md) | Compilação, testes, pacotes e manutenção |
| [Paridade](docs/FEATURE_PARITY.md) | Recursos preservados e diferenças por ambiente |
| [Capturas](docs/SCREENSHOTS.md) | Telas reais, inclusive 3D e configuração |
| [Notas](docs/pt-BR/NOTAS_DA_VERSAO.md) | Alterações e compatibilidade |

Configuração, impressoras 3D, orçamentos e trabalhos ficam no perfil local.
A demo usa armazenamento do navegador. Não há usuários, senha ou passkeys.
O serviço privado de produção permanece separado.

Aplicação MIT, cJSON MIT e PDF.js Apache-2.0. Projeto independente da Bematech.
