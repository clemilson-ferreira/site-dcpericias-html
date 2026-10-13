# Plano de execução — Área exclusiva, Gerador de Propostas e Painel DC Perícias

> Escrito em 13/10/2026 para ser **executado por outra sessão** (Sonnet). Cada etapa diz quem faz
> (👤 Clemilson/Darleny ou 🤖 Claude), o que fazer, como verificar e quando parar.
> Ordem obrigatória: **Fase 0 → Fase 1 (área) → Fase 2 (propostas) → Fase 3 (painel)**.
> Não comece uma fase sem a anterior verificada.

---

## Prompt para colar na sessão do Sonnet

```
Leia docs/PLANO-AREA-EXCLUSIVA.md (branch ccr-734e1e84-08kinp, se ainda não estiver na main).
Execute somente a próxima etapa pendente da lista "Estado das etapas" no fim do arquivo.
Siga as Regras gerais. Ao terminar a etapa: rode a verificação descrita, marque a etapa como
concluída no arquivo, faça commit e push, e me diga o que fiz, o que verifiquei e o que vem a seguir.
Se a etapa exigir ação minha (👤), me dê o passo a passo e pare.
```

---

## Regras gerais (valem para todas as etapas)

1. **Nunca use deploy por arquivo .zip** (`hosting_websites_deploy-static-site-archive`): ele sobrescreve o site inteiro.
   Publicação da área = upload arquivo a arquivo em `public_html/area/` (Etapa 1.7).
2. **Nunca altere dados das tabelas `leads_*`, nunca desative `trg_notif_lead`**, nunca mexa em `notif_config`.
3. **Nenhum segredo no repositório nem no chat.** A única chave que vai para o navegador é a *publishable/anon* do Supabase (pública por design). Chave da Anthropic só como segredo da Edge Function, cadastrada pelo próprio Clemilson.
4. **As páginas da área NÃO carregam** GTM, gtag, `/assets/dcp-whatsapp.js`, `/assets/dcp-dicas.js` nem qualquer script de terceiros. Motivo: script de terceiro numa página logada pode ler a sessão e os dados.
5. Bibliotecas JS **vendorizadas** em `area/vendor/` (arquivo copiado, versão fixa), não CDN em tempo real.
6. Toda mudança de banco via `apply_migration` (Supabase MCP), com nome descritivo. Depois de cada migration: `get_advisors` (security) e reportar novos avisos.
7. Honestidade (exigência do Clemilson): separar o que foi **verificado** do que é **inferência**; não inventar nomes de menu — quando citar tela de painel, dizer "o nome pode variar".
8. Um commit por etapa, mensagem em português. Não abrir PR sem pedido.
9. **PARE e pergunte** se: algum comando de verificação falhar duas vezes; o Supabase/Hostinger responder algo diferente do esperado neste plano; ou a etapa exigir decisão que não está escrita aqui.

---

## Fatos verificados em 13/10/2026 (base do plano)

| Item | Estado |
|---|---|
| Site | HTML estático na Hostinger, `public_html` do usuário `u418212697`, domínio `dcpericias.com`. Sem deploy automático por Git. Último deploy registrado: `dcpericias-v37.zip` (10/10/2026) |
| Pasta `public_html/area/` | **Não existe** (livre para uso) |
| `.htaccess` raiz | Força HTTPS, remove `www`, URLs sem `.html`, bloqueia `.zip/.sql/...`, `.claude` e `CLAUDE.md`, `Options -Indexes`, cabeçalhos básicos |
| Supabase | Projeto `xuucobklnhxaxqhabnvg` (Banco-DCP), **plano free**, região sa-east-1, Postgres 17 |
| Auth | **0 usuários**, nenhum provedor configurado por nós ainda |
| Storage / Edge Functions | 0 buckets / 0 funções |
| Extensões | pg_net, pgcrypto, supabase_vault, uuid-ossp (sem pg_cron) |
| Tabelas | 6 `leads_*` (colunas comuns: id, nome, whatsapp, caso, origem, criado_em, estado, cidade, email + qualificação `area`/`perfil`/`situacao`) e `notif_config` |
| Policies | Só `insercao_publica` (INSERT para `anon`) nas 6 tabelas de leads. **Ninguém tem SELECT via API** |
| Avisos de segurança | `notif_lead()` (SECURITY DEFINER) executável por `anon` e `authenticated` via RPC; 3 funções `notif_*` sem `search_path`; `pg_net` no schema public |
| Leads (21 dias até 13/10) | 45 reais: 40 "WhatsApp direto" (placeholder deliberado), 5 com número real |
| Primeiro lead | 26/07/2026 |
| Gerador de PDF | Protótipo pronto em `area/proposta/proposta-pdf.js` + papel timbrado em `area/assets/papel-timbrado/` (9 tiras JPEG originais). Reproduz o modelo 003 com desvio < 1 pt. Teste: `node tests/gerar-modelo.mjs saida.pdf [dados.json]` (precisa de `jspdf@2.5.2`) |
| Preços API Anthropic (por milhão de tokens, entrada/saída) | Haiku 5.5 `claude-haiku-5-5`: US$ 0,10 / 0,50 (até 100K tokens de prompt); Sonnet 5.5 `claude-sonnet-5-5`: US$ 2 / 10; Opus 5.5 `claude-opus-5-5`: US$ 4 / 20. A API aceita PDF direto (bloco `document`, até 32 MB e 600 páginas por requisição) |

