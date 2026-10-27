# DC Perícias — Resumo do projeto (onde estamos)

**Última atualização: 22/10/2026 (fim da tarde).** Mantenha este arquivo atualizado a cada rodada de trabalho. Os `.md` ficam fora dos ZIPs de publicação.

## Situação em uma frase
O site local (`C:\Users\clemi\Downloads\dcpericias-v37`) está na **v41 com o TEMA CLARO aplicado (teste)**. **Nada foi publicado**; o que está no ar na Hostinger é a v37 de 10/10/2026. Publicar só com ordem do Clemilson.

## Regras de trabalho
- Nada vai ao ar sem ordem dele. Eu edito a pasta local e gero prévias/ZIP.
- Não mexer em `.htaccess`, `robots.txt` sem aviso. Recontar as travas do GTM depois de editar em lote.
- Mudanças de imagem com sufixo novo (`-v2`, `-claro`); cache de imagem é de 1 ano. Subir `?v=` em JS/CSS alterados.
- Copy/H1 travados: propor opções antes de reescrever.
- LP do Tiago (`lp/assistencia-pericial`): gestor de tráfego; só mexer com reversão fácil e aviso a ele. Hoje: escura, comportamento legado do envelope, sem CTA-foto; recebeu só o script da Promptado.
- Armadilhas técnicas: ver a memória `aprendizados-tecnicos-site-dcp` (head em comentário, cache do Playwright, `\a` no Windows, escape de barras em heredoc).

## O que foi feito (v41, 22/10/2026)
1. **CTA-foto (`assets/dcp-fala.js`, `?v=41`)**: boas-vindas calorosa aos 10 s; depois uma fala a cada 1,5 min (dicas/convites do tema da página, `window.DCP_FALA`); ao entrar em página nova na mesma visita, boas-vindas curta ("Bem-vindo(a) à nossa página relacionada a X..."); página já visitada = sem boas-vindas. Contador de "não lidas": +1 aos 30 s e a cada 1,5 min, com animação. Relógio da visita em `sessionStorage`.
2. **Envelope (`assets/dcp-email.js`, `?v=41`)**: desktop aparece de largada e aos 60 s fala "Sem WhatsApp logado? ..." (uma vez por visita); celular aparece com 2 min de visita e não fala. Contador +1 a cada 2 min, sem efeito. LP do Tiago mantém o legado (`LEGADO_GESTOR`). O envelope só existe em LP-completas e home (não em artigos, ferramentas, /radar, /agendar, /privacidade).
3. **Promptado**: `<script async src="https://app.promptado.com/v1/analytics.js?key=pk_2cac58258d64f2436519283bb65d4f1e">` antes do `</head>` em todas as páginas. As recomendações de GEO/SEO da Promptado serão tratadas em OUTRO chat (ainda não feito).
4. **5 artigos novos** (revisados pela Dra. Darleny) portados para o molde atual: isenção de IR, canetas emagrecedoras, Tema 1.295 STJ, caso Folbigg, erro médico em criança. Atualizados `artigos/index.html`, `radar.html` (edição 17/10/2026, correção Tema 1.157) e `sitemap.xml` (+5 URLs). Pendência: `llms.txt` não foi atualizado; revisão jurídica dos artigos de IR e Tema 1.295 era recomendada.
5. **Tema claro** em 52 páginas (todas, exceto a LP do Tiago) + nova `/agendar` clara. Paleta: marfim `#f7f3ea`, areia `#efe9dc`, cartões `#fffdf8`, títulos `#10303c`, ouro de texto `#8c6a28`. Heros clareados (`hero-*-claro.webp`) e logo claro (`logo-dcpericias-horizontal-claro.webp`) como arquivos novos. Acabamento em `assets/dcp-claro.css?v=1` (inclui o modal do envelope).
6. **Mosaico de recortes** unificado no conceito da home (sobrepostos, hover vem bem para frente, lightbox no celular) em previdenciario, contralaudo, lp/impugnacao-de-laudo e lp/advogados. Fundo do bloco de recortes igual ao da página. Hero de `/contralaudo` descido 48 px (cabeça sob o cabeçalho). Texto "92,2%" do gráfico de defesa médica corrigido.

