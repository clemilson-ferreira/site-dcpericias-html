# Workspace DC Perícias: fundação comum e ordem de construção

Planejado em 23/10/2026 (Opus 5.5). Execução prevista em outras conversas do Claude Code (Sonnet), uma ferramenta por conversa.

> Esta pasta (`planejamento-workspace/`) é documentação interna. Não subir para a Hostinger, nem para o site, nem para o subdomínio.

## 1. Onde estamos

- Endereço: `https://workspace.dcpericias.com` (subdomínio na Hostinger, pasta `public_html/workspace`, SSL ativo).
- Login: Google via Supabase (projeto `Banco-DCP`, ref `xuucobklnhxaxqhabnvg`). Testado pelo celular por Clemilson e Dra. Darleny em 23/10/2026.
- Lista de acesso: tabela `public.workspace_membros` (RLS; cada pessoa vê só a própria linha). Função `public.eh_membro_workspace()` (security definer, só `authenticated` executa) devolve `true` para os dois e-mails.
- Código-fonte da página: `C:\Users\clemi\Downloads\dcpericias-v37-WORKSPACE` (index.html, style.css, app.js, .htaccess, robots.txt, assets/). Fora da pasta do site de propósito.
- Google Cloud: projeto `dc-pericias-workspace`, app "DC Perícias Workspace" em modo Testando, cliente OAuth "Workspace".

## 2. Regra de custo (vale para todas as ferramentas)

Nenhuma assinatura nova. O que pode gerar gasto:
- **API do Claude** (Anthropic Console, créditos pré-pagos, cobrança por token). É o único gasto aceito. Configurar limite de gasto mensal no Console.
- **WhatsApp Cloud API (Meta)**: não é assinatura; respostas dentro da janela de 24 h após mensagem do cliente são grátis; só mensagens-modelo (templates) iniciadas pela empresa são cobradas. Ver plano 07.

Tudo o mais fica nos planos grátis que já existem: Supabase Free (banco, Auth, Storage 1 GB, Edge Functions, pg_cron), Hostinger (já paga), Google Cloud sem conta de cobrança (OAuth e Calendar API são gratuitos), Google Ads Scripts (grátis). **Nunca** clicar em "Fazer upgrade" no Google Cloud nem em "Upgrade to Pro" no Supabase.

## 3. Ordem de construção recomendada

| Ordem | Plano | Por que nessa posição |
|---|---|---|
| 1 | Fundação + **04 link do e-mail** (este arquivo e `04-link-email.md`) | Cria o "hub" com os cartões das ferramentas, o módulo comum de login e o processo de deploy. O link do e-mail é um cartão do hub. |
| 2 | **06 bloco de notas** | Mais simples. Estabelece o padrão tabela + RLS + página + realtime que as outras repetem. |
| 3 | **01 propostas comerciais** | Uso imediato, sem IA e sem integração externa. Só front-end + uma tabela. |
| 4 | **03 agenda** | Primeira integração externa (Google Calendar). Exige publicar o app do Google (passo do Clemilson). |
| 5 | **02 analisador de casos** | Primeira com Claude API. Cria a infraestrutura de Edge Function + fila + Storage que o WhatsApp reaproveita. |
| 6 | **05 painel de leads** | Depende de acessos externos (script no Google Ads, API da Promptado a confirmar). |
| 7 | **07 WhatsApp** | A mais aberta. Reaproveita Claude (02) e agenda (03). Precisa de decisões do Clemilson antes. |

Cada plano é independente o bastante para uma conversa nova. Antes de começar qualquer um, o executor lê este arquivo inteiro.

## 4. Arquitetura comum