**Ambiguidade aberta (perguntar ao Clemilson na Fase 3):** "Radar da Perícia Médica" é o título da página pública `dcpericias.com/radar` (decisões e notícias). Os dados de leads vêm da rotina **"Radar de Leads"** e os de anúncios da rotina **"Sentinela Google Ads"**. O painel deste plano usa leads + anúncios. Se existir uma tarefa local do app Cowork com o nome "Radar da Perícia Médica", ela não aparece para a sessão na nuvem.

---

## O que vocês vão precisar (resumo)

**Contas / ações manuais (👤, ninguém pode fazer por vocês):**
- Google Cloud Console: criar credencial OAuth (Etapa 1.2).
- Painel do Supabase: ligar login Google, configurar URLs, desligar cadastro aberto (Etapas 1.3 e 1.6).
- Verificação em duas etapas ligada nas **duas contas Google** (é a porta de entrada da área).
- Console da Anthropic (só Fase 2B): criar chave de API, **definir limite de gasto mensal**, cadastrar a chave como segredo da Edge Function no painel do Supabase.

**Conectores (MCP) usados pelo Claude:** Supabase (migrations, SQL, Edge Functions, chaves, avisos), Hostinger (listar, ler e enviar arquivos), GitHub (repositório), Windsor.ai (dados do Google Ads, Fase 3), Claude Code Remote (rotinas agendadas, Fase 3), Context7 (documentação atual de supabase-js, jsPDF, Chart.js).

**Skills:**
- Superpowers (depois de instalado): `brainstorming` não é necessário aqui (o plano já existe); usar `executing-plans`, `systematic-debugging` e `verification-before-completion`.
- `claude-api` antes de escrever a Edge Function da Fase 2B.
- `impeccable` para as telas, `dataviz` antes de qualquer gráfico/card da Fase 3.
- `security-review` antes de cada publicação (fim das Fases 1, 2 e 3).
- `run` / Playwright (Chromium já instalado no ambiente) para testar as páginas.

**Custos esperados (estimativa, não medição):**
- Supabase free: R$ 0 (limitações: pausa por inatividade, já coberta pela rotina keep-alive; backups do plano free a confirmar).
- Hostinger, Google OAuth: sem custo adicional.
- Fase 2A (proposta sem IA): R$ 0.
- Fase 2B (IA redige a partir dos documentos): por proposta com ~100 mil tokens de entrada (≈ 30 a 50 páginas de PDF) + ~5 mil de saída: Opus 5.5 ≈ US$ 0,50; Sonnet 5.5 ≈ US$ 0,25; Haiku 5.5 ≈ US$ 0,05. Com 10 propostas/mês: US$ 0,50 a 5. **A escolha do modelo é decisão do Clemilson.**
- Fase 3: R$ 0 em API (a coleta roda como rotina do Claude, na assinatura). Windsor.ai: plano atual não verificado.

---

## FASE 0 — Preparação

### 0.1 🤖 Levar o trabalho atual para a `main`
- Abrir PR da branch `ccr-734e1e84-08kinp` para `main` (contém `.claude/settings.json` do Superpowers, o protótipo do gerador e este plano). Clemilson aprova e mescla.
- **Verificação:** `git log origin/main` mostra os commits; `docs/PLANO-AREA-EXCLUSIVA.md` existe na main.
- Lembrete: mesclar PR **não publica nada** no site (não há deploy automático).

### 0.2 👤 Decidir a fonte única do site (risco importante)
O site é publicado por `.zip` (v37). **Se o próximo `.zip` for gerado de uma pasta que não contém `area/`, a área some do servidor.**
Escolha uma opção (recomendada: A):
- **A.** Trazer a pasta-fonte do site (de onde sai o `.zip`) para este repositório. Depois, todo `.zip` sai daqui e já inclui `area/`.
- **B.** Manter a pasta-fonte onde está e copiar `area/` para dentro dela antes de gerar cada `.zip`.
- **Verificação:** a decisão está registrada no "Estado das etapas".

