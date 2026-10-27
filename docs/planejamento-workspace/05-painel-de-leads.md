# Ferramenta 5: painel de performance de leads

Complexidade: média (depende de acessos externos). Sexta na ordem. Sem custo.

## Objetivo
Uma tela que responda, por período (7, 30, 90 dias, personalizado):
- Quantos leads chegaram, de onde (LP/origem, área, estado) e em que dia.
- Quanto custou cada lead no Google Ads (custo ÷ leads) e quais campanhas trazem lead de verdade.
- Como a marca aparece nas IAs (Promptado): visibilidade e tendência.
- Funil simples: lead → contato feito → proposta enviada → fechado (cruzando com a ferramenta 1).

## Fontes de dados

### A. Leads do site (já no Supabase, pronto para usar)
Tabelas existentes: `leads_clientes` (66 em 23/10/2026), `leads_advogados`, `leads_erro_medico`, `leads_acidente_trabalho`, `leads_previdenciario`, `leads_defesa_medica`. Colunas comuns: `nome, whatsapp, area|perfil|situacao, caso, origem, criado_em, estado, cidade, email`.
- Criar a view `ws_leads_unificados` (security invoker) com `union all` das seis tabelas, coluna `tabela` de origem e campos normalizados.
- Adicionar políticas **somente de leitura** para membros nas seis tabelas (`for select to authenticated using (public.eh_membro_workspace())`). Não mexer nas políticas de insert que o site usa. Antes, listar as políticas atuais (`pg_policies`) e conferir que o site continua gravando (enviar um lead de teste e apagar depois).
- Painel não mostra o campo `caso` (relato clínico) na lista; só no detalhe, ao clicar.

### B. Status do lead (novo, pequeno)
- Tabela `ws_lead_status` (tabela_origem, lead_id, status: novo/contatado/call_marcada/proposta/fechado/perdido, motivo_perda, valor_fechado, atualizado_por, atualizado_em). PK (tabela_origem, lead_id). RLS padrão.
- Na lista de leads do painel, um seletor de status por linha. É isso que alimenta o funil.

### C. Google Ads (sem API paga, sem aprovação de token de desenvolvedor)
A API oficial do Google Ads exige "developer token" aprovado; para evitar isso, usar **Google Ads Scripts** (grátis, roda dentro da conta do Google Ads):
- Edge Function `ads-ingest` (sem JWT; exige cabeçalho `x-ads-secret` igual ao segredo `ADS_INGEST_SECRET`). Recebe um JSON com linhas e faz upsert em `ws_ads_diario`.
- Script em Google Ads → Ferramentas → Scripts, agendado **diariamente às 6h**: consulta GAQL dos últimos 3 dias (para corrigir conversões atrasadas) por `segments.date, campaign.name, campaign.id`, métricas `impressions, clicks, cost_micros, conversions, conversions_value`, e envia com `UrlFetchApp.fetch(urlDaFunction, {method:'post', headers:{'x-ads-secret': ...}, payload: JSON.stringify(linhas)})`. Na primeira execução, mandar os últimos 180 dias.
- O executor escreve o script e entrega ao Clemilson para colar e autorizar (o segredo fica nas propriedades do script, não em texto solto).
- Tabela `ws_ads_diario` (data, campanha_id, campanha_nome, impressoes, cliques, custo numeric, conversoes numeric, valor_conv numeric, atualizado_em; PK data+campanha_id). RLS: membros leem; insert só via função.
- Ligação com leads: por data (CPL diário = custo do dia ÷ leads do dia) e, quando possível, por campanha via `origem`/UTM. Verificar se o site grava `gclid`/UTM nos leads; se não grava, propor (num chat do site, não neste) gravar `utm_campaign` e `gclid` no envio do formulário.

### D. Promptado (visibilidade em IAs)
- Situação: existe o MCP da Promptado conectado ao Claude (ferramentas `get_visibility`, `get_visibility_trend`, `get_site_traffic`, `list_competitors`…). Não sabemos se a Promptado oferece API pública com chave para o workspace consultar sozinho.
- **Passo 1 (Clemilson)**: perguntar à Promptado se há API REST ou exportação (CSV/webhook) no plano atual.
- Se houver API: Edge Function `promptado-sync` agendada por pg_cron (diária) grava em `ws_promptado_diario` (data, visibilidade, posicao_media, mencoes, por IA).
- Se não houver: **tarefa agendada no Claude Code** do computador do Clemilson (já usa a assinatura dele, sem custo extra), semanal, que usa o MCP da Promptado e grava o resumo no Supabase via MCP do Supabase. Funciona quando o computador está ligado; o painel mostra a data do último dado.
- Mostrar no painel: índice de visibilidade e tendência; principais prompts em que aparece; concorrentes. Sem tentar replicar o painel da Promptado inteiro: só o resumo e um link para o painel deles.

## Tela (`painel/`)
- Filtro de período no topo; números grandes: Leads, Custo Ads, CPL, Conversões Ads, Fechados, Taxa de fechamento.
- Gráfico de barras: leads por dia (empilhado por tabela/origem) com linha de custo diário.
- Tabela: leads por origem/LP e por estado (top 10).
- Funil (barras horizontais) a partir de `ws_lead_status`.
- Campanhas: custo, cliques, conversões, CPL estimado.
- Bloco Promptado: visibilidade atual, variação, data do dado.
- Lista de leads recentes com status editável.
- Gráficos: carregar a skill `dataviz` antes de desenhar. Biblioteca: Chart.js com versão exata + SRI via jsdelivr, ou SVG próprio. Respeitar o tema claro.
- Tudo com consultas agregadas no banco (views/funções SQL), não baixando todas as linhas para o navegador.

## Ordem de entrega
1. Leads do Supabase (A) + status (B) + funil. Já entrega valor sem nada externo.
2. Google Ads (C).
3. Promptado (D), conforme a resposta deles.

## Pronto quando
- [ ] Números do painel batem com contagem manual no banco para um período.
- [ ] Site continua gravando leads (teste feito e apagado).
- [ ] Script do Ads rodando diariamente; CPL aparece.
- [ ] Data do último dado de cada fonte visível no painel.
- [ ] Políticas novas só de leitura; `get_advisors` sem aviso novo.