## Como o tema claro é gerado e como voltar ao escuro
- **Fonte escura**: `dcpericias-v37-ESCURO-referencia\site` (escuro v41 completo). `site-anterior-v40` = escuro da manhã de 22/10.
- **Gerar o claro**: `python -I dcpericias-v37-TEMA-CLARO\aplicar-claro.py` (lê `ESCURO-referencia\site`, reescreve as páginas da pasta do site em claro). Acabamento em `claro-base.css` + `claro-extra.css` (subir `CSS_V` no script ao mudar). Mosaico: `mosaico_unificar.py` (já aplicado na fonte escura).
- **Voltar ao escuro**: `dcpericias-v37-ESCURO-referencia\REVERTER-PARA-ESCURO.bat` (copia `site\` por cima, sem apagar). Depois gerar ZIP com `.htaccess`, trocar nome e `?v=`. Detalhes no `LEIA-ME.md` da pasta de referência.
- **Regra**: mudança de conteúdo/estrutura se faz na fonte escura (`ESCURO-referencia\site`) e depois se roda `aplicar-claro.py`. Editar só a pasta do site claro será sobrescrito na próxima geração.

## Arquivos entregues (em Downloads)
- `dcpericias-v41-claro-2026-10-22.zip` — site completo, tema claro.
- `dcpericias-v41-2026-10-22.zip` — site completo, escuro (plano B).
- `previas-claro-v41-2026-10-22.zip` — prévias claras (HTML único, sem leads/GTM/Promptado). Montador: `dcpericias-v37-PREVIAS-CLARO-v41\_build.py`.
- Não incluídos nos ZIPs: pasta "Novos artigos" (fonte original dos 5 artigos), `.md`, `skills-lock.json`.

## Contagens de referência (claro = escuro, 53 páginas contando a LP do Tiago)
"Abrindo o WhatsApp..." 52 · "Redirecionando para o WhatsApp..." 7 · GTM-T42XZG3P 106 · GTM-MFH6DNPL 318 · AW-18047120463 211 · dcpGravaLead 288 · Promptado 53.

## Pendências
- **Publicar** (ordem do Clemilson): escolher claro ou escuro, subir ZIP na Hostinger.
- Implementar recomendações de GEO/SEO da Promptado (outro chat). Atualizar `llms.txt`.
- Avisar o Tiago antes de publicar qualquer mudança na LP dele; decidir se ela entra no claro.
- Confirmar "+43 processos" e a autorização por escrito das avaliações; revisão jurídica do texto do Tintim na privacidade.
- Novas fotos de hero (erro médico e outras); foto do botão redondo CTA-foto.
- Conferência visual do claro no celular real e de detalhes de contraste em páginas não abertas (ferramentas, artigos antigos, privacidade).
- Dúvida aberta: tirar o rótulo (eyebrow) acima dos títulos? Envelope também em artigos/ferramentas?

## Workspace privado (23/10/2026) — NÃO publicado
- Pasta de prévia: `C:\Users\clemi\Downloads\dcpericias-v37-WORKSPACE` (index.html, style.css, app.js, .htaccess, robots.txt, assets/). Fica FORA da pasta do site de propósito.
- Destino: subdomínio `workspace.dcpericias.com`, já criado na Hostinger (pasta `public_html/workspace`, SSL ativo).
- Login: Google via Supabase (Banco-DCP). Só entra quem está na tabela `workspace_membros` (Clemilson e Dra. Darleny). Função `eh_membro_workspace()` pronta para as ferramentas futuras.
- NO AR desde 23/10/2026; login testado pelo celular do Clemilson. Falta: teste da Dra. Darleny e definir as ferramentas. Para atualizar a página: enviar de novo os arquivos da pasta de prévia para public_html/workspace (upload TUS pelo MCP da Hostinger).
- **Ferramenta 00 (fundação + link do e-mail), 24/10/2026, NÃO publicada:** git criado em `dcpericias-v37-WORKSPACE` (`main` = estado em produção; branch `ferramenta/00`, commit `8db7fe2`). Novidades: `core/supabase.js`, `core/auth.js` (`verificar`, `exigirMembro`, `entrar`, `sair`), `core/layout.js`; `app.js` virou módulo (`?v=2`) e monta o hub com 7 cartões (6 "Em breve" + E-mail ativo, `mail.hostinger.com`, nova aba); `style.css?v=2`. Testada a prévia local com sessão simulada (1366 e 390), sem erro de console. Pendências: cadastrar `http://127.0.0.1:8765/**` nas Redirect URLs do Supabase e testar o login real local; confirmar o endereço do webmail; conferir que o `.htaccess` serve `.js` como módulo; subir para a Hostinger (incluindo a pasta `core/`) só com ordem do Clemilson.
- Planejamento das 7 ferramentas (23/10/2026): pasta `planejamento-workspace/` (não subir para a Hostinger). Começar sempre pelo `00-fundacao-e-ordem.md`. Ordem: fundação + link do e-mail, notas, propostas, agenda, analisador de casos, painel de leads, WhatsApp.

## Rodada Promptado (23/10/2026) — GEO/SEO
- **Prompts monitorados:** 20 de 20 trocados e organizados em 8 segmentos (pessoa comum, erro médico, médico/clínica processado, advogado, serviços e marca, PA/MA/PI, medicina do trabalho). Antigos ficam em "Inativos" (não contam no limite).
- **Mapa Promptado:** Recomendações = 1 aberta (noindex da LP do Tiago, intencional, não mexer) + 4 aprovadas (analytics só some quando a v41 for publicada). Planos de ação = 1 de 2 usados, 3/3 feitos (renova 16/11). Tarefas = 20 "A fazer" criadas pelo Coworker a partir dos prompts antigos. Blog: 19 posts publicados; 10 "sugeridos" são duplicatas dos já publicados.
- **Artigo novo (rascunho, sem capa, não publicado):** "Laudo administrativo do INSS x assistente técnico: diferenças", post 120c017c-f821-4337-a250-3ff67cdbded4. Fontes em `..\dcpericias-v37-ARTIGO-INSS-LAUDO\NOTES_verificado.md`. Falta: capa 16:9, categoria, publicar (links internos dependem dos posts já no ar).
- **llms.txt** atualizado (site e ESCURO-referencia): +5 artigos da v41 e seção do blog (19 posts). Não publicado.
- **Pendente (precisa do Clemilson/Dra.):** tarefas de página do site (ver lista na conversa), publicar v41, marcar tarefas como feitas no Promptado.
- **24/10/2026 (Promptado):** tarefa 11 marcada Feito; 10 sugestões de blog duplicadas foram para a Lixeira (restauráveis). Sem recomendações novas. Diagnóstico: site no ar ainda é a v37, então nenhuma das 20 tarefas de site foi aplicada e o script da Promptado não está ativo (tráfego/rastreador sem dados). Citação 30d: 1,2% (5 de 406), vindas dos prompts novos (home citada em "O que é a DC Perícias"; Maranhão).