### 0.3 🤖 Correções de segurança do banco (antes de existir qualquer usuário logado)
Migration `seguranca_funcoes_notif`:
```sql
revoke execute on function public.notif_lead() from public, anon, authenticated;
alter function public.notif_wa_link    set search_path = public, extensions;
alter function public.notif_html_escape set search_path = public, extensions;
alter function public.notif_urlenc     set search_path = public, extensions;
```
(Antes, conferir as assinaturas reais com `\df public.notif_*` via SQL `select oid::regprocedure from pg_proc where proname like 'notif_%'` e usar a assinatura exata no `alter function`.)
- **Verificação obrigatória** (o trigger precisa continuar funcionando): numa transação desfeita no fim, inserir como `anon` um registro de teste e confirmar que não dá erro:
  ```sql
  begin;
  set local role anon;
  insert into public.leads_clientes (nome, whatsapp, area, caso, origem, estado, cidade)
  values ('Clemilson-teste verificacao', '85999990000', 'Trabalhista', 'teste', 'teste-verificacao', 'CE', 'Fortaleza');
  rollback;
  ```
  (`origem` começa com "test", então `notif_lead` não envia e-mail; o `rollback` desfaz tudo.)
- `get_advisors security`: os avisos de `notif_lead` e `search_path` devem sumir. `pg_net` no public **não mexer** (mover a extensão pode quebrar o trigger; registrar como pendência aceita).
- **PARE** se o insert de teste falhar: desfazer o `revoke` com `grant execute ... to anon` e reportar.

---

## FASE 1 — Área exclusiva com login (só Clemilson e Darleny)

**Arquitetura:** páginas estáticas em `dcpericias.com/area/`, login com Google pelo Supabase Auth.
Três barreiras independentes:
1. Google OAuth em modo **Teste**, com só os 2 e-mails como usuários de teste: o Google recusa qualquer outra conta.
2. Supabase com cadastro de novos usuários **desligado** depois do primeiro login de vocês dois.
3. **RLS no banco:** os dados só saem para quem está na tabela `admins`, amarrada ao **ID do usuário**, não ao e-mail.

Observação honesta: os arquivos HTML/JS da área ficam públicos (todo site estático é assim). Isso não é problema porque **não há dado nem segredo neles**. Os dados vêm do banco só depois do login, e quem protege é a camada 3.

### 1.1 🤖 Tabela de administradores e função de checagem
Migration `area_admins`:
```sql
create table public.admins (
  email      text primary key check (email = lower(email)),
  nome       text not null,
  user_id    uuid unique references auth.users(id) on delete set null,
  criado_em  timestamptz not null default now()
);
alter table public.admins enable row level security;   -- sem policies: invisível pela API
comment on table public.admins is 'Quem acessa /area. Acesso decidido por user_id (preenchido após o 1º login Google).';

insert into public.admins (email, nome) values
  ('clemilsonf.eng@gmail.com',  'Clemilson'),
  ('darlenycidreira2@gmail.com', 'Dra. Darleny Cidreira');

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke execute on function public.eh_admin() from public, anon;
grant  execute on function public.eh_admin() to authenticated;
```
Por que `user_id` e não e-mail: se algum dia um cadastro por e-mail/senha for ligado por engano, alguém poderia criar conta com o e-mail de vocês sem confirmação. Amarrar ao ID da identidade Google elimina esse caminho.
- **Verificação:** `select public.eh_admin();` executado como `anon` deve dar erro de permissão; `get_advisors` sem aviso novo além de "RLS sem policy" em `admins` (esperado e desejado).

### 1.2 👤 Google Cloud — credencial OAuth (≈15 min, no computador)
No Google Cloud Console, com a conta `clemilsonf.eng@gmail.com` (os nomes das telas mudam com frequência; procure os equivalentes):
1. Criar um projeto, por exemplo "DC Pericias Area".
2. Tela de consentimento / plataforma de autenticação: tipo **Externo**, nome do app "DC Perícias — Área", e-mail de suporte; escopos **apenas** os básicos (`openid`, `email`, `profile`).
3. Status de publicação: **Teste**. Usuários de teste: `clemilsonf.eng@gmail.com` e `darlenycidreira2@gmail.com`.
4. Criar credencial **ID do cliente OAuth**, tipo **Aplicativo da Web**:
   - Origens JavaScript autorizadas: `https://dcpericias.com`
   - URIs de redirecionamento autorizados: `https://xuucobklnhxaxqhabnvg.supabase.co/auth/v1/callback`
5. Guardar o **Client ID** e o **Client Secret**. **Não cole o secret no chat**: ele vai direto no painel do Supabase (1.3).

