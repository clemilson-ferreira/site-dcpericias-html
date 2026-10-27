# Workspace DC Perícias: resumo e como retomar

Resumo da conversa de 22 a 24/10/2026 (Claude Code no computador do Clemilson) que criou a área exclusiva. Escrito em 27/10/2026 para retomar em outro chat, inclusive na nuvem.

## 1. Como acessar a área exclusiva

- **Endereço:** https://workspace.dcpericias.com
- **Como entrar:** botão "Entrar com Google", com uma das duas contas autorizadas:
  - `clemilsonf.eng@gmail.com`
  - `darlenycidreira2@gmail.com`
- O Google mostra o aviso "O Google não verificou este app". É esperado: clique em **Avançado → Acessar DC Perícias Workspace**.
- Qualquer outra conta Google cai na tela "Sem acesso".
- Enquanto o app do Google estiver em modo "Testando", o login expira a cada 7 dias e é preciso entrar de novo. Isso é normal.
- Ambos testaram pelo celular em 23/10/2026: funcionou.

Hoje, no ar, há a tela de login e um painel vazio ("Nenhuma ferramenta ainda"). O hub com os cartões das ferramentas está pronto, mas **ainda não foi publicado** (ver seção 5).

## 2. O que foi montado (e onde fica cada peça)

| Peça | Onde | Detalhe |
|---|---|---|
| Subdomínio | Hostinger, site `dcpericias.com` (usuário `u418212697`) | `workspace.dcpericias.com` → pasta `public_html/workspace`. SSL "Lifetime" ativo. |
| Arquivos no ar | `public_html/workspace/` | `index.html`, `style.css`, `app.js`, `.htaccess` (noindex, anti-iframe, sem cache), `robots.txt` (bloqueia tudo), `favicon-48x48.png`, `assets/logo-dcpericias-horizontal-claro.webp`. Também há o `default.php` da Hostinger, que não atrapalha. |
| Login Google | Google Cloud, projeto `dc-pericias-workspace` | Google Auth Platform: app "DC Perícias Workspace", público Externo, status **Testando**, 2 usuários de teste (os dois e-mails). Cliente OAuth "Workspace" (Aplicativo da Web): origem `https://workspace.dcpericias.com`, redirecionamento `https://xuucobklnhxaxqhabnvg.supabase.co/auth/v1/callback`. A chave secreta está **só no bloco de notas do Clemilson**. |
| Autenticação | Supabase, projeto `Banco-DCP` (ref `xuucobklnhxaxqhabnvg`, região sa-east-1) | Authentication → Providers → Google ativado com o ID e a chave do cliente. URL Configuration: Site URL `https://workspace.dcpericias.com`; Redirect URL `https://workspace.dcpericias.com/**`. |
| Lista de acesso | Supabase, banco | Tabela `public.workspace_membros` (os 2 e-mails, papel admin; RLS: cada pessoa vê só a própria linha). Função `public.eh_membro_workspace()`, usada nas regras de segurança de todas as ferramentas futuras. Migração `workspace_membros`. |
| Custo | — | Zero. OAuth do Google é gratuito e o projeto não tem conta de cobrança. **Nunca clicar em "Fazer upgrade"** no Google Cloud (o banner de teste gratuito é só propaganda). |

Para incluir uma pessoa nova: inserir o e-mail (minúsculo) em `workspace_membros` e adicionar o mesmo e-mail como usuário de teste no Google Cloud (Google Auth Platform → Público-alvo).

## 3. Código-fonte

- **Planos** (estão no GitHub, repositório `clemilson-ferreira/dcpericias-site`, pasta `planejamento-workspace/`):
  - `00-fundacao-e-ordem.md`: base comum, regras de custo, padrão de banco, como subir para a Hostinger. Ler sempre primeiro.
  - `01` propostas (PDF), `02` analisador de casos (API do Claude), `03` agenda (Google Agenda), `04` link do e-mail, `05` painel de leads, `06` notas, `07` WhatsApp.
  - Ordem combinada: fundação + 04, depois 06, 01, 03, 02, 05, 07.
- **Código do workspace**: pasta `C:\Users\clemi\Downloads\dcpericias-v37-WORKSPACE`, com git próprio **só no computador** (sem GitHub):
  - branch `main`: o que está no ar desde 23/10/2026;
  - branch `ferramenta/00` (commit `8db7fe2`): fundação (`core/supabase.js`, `core/auth.js`, `core/layout.js`), hub com os cartões e o cartão do e-mail, que leva a `https://mail.hostinger.com/`. **Não publicado.**
  - **Atenção, chat na nuvem:** essa pasta não existe na nuvem. Para trabalhar no código do workspace pela nuvem, primeiro é preciso criar um repositório no GitHub para ela (privado) e enviar as duas branches, a partir do computador. Ou continuar essas etapas no Claude Code do computador.

## 4. Regras combinadas

- Nenhuma assinatura nova. Único gasto aceito: tokens da API do Claude (créditos em console.anthropic.com, com limite mensal), e mensagens-modelo da Meta no WhatsApp, se houver.
- Nada vai ao ar sem ordem do Clemilson. Mostrar prévia antes.
- Segredos (chave do Google, chave da API do Claude, tokens) nunca no chat nem em arquivo: o Clemilson cola direto no painel do Supabase (Edge Functions → Secrets).
- Sem GTM, Promptado ou qualquer rastreamento no workspace.
- Visual: identidade do site (tema claro, Fraunces + Inter, petróleo e dourado). Ver `CLAUDE.md`.

## 5. Pendências

1. **Fundação (ferramenta 00)**: pronta na branch `ferramenta/00`, falta:
   - cadastrar `http://127.0.0.1:8765/**` em Supabase → Authentication → URL Configuration → Redirect URLs (permite testar o login no computador);
   - testar o login local;
   - confirmar que o webmail é `mail.hostinger.com`;
   - publicar (com a pasta `core/`) com ordem do Clemilson.
2. Próxima ferramenta: **06 notas**.
3. Decisões abertas, detalhadas nos planos:
   - **Propostas**: o acréscimo de 20% no cartão vale sempre? Qual assinador digital vocês usam?
   - **Fecho da proposta**: o modelo diz "São Luís (MA)", mas a regra de posicionamento é não dizer que a empresa é de São Luís.
   - **Analisador**: por quanto tempo guardar os documentos? A sugestão é 90 dias.
   - **WhatsApp**: qual número usar, se ele está no WhatsApp Business ou no comum, e se o Tintim continua funcionando junto.
4. Pendências antigas do banco, vistas no verificador do Supabase e não mexidas:
   - `notif_lead()` pode ser chamada sem login;
   - três funções `notif_*` estão sem `search_path` fixo;
   - a extensão `pg_net` está no schema `public`.

## 6. Como pedir no chat novo

> Leia `CLAUDE.md`, `RESUMO-DO-PROJETO.md`, `planejamento-workspace/RETOMADA.md` e `planejamento-workspace/00-fundacao-e-ordem.md`. Depois siga com [a ferramenta desejada].

No chat na nuvem, ferramentas que dependem do computador não funcionam: os MCPs de Hostinger e Supabase, se não estiverem conectados lá, e a pasta `dcpericias-v37-WORKSPACE`. Nesse caso, use a nuvem para planejar e revisar, e o computador para publicar.
