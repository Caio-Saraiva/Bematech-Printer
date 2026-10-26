# 0.1.0 — versão inicial de prévia

Inclui motor C99, serial Win32/POSIX, interface web local embutida, CLI,
seis ferramentas, interface EN/PT-BR, exportações PNG/PBM/ESC-Bema,
verificações de fronteira local, pacotes por plataforma e documentação.

É uma prévia. CI valida compilação, testes e pacotes; a impressão física não
foi certificada em todos os sistemas. Teste um recibo curto na sua MP-4200 em
modo ESC/Bema.

## Limitações atuais

- Os apps usam o navegador padrão como interface gráfica.
- Windows não tem assinatura pública; macOS não tem notarização Apple.
- Não é driver ESC/POS, emissor fiscal ou spooler USB genérico.
- Sem importação PDF/Office, visualizador 3D, editor HTML rico ou histórico na nuvem.
- Sem autodetecção de dispositivo ou consulta contínua de papel/tampa.
- Opções nativas são argumentos CLI; reinicie para mudar.
- Sem autenticação ou modo de publicação remota.
- Conteúdo e histórico reiniciam ao recarregar.
- Texto CLI aceita CP850; outros caracteres usam bitmap na versão web.