### 1.3 👤 Painel do Supabase — ligar o Google
Em Authentication (nomes aproximados):
1. Provedores → **Google**: ligar, colar Client ID e Client Secret, salvar.
2. Provedor **Email**: **desligar** (não haverá login por senha).
3. Configuração de URLs: Site URL `https://dcpericias.com`; Redirect URLs: `https://dcpericias.com/area/` e `https://dcpericias.com/area/**`.
4. **Ainda não** desligar "permitir novos cadastros". Isso é na 1.6, depois do primeiro login.
- **Verificação (🤖):** pedir ao Clemilson um print ou confirmação. O Claude não consegue ler essa configuração pelo MCP.

### 1.4 🤖 Páginas da área (código no repositório)
Estrutura:
```
area/
  .htaccess              ← cabeçalhos de segurança só da área (abaixo)
  index.html             ← login ("Entrar com Google") + menu após login
  propostas/index.html   ← Fase 2
  painel/index.html      ← Fase 3
  js/supabase-config.js  ← URL do projeto + chave publishable (obter com get_publishable_keys)
  js/auth.js             ← cliente Supabase, guarda de sessão, sair
  css/area.css
  vendor/supabase.js     ← @supabase/supabase-js 2.45.4, build UMD, vendorizado
  vendor/jspdf.umd.min.js← jspdf 2.5.2 (Fase 2)
  vendor/chart.umd.min.js← chart.js 4.4.1 (Fase 3)
  proposta/ (já existe)  assets/papel-timbrado/ (já existe)
```
Comportamento de `auth.js`:
- `createClient(URL, KEY, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })`.
- Entrar: `signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://dcpericias.com/area/' } })`.
- Após a sessão existir: chamar `rpc('eh_admin')`.
  - `true` → mostrar o menu (Propostas, Painel, Sair) e o nome.
  - `false` → mostrar "Conta reconhecida, aguardando liberação" (caso do primeiro login, antes da 1.5) com botão Sair. **Nunca** mostrar dados.
- Toda página interna chama a mesma guarda no carregamento e volta para `/area/` se não houver sessão ou se não for admin.
- Botão **Sair** → `signOut()` e limpeza do estado.

`area/.htaccess`:
```apache
<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://xuucobklnhxaxqhabnvg.supabase.co wss://xuucobklnhxaxqhabnvg.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
  Header always set X-Robots-Tag "noindex, nofollow, noarchive"
  Header always set Referrer-Policy "no-referrer"
  Header always set Cache-Control "no-store"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>
```
- Usar fontes do sistema (sem Google Fonts) para a CSP continuar fechada. Visual: azul-petróleo `#0E2D39` / `#051a22` e dourado do papel timbrado. Aplicar a skill `impeccable`. Funcionar bem no **celular**: o Clemilson usa muito pelo telefone.
- Remover de `area/` o que não é para o servidor: `area/proposta/package.json` pode ficar (inofensivo); **`tests/` e `docs/` nunca são enviados**.
- **Verificação local:** servir a pasta (`python3 -m http.server`) e abrir com Playwright. A página de login carrega sem erro no console e sem violação de CSP. O botão gera o redirecionamento para `xuucobklnhxaxqhabnvg.supabase.co/auth/v1/authorize?provider=google...`.

### 1.5 👤🤖 Primeiro login e amarração por ID
1. 🤖 Publicar a área (1.7).
2. 👤 Clemilson e Darleny entram em `dcpericias.com/area/` com Google. Os dois veem "aguardando liberação".
3. 🤖 Amarrar as contas:
   ```sql
   update public.admins a set user_id = u.id
   from auth.users u
   join auth.identities i on i.user_id = u.id and i.provider = 'google'
   where lower(u.email) = a.email and a.user_id is null;
   select email, user_id is not null as liberado from public.admins;
   ```
4. 👤 Recarregar a página: o menu aparece.
- **Verificação:** os dois com `liberado = true`; `select count(*) from auth.users` = 2.
- **PARE** se aparecer um 3º usuário em `auth.users`: não liberar, reportar, e considerar apagá-lo pelo painel.

### 1.6 👤 Fechar a porta
- No painel do Supabase, Authentication: **desligar** "Permitir novos cadastros" (o nome pode variar).
- 🤖 **Verificação:** pedir ao Clemilson para sair e entrar de novo (deve funcionar; usuário existente não é bloqueado). Se possível, testar com uma terceira conta Google: o Google deve recusar por não ser usuário de teste.

### 1.7 🤖 Publicação na Hostinger (procedimento usado em todas as fases)
1. `hosting_files_generate-upload-url` (username `u418212697`, domain `dcpericias.com`).
2. Para **cada arquivo** de `area/` (exceto arquivos de teste): upload TUS com `curl`, como na descrição da operação. O destino é `area/<caminho>` com `?override=true`.
   - Não verificado ainda: se o upload cria subpastas automaticamente. Testar primeiro com um único arquivo (`area/.htaccess`) e listar.