### 4.1 Front-end (Hostinger, estático)
- HTML + CSS + JavaScript puro, sem etapa de build (a hospedagem é estática). ES modules (`<script type="module">`) são permitidos.
- Uma pasta por ferramenta dentro do código-fonte do workspace:
  ```
  dcpericias-v37-WORKSPACE/
    index.html            hub: saudação + cartões das ferramentas
    style.css             tokens e componentes comuns (já existe)
    core/
      supabase.js         cria o client (URL + chave publicável) e exporta
      auth.js             exigirMembro(): sessão + checagem na workspace_membros; redireciona para / se falhar
      layout.js           monta o cabeçalho (logo, nome, Sair, link "Início")
    notas/index.html  notas/notas.js
    propostas/ ...    agenda/ ...    casos/ ...    painel/ ...    whatsapp/ ...
    assets/
  ```
- O `app.js` atual vira o hub. A lógica de login de hoje (telas login/negado/painel) migra para `core/auth.js` e é reaproveitada por todas as páginas.
- Visual: tema claro do site (papel `#f7f3ea`, tinta `#10303c`, ouro `#d9b878` / `#8c6a28`, Fraunces nos títulos, Inter no corpo). Reaproveitar `style.css`. Mobile primeiro: Clemilson e a Dra. usam pelo celular.
- Bibliotecas externas: só de `cdn.jsdelivr.net`, versão exata e `integrity` (SRI), como o `supabase-js@2.118.0` já está.
- **CSP**: a `<meta http-equiv="Content-Security-Policy">` de cada página só libera o que ela usa. Hoje: `script-src 'self' https://cdn.jsdelivr.net`, `connect-src 'self' https://xuucobklnhxaxqhabnvg.supabase.co` (inclui as Edge Functions), `img-src ... https://*.googleusercontent.com`. Para Realtime acrescentar `wss://xuucobklnhxaxqhabnvg.supabase.co`.
- Sem GTM, Promptado, gtag ou qualquer script de rastreamento no workspace.

### 4.2 Back-end (Supabase, plano Free)
- **Banco**: toda tabela nova do workspace tem prefixo `ws_`, RLS ligada e a política padrão:
  ```sql
  alter table public.ws_xxx enable row level security;
  create policy "membros leem"     on public.ws_xxx for select to authenticated using (public.eh_membro_workspace());
  create policy "membros inserem"  on public.ws_xxx for insert to authenticated with check (public.eh_membro_workspace());
  create policy "membros alteram"  on public.ws_xxx for update to authenticated using (public.eh_membro_workspace()) with check (public.eh_membro_workspace());
  create policy "membros apagam"   on public.ws_xxx for delete to authenticated using (public.eh_membro_workspace());
  ```
  Tabelas com segredo (tokens do Google, chaves) ficam **sem nenhuma política** (só a service role das Edge Functions lê), como já é feito em `notif_config`.
- **Migrações**: sempre pelo MCP do Supabase (`apply_migration`), nome `ws_<ferramenta>_<o_que>`. Depois de cada migração rodar `get_advisors` (security) e não deixar aviso novo.
- **Edge Functions** (Deno, TypeScript): onde ficam segredos e chamadas a APIs externas (Claude, Google, Meta). Toda função chamada pelo navegador:
  1. lê o `Authorization: Bearer <jwt>` do usuário;
  2. cria um client do Supabase com esse JWT e chama `rpc('eh_membro_workspace')`; se `false`, responde 403;
  3. só então usa a service role (variável de ambiente `SUPABASE_SERVICE_ROLE_KEY`, já existe nas Edge Functions) para o que precisar.
  Funções chamadas por terceiros (webhook do WhatsApp, script do Google Ads) não usam JWT: validam assinatura ou segredo compartilhado.
- **Limites do Free que mudam o desenho**: Edge Function tem teto de tempo por execução (150 s de relógio no Free; confirmar na documentação atual). Por isso nada de "esperar o Claude escrever 5 minutos" dentro de uma requisição: análises longas usam fila (ver plano 02).
- **Segredos**: cadastrados pelo Clemilson no painel do Supabase (Edge Functions → Secrets). Nunca colar segredo no chat, em arquivo do projeto ou no front-end. Lista prevista:
  | Nome | Ferramenta | De onde vem |
  |---|---|---|
  | `ANTHROPIC_API_KEY` | 02, 07 | console.anthropic.com → API Keys |
  | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 03 | bloco de notas do Clemilson (cliente OAuth "Workspace") |
  | `ADS_INGEST_SECRET` | 05 | gerar uma senha longa aleatória |
  | `WA_APP_SECRET`, `WA_TOKEN`, `WA_VERIFY_TOKEN`, `WA_PHONE_ID` | 07 | Meta for Developers |
