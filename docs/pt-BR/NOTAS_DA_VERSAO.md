# 0.2.0 — aplicação Windows 98 original restaurada

Restaura a identidade visual e todos os utilitários, incluindo visualização e
impressão 3D. Substitui o redesenho simplificado da 0.1.

- Editor/listas ricos, arquivos PDF/Office, foto completa, desenho avançado e
  calculadora completa.
- Visualizador STL/OBJ/3MF/FBX ASCII original: materiais, pose, UP, projeção,
  luz, chão, cubo de orientação e impressão.
- Backend C99: perfil persistente, configuração/detecção Serial/USB/fila RAW,
  diagnóstico, histórico, calibração e conversão.
- Sem login, contas, senha, sessões ou passkeys.
- Mesma interface Windows 98 no app local, web local e demo.
- Inglês principal, PT-BR, documentação e capturas atualizadas.

PDF/Office nativos usam auxiliares opcionais. Na demo, Office raster é uma
aproximação a partir do texto; DOC/PPT/XLS binários precisam do app nativo ou
exportação para PDF. Consulte FEATURE_PARITY.md.

CI testa Windows, Linux e macOS Intel/Apple silicon, sem certificar a impressão
física. Windows não tem certificado de assinatura; macOS usa assinatura ad-hoc,
sem notarização. O navegador é a interface gráfica do app local.