3. `hosting_files_list-website-and-directories` com `directory: "area"` para conferir a lista e os tamanhos.
4. `curl -sI https://dcpericias.com/area/` deve mostrar os cabeçalhos da CSP, `X-Robots-Tag` e `no-store`.
5. Conferir que **nada fora de `area/` mudou**: listar a raiz e comparar com a lista dos "Fatos verificados" (30 itens).
- Desfazer: os arquivos são novos. Para retirar a área, apague a pasta `area` pelo gerenciador de arquivos da Hostinger (👤).

### 1.8 🤖 Revisão de segurança da Fase 1
Rodar a skill `security-review`. Checklist mínimo:
- Nenhum script de terceiro em `area/`.
- `eh_admin()` só por `user_id`.
- Cadastro desligado.
- Provedor Email desligado.
- CSP ativa.
- `noindex` presente.
- `get_advisors` sem itens novos.

Reportar ao Clemilson. **Fase 1 concluída.**

---

## FASE 2 — Gerador de propostas

Dividida em **2A (sem IA, custo zero)** e **2B (IA redige a partir de documentos)**. Só começar a 2B com a 2A em uso.

### Regras de dados (combinadas com a Dra. Darleny)
- Paciente sempre por **iniciais** (ex.: "Caso D.S.O."), nunca nome completo.
- **Documentos enviados não são armazenados**: são lidos, usados e descartados. O banco guarda só os campos da proposta.
- Parcelamento: **12x de 1/10 do valor à vista**, mostrando o total (120%). Já implementado em `calcularInvestimento()`.
- Rodapé com "CRM 5133-MA · RQE 2360" e assinatura "CRM-MA 5133 · RQE 2360 — DC Perícias". Já implementados.

### 2A.1 🤖 Tabela `propostas`
Migration `propostas`:
```sql
create table public.propostas (
  id            uuid primary key default gen_random_uuid(),
  numero        int  not null unique,
  data          date not null,
  tratamento    text not null,
  destinatario  text not null,
  referencia    text not null,
  valor_avista  numeric(12,2) not null check (valor_avista > 0),
  dados         jsonb not null,          -- todos os campos usados no PDF, para regerar igual
  status        text not null default 'emitida' check (status in ('emitida','aceita','recusada','cancelada')),
  criado_por    uuid not null default auth.uid() references auth.users(id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create sequence public.propostas_numero_seq start with 4;   -- o modelo é a 003; CONFIRMAR com o Clemilson o próximo número
alter table public.propostas alter column numero set default nextval('public.propostas_numero_seq');
alter table public.propostas enable row level security;
create policy admin_tudo on public.propostas for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
```
- **Verificação:** como `anon`, `select * from propostas` retorna 0 linhas ou erro; `get_advisors` limpo.

### 2A.2 🤖 Tela `area/propostas/`
Formulário com estes campos (padrões vindos de `PADRAO`/`FIXOS` em `proposta-pdf.js`):

| Campo | Tipo | Observação |
|---|---|---|
| Número | automático | mostra o próximo; editável só se o Clemilson pedir |
| Data | data | padrão: hoje |
| Tratamento | lista | "Ao Dr.", "À Dra." |
| Destinatário | texto | obrigatório |
| Referência | texto | começa com "Caso " + iniciais; avisar se parecer nome completo (≥ 2 palavras com inicial maiúscula após "Caso") |
| 1. Sobre o caso | texto longo | obrigatório |
| 2. O que já foi feito | introdução + lista editável + fecho | padrões do modelo, todos editáveis |
| 3. Escopo previsto | lista com caixas de seleção + "adicionar item" | os 5 itens do modelo marcados por padrão |
| Valor à vista (R$) | número | obrigatório; ao digitar, mostra "12x de R$ X — total R$ Y" |

- Botão **Pré-visualizar**: gera o PDF e mostra numa nova aba (blob). Botão **Gerar e salvar**: grava em `propostas` e baixa o arquivo, com o nome de `nomeArquivo()` ("DC Perícias - Proposta Comercial 004-131026.pdf").
- Lista "Últimas propostas" (número, destinatário, valor, status), com botão **Baixar de novo** (regera a partir de `dados`) e troca de status.
- Carregar `jspdf.umd.min.js` (vendorizado) e passar `window.jspdf.jsPDF` para `gerarProposta()`. Carregar as 9 tiras com `fetch` → `Uint8Array`.
- Rascunho do formulário no `localStorage` do aparelho (com try/catch). Limpar ao salvar.
- **Verificação:**
  - Playwright preenche o formulário com os dados do modelo 003 e gera o PDF.
  - Comparar com `tests/gerar-modelo.mjs`: mesmas linhas de texto (pdftotext) e mesma contagem de páginas.
  - Testar texto longo (o caso "stress" do teste) e ver que nada passa da margem nem invade o rodapé.
  - Testar no viewport de celular (390×844).