- **pg_cron** (extensão grátis) para tarefas agendadas: coletar análises prontas (02), limpar arquivos antigos (02), etc. `pg_net` já está instalada no projeto.

### 4.3 Desenvolvimento local com login funcionando
Adicionar no Supabase, em Authentication → URL Configuration → Redirect URLs: `http://127.0.0.1:8765/**`. Não precisa mexer no Google Cloud (o Google devolve para o Supabase, e o Supabase devolve para a URL pedida). Servir a pasta com `python -m http.server 8765 --bind 127.0.0.1` e abrir `http://127.0.0.1:8765`. No `signInWithOAuth` o `redirectTo` já usa `window.location.origin`, então funciona nos dois endereços.

### 4.4 Deploy (subir para a Hostinger)
Só depois que o Clemilson aprovar a prévia. Pelo MCP da Hostinger:
1. `hosting_files_list-website-and-directories` com `username: u418212697`, `domain: dcpericias.com`, `directory: workspace` para ver o que existe.
2. `hosting_files_generate-upload-url` (mesmos `username`/`domain`). Devolve `url`, `auth_key`, `rest_auth_key` (expiram em algumas horas; não gravar em arquivo).
3. Para cada arquivo, TUS em dois passos (POST cria, PATCH envia), destino `workspace/<caminho>`:
   ```bash
   curl -X POST  "$URL/workspace/$f?override=true" -H "X-Auth: $AK" -H "X-Auth-Rest: $RK" -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $SIZE" -H "Upload-Offset: 0"
   curl -X PATCH "$URL/workspace/$f?override=true" -H "X-Auth: $AK" -H "X-Auth-Rest: $RK" -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" -H "Upload-Offset: 0" --data-binary "@$f"
   ```
   Esperado: 201 e 204. Subpastas são criadas sozinhas.
4. Conferir com `curl -sI https://workspace.dcpericias.com/<arquivo>?cb=$RANDOM` (200 e tipo certo) e abrir no navegador.
5. Ao mudar CSS/JS, subir o número `?v=` na tag que os carrega.
6. **Nunca** usar `hosting_websites_deploy-static-site-archive`: ele apaga o site inteiro.

### 4.5 Como cada executor trabalha
- Ler este arquivo, o plano da ferramenta e `RESUMO-DO-PROJETO.md`.
- Mostrar a prévia (navegador interno) antes de subir. Publicar só com ordem do Clemilson.
- Ao terminar: atualizar `RESUMO-DO-PROJETO.md` (seção Workspace) e a memória `workspace-privado-login-google.md`.
- Toda chamada à API do Claude: carregar a skill `claude-api` antes de escrever código (SDK `@anthropic-ai/sdk` via `npm:` no Deno; modelos e parâmetros mudam, não confiar na memória).

## 5. Hub (página inicial depois do login)

Grade de cartões, um por ferramenta, com ícone, nome e uma linha de descrição. Cartões das ferramentas ainda não prontas aparecem apagados com "Em breve" (sem link). Ordem dos cartões: Notas, Agenda, Casos, Propostas, Painel, WhatsApp, E-mail.

Critérios de pronto da fundação:
- [ ] `core/` criado e o hub usando `exigirMembro()`.
- [ ] Cartões no hub, incluindo o do e-mail (plano 04) já funcionando.
- [ ] Redirect local `http://127.0.0.1:8765/**` cadastrado e login local testado.
- [ ] Nada quebrado no login de produção (testar no celular depois de subir).