### 2A.3 🤖 Publicar (1.7) e 👤 a Dra. Darleny faz uma proposta real
- Ela gera uma proposta de verdade e compara com o que faria à mão. Ajustes de texto vão para `FIXOS`/`PADRAO`.
- **2A concluída** quando ela aprovar.

### 2B.1 👤 Pré-requisitos da IA
1. Decidir o modelo. O plano parte de **Sonnet 5.5** como ponto de equilíbrio, mas a decisão é sua. Opções: Opus 5.5 (melhor leitura de prontuário, ~US$ 0,50 por proposta), Sonnet 5.5 (~US$ 0,25), Haiku 5.5 (~US$ 0,05, pior em documentos longos e técnicos).
2. Console da Anthropic: criar a chave de API; **limite de gasto mensal** (sugestão: US$ 10).
3. Painel do Supabase → Edge Functions → Secrets: criar `ANTHROPIC_API_KEY` (você mesmo cola; não pelo chat) e `MODELO_REDACAO` com o ID escolhido.
4. Ler a página de privacidade do site (`privacidade.html`) e decidir, idealmente com um advogado, se ela precisa citar Supabase e Anthropic como operadores de dados.

### 2B.2 🤖 Edge Function `redigir-proposta`
**Antes de escrever, carregar a skill `claude-api`** e usar o SDK oficial (`npm:@anthropic-ai/sdk` no Deno).
- Entrada (POST, JSON): `{ resumo: string, arquivos: [{ nome, tipo: 'pdf'|'texto', conteudo }] }`. PDF em base64, texto puro. Limite: 20 MB no total (confirmar o limite real de corpo das Edge Functions no plano free antes; se for menor, ler os PDFs no navegador com pdf.js e mandar só o texto).
- Segurança:
  - `verify_jwt` ligado.
  - Dentro da função, criar um cliente Supabase com o token do usuário e chamar `rpc('eh_admin')`; se for falso, responder 403.
  - **Não registrar em log** o conteúdo recebido nem o devolvido (só o tamanho e o tempo).
- Chamada à API:
  - Modelo `Deno.env.get('MODELO_REDACAO')`, `max_tokens` ~16000, streaming com `finalMessage()`.
  - Saída estruturada (`output_config.format`, JSON Schema) com: `referencia_sugerida`, `sobre_o_caso`, `ja_feito_intro`, `ja_feito_itens[]`, `pontos_de_atencao_para_darleny[]`.
  - Tratar `stop_reason === 'refusal'` e, conforme a skill, o `fallbacks` do servidor.
- Prompt de sistema (fixo, em português), com estas regras:
  - Escrever no tom e no tamanho do modelo 003.
  - Paciente só por iniciais.
  - **Não antecipar conclusões, fundamentos nem estratégias** (o modelo diz que ficam reservados ao parecer).
  - Não emitir opinião médica nem jurídica.
  - Não inventar fatos: o que não estiver nos documentos vai para `pontos_de_atencao_para_darleny`.
- Tempo: medir a duração com um PDF grande; se passar perto do limite de execução das Edge Functions no plano free (confirmar o valor), reduzir a entrada ou trocar para o texto extraído.
- Deploy: `deploy_edge_function` (Supabase MCP).

### 2B.3 🤖 Botão "Redigir com IA" na tela de propostas
- Campo de resumo (texto longo) + envio de arquivos (PDF, MD, TXT).
- A IA **preenche os campos do formulário**; a Dra. Darleny revisa e edita tudo antes de gerar. O PDF continua sendo gerado no navegador (2A).
- Mostrar `pontos_de_atencao_para_darleny` numa caixa à parte. Isso **não entra no PDF**.
- Mostrar o custo estimado da chamada a partir de `usage` (tokens × preço), para acompanhar o gasto.
- **Verificação:**
  - Com um caso fictício (documento inventado para teste, nunca um caso real), conferir que a saída usa iniciais, não traz conclusões e preenche todos os campos.
  - Conferir que um usuário não admin recebe 403 (testar chamando a função com o token de um usuário não autorizado ou sem token).
- Rodar `security-review`, publicar (1.7). **Fase 2 concluída.**

---

## FASE 3 — Painel das perícias

### 3.0 👤 Confirmar a fonte
Responder à ambiguidade do início: o painel deve usar leads (Radar de Leads) + anúncios (Sentinela)? Ou existe outra base chamada "Radar da Perícia Médica"?

### 3.1 🤖 Leitura dos leads para admins
Migration `painel_leitura_leads`:
```sql
-- leitura só para admins, nas 6 tabelas
do $$ declare t text; begin
  foreach t in array array['leads_clientes','leads_advogados','leads_erro_medico',
                           'leads_acidente_trabalho','leads_previdenciario','leads_defesa_medica'] loop
    execute format('create policy admin_le on public.%I for select to authenticated using (public.eh_admin())', t);
  end loop; end $$;

create or replace view public.vw_leads with (security_invoker = true) as
with u as (
  select 'clientes' as funil, id, nome, whatsapp, area as qualif, origem, estado, cidade, criado_em from public.leads_clientes
  union all select 'advogados', id, nome, whatsapp, area, origem, estado, cidade, criado_em from public.leads_advogados
  union all select 'erro_medico', id, nome, whatsapp, perfil, origem, estado, cidade, criado_em from public.leads_erro_medico
  union all select 'acidente_trabalho', id, nome, whatsapp, situacao, origem, estado, cidade, criado_em from public.leads_acidente_trabalho
  union all select 'previdenciario', id, nome, whatsapp, situacao, origem, estado, cidade, criado_em from public.leads_previdenciario
  union all select 'defesa_medica', id, nome, whatsapp, perfil, origem, estado, cidade, criado_em from public.leads_defesa_medica
)
select u.*,
  (criado_em at time zone 'America/Fortaleza') as criado_local,
  case when regexp_replace(coalesce(whatsapp,''),'\D','','g') in ('99999999999','9999999999') then 'whatsapp_direto'
       when length(regexp_replace(coalesce(whatsapp,''),'\D','','g')) < 10 then 'contato_invalido'
       else 'numero_real' end as tipo_contato,
  (origem ilike 'lp_ads_%') as pago
from u
where coalesce(origem,'') not ilike 'test%' and coalesce(origem,'') not ilike 'valida%'
  and coalesce(nome,'') not ilike 'clemilson%' and coalesce(nome,'') not ilike 'teste%';
```
- `security_invoker = true` é **obrigatório**: sem ele a view ignora o RLS e entrega os leads a qualquer usuário logado.
- O campo `caso` (relato clínico) **não entra na view**. Só será lido na tela de detalhe de um lead, se um dia for pedido.
- **Verificação:**
  - Como `anon`, `select count(*) from vw_leads` dá 0 ou erro.
  - Como o postgres, a contagem dos últimos 21 dias bate com a do Radar (45 em 13/10, mudará com o tempo).
  - O insert público das landing pages continua funcionando (repetir o teste da 0.3).

### 3.2 🤖 Dados de anúncios no banco
Migration `ads_diario`:
```sql
create table public.ads_diario (
  dia          date not null,
  campanha     text not null,
  impressoes   int  not null default 0,
  cliques      int  not null default 0,
  custo        numeric(12,2) not null default 0,
  conversoes   numeric(10,2) not null default 0,
  fonte        text not null default 'windsor_google_ads',
  coletado_em  timestamptz not null default now(),
  primary key (dia, campanha)
);
alter table public.ads_diario enable row level security;
create policy admin_le on public.ads_diario for select to authenticated using (public.eh_admin());
```
- **Carga inicial:** Windsor `get_data` (connector `google_ads`, conta `941-770-4156`, campos `date, campaign, impressions, clicks, spend, conversions`) desde 26/07/2026, com `insert ... on conflict (dia, campanha) do update`. Descobrir campos extras só com `get_fields`; nunca inventar nome de campo.
- **Coleta diária:** criar a rotina "Coletor Ads DC Perícias" (Claude Code Remote `create_trigger`, sessão nova a cada disparo, diária ~05:40 America/Fortaleza).
  - Lê os últimos 3 dias (conversões chegam atrasadas) e faz o upsert.
  - Escreve **somente** em `ads_diario`. Nada no Google Ads (`execute_action` proibido).
  - E-mail só se falhar.
- **Verificação:** a soma de `custo` dos últimos 7 dias bate com o total do último e-mail da Sentinela (tolerância de centavos).
- Pendência a verificar com o Clemilson: o Windsor.ai está em plano pago ou em teste? O Supermetrics já expirou uma vez.

### 3.3 🤖 Funções de agregação (o navegador recebe números, não listas)
Migration `painel_funcoes`. Funções `security invoker` (o RLS se aplica), todas `stable`, `set search_path = ''`, recebendo `p_inicio date, p_fim date`. Cada uma devolve também o período anterior de mesmo tamanho, para a variação:
- `painel_resumo(p_inicio, p_fim)` → json: leads reais, leads pagos (`lp_ads_*`), % WhatsApp direto, investimento, cliques, impressões, conversões (Ads), CPC, CTR, **CPL geral** (investimento ÷ leads reais), **CPL pago** (investimento ÷ leads `lp_ads_*`), divergência conversões Ads × leads pagos, propostas emitidas, valor total proposto, propostas aceitas.
- `painel_serie_diaria(p_inicio, p_fim)` → por dia: leads por funil, investimento, cliques.
- `painel_por_dimensao(p_inicio, p_fim, p_dim text)` → contagem por `funil` | `origem` | `estado` | `tipo_contato` (validar `p_dim` contra essa lista).
- `painel_heatmap(p_inicio, p_fim)` → leads por dia da semana × hora (horário de Fortaleza).
- `painel_campanhas(p_inicio, p_fim)` → por campanha: custo, cliques, CPC, conversões, custo por conversão.
- **Verificação:** cada função testada via SQL com intervalos conhecidos; os números conferem com consultas manuais.

### 3.4 🤖 Tela `area/painel/`
**Antes de desenhar, carregar a skill `dataviz`** (paleta, cards, regras de gráfico) e a `impeccable`. Chart.js vendorizado.

Filtro de período no topo: 7 / 30 / 90 dias / personalizado. Todo número mostra a variação contra o período anterior (▲▼ e %).

**Fileira 1 — números grandes:** Leads reais · Investimento · CPL pago · CPC médio · % WhatsApp direto · Propostas emitidas (valor).
**Fileira 2 — gráficos:**
- Leads por dia (barras empilhadas por funil) com a linha de investimento.
- Leads por funil.
- Top 10 origens (separar `lp_ads_*` das orgânicas).
- Leads por UF.
- Mapa de calor dia × hora.

**Fileira 3:** tabela de campanhas; últimos 15 leads (nome, funil, origem, quando, tipo de contato, link de WhatsApp só quando o número é real).

**Insights automáticos** (regras fixas em JS sobre os números, **sem IA, custo zero**). Exemplos:
- "CPL pago subiu X% contra o período anterior."
- "Funil *previdenciário* sem lead há N dias."
- "Campanha *Y* gastou R$ Z em 7 dias sem conversão."
- "Dia D teve gasto e 0 impressões: veiculação parada?"
- "Pico de leads: terça entre 19h e 21h."
- "Conversões do Ads (N) ≠ leads pagos no banco (M): conferir a tag de conversão."

Mostrar no máximo 5, ordenados por gravidade. Cada um diz de que número saiu.

Funcionar no celular: cards em 2 colunas, gráficos em largura total, tabela com rolagem horizontal própria.
- **Verificação:**
  - Playwright em desktop e em celular, sem erro de console nem de CSP.
  - Os números do período "7 dias" conferem com o e-mail mais recente da Sentinela e do Radar.
  - Rodar `security-review`, publicar (1.7). **Fase 3 concluída.**

### 3.5 (opcional, perguntar antes) 🤖 Funil comercial
Tabela `lead_status` (funil, lead_id, status: novo / em contato / proposta enviada / fechado / perdido / não qualificado, valor fechado, observação, atualizado por/em), editável pela lista de leads do painel. Permite taxa de conversão real e CAC (custo por cliente fechado). É o indicador que mais importa para a margem, mas exige que vocês atualizem o status de cada lead. Por isso fica opcional.

---

## Estado das etapas
(O executor atualiza esta lista a cada etapa.)

- [ ] 0.1 PR para a main
- [ ] 0.2 Fonte única do site (decisão: ___)
- [ ] 0.3 Correções de segurança do banco
- [ ] 1.1 Tabela admins + eh_admin()
- [ ] 1.2 👤 Google OAuth
- [ ] 1.3 👤 Supabase: provedor Google
- [ ] 1.4 Páginas da área
- [ ] 1.5 Primeiro login + amarração por ID
- [ ] 1.6 👤 Cadastro desligado
- [ ] 1.7 Publicação (procedimento validado)
- [ ] 1.8 Revisão de segurança
- [ ] 2A.1 Tabela propostas (confirmar próximo número: ___)
- [ ] 2A.2 Tela de propostas
- [ ] 2A.3 Publicação + aprovação da Dra. Darleny
- [ ] 2B.1 👤 Modelo, chave, limite de gasto, segredos
- [ ] 2B.2 Edge Function redigir-proposta
- [ ] 2B.3 Botão "Redigir com IA"
- [ ] 3.0 👤 Confirmar a fonte do painel
- [ ] 3.1 Leitura de leads + vw_leads
- [ ] 3.2 ads_diario + carga + rotina diária
- [ ] 3.3 Funções de agregação
- [ ] 3.4 Tela do painel
- [ ] 3.5 (opcional) Funil comercial
