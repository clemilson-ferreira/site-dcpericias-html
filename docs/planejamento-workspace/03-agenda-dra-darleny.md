# Ferramenta 3: agenda da Dra. Darleny (ligada ao Google Agenda dela)

Complexidade: média. Quarta na ordem. Sem custo (Google Calendar API é gratuita).

## Objetivo
No workspace, Clemilson e a Dra. veem a agenda dela (dia, semana, mês) e criam, editam e apagam compromissos. O Google Agenda da Dra. continua sendo a fonte da verdade: o que muda no workspace aparece no celular dela, e vice-versa.

## Decisão de arquitetura
- **Fonte da verdade: Google Agenda** (`darlenycidreira2@gmail.com`, agenda principal ou uma agenda "DC Perícias" que ela escolher).
- **Supabase guarda**: o token de acesso da Dra. (cifrado, sem política RLS, só Edge Function lê), a configuração (qual agenda, fuso `America/Fortaleza` ou `America/Sao_Paulo` — confirmar) e um **registro de alterações** (quem criou/editou o quê pelo workspace). Não espelhar todos os eventos no banco na v1 (evita sincronização de mão dupla, que é onde nascem os erros).
- **Edge Functions** conversam com a Google Calendar API usando o token da Dra. Assim o Clemilson também mexe na agenda dela pelo workspace, sem precisar da senha dela.

## Passo zero (5 minutos, sem código, vale fazer já)
A Dra. abre o Google Agenda no computador → Configurações da agenda → "Compartilhar com pessoas específicas" → adiciona `clemilsonf.eng@gmail.com` com "Fazer alterações nos eventos". Clemilson passa a ver e editar a agenda dela no próprio app do Google. Isso também serve de reserva se a integração cair.

## Configuração no Google Cloud (Clemilson, guiado)
1. Projeto `dc-pericias-workspace` → APIs e serviços → Biblioteca → ativar **Google Calendar API** (grátis).
2. Google Auth Platform → **Acesso a dados** → adicionar escopo `https://www.googleapis.com/auth/calendar.events` (ler e alterar eventos; não pede acesso às configurações da conta).
3. **Público-alvo → Publicar app** (sair de "Testando" para "Em produção"). Motivo: em modo Testando o Google invalida o token de acesso a cada 7 dias e a agenda pararia toda semana. Em produção sem verificação, o Google mostra a tela "app não verificado" (já conhecida) e limita a 100 usuários, o que serve para os dois. Não pedir verificação (dá trabalho e não é necessária). Confirmar na hora que o painel aceita publicar com escopo sensível sem verificação; se exigir, manter Testando e aceitar reconectar a cada 7 dias até decidir.
4. Colar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nos segredos das Edge Functions do Supabase (valores do bloco de notas do Clemilson).

## Conectar a agenda (uma vez, pela Dra.)
Tela `agenda/conectar`, botão visível só quando a Dra. está logada:
- Chama `signInWithOAuth({ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/calendar.events', queryParams: { access_type: 'offline', prompt: 'consent' }, redirectTo: origin + '/agenda/conectar' } })`.
- Na volta, `session.provider_refresh_token` vem preenchido **só nesse momento**. O front envia esse valor para a Edge Function `agenda-conectar` (POST, com o JWT), que confere que quem está logado é a Dra. (`darlenycidreira2@gmail.com`) e grava em `ws_google_tokens` (tabela sem política; cifrar o valor com `pgsodium`/Vault do Supabase se disponível no Free, senão guardar e restringir acesso só à service role).
- Testar logo em seguida listando os próximos eventos.
- Se o token for revogado (ela trocar senha, remover acesso), a tela mostra "Reconectar agenda" para a Dra.

## Edge Functions
- `agenda-conectar` (POST): grava o refresh token (só aceita a Dra.).
- `agenda-eventos` (exige membro): troca o refresh token por um access token (`https://oauth2.googleapis.com/token`), guarda em memória por 50 min, e faz:
  - `GET ?inicio&fim` → `events.list` (`singleEvents=true`, `orderBy=startTime`, `timeZone`).
  - `POST` → `events.insert`.
  - `PATCH id` → `events.patch`.
  - `DELETE id` → `events.delete`.
  - Registra cada alteração em `ws_agenda_log` (quem, quando, ação, id do evento, título).
- Respostas do Google com erro `invalid_grant` → marcar conexão como caída e avisar na tela.

## Banco (migração `ws_agenda_criar`)
- `ws_google_tokens` (email pk, refresh_token text, escopos text, conectado_em, ultimo_uso, invalido bool). **Sem políticas.**
- `ws_agenda_config` (id=1, calendar_id text default 'primary', fuso text, duracao_padrao_min int default 60, cores jsonb). RLS: membros leem e alteram.
- `ws_agenda_log` (id, autor_email, acao, evento_id, titulo, quando). RLS: membros leem; insert só pela Edge Function.

## Tela (`agenda/`)
- Visões: **Dia** (padrão no celular), **Semana** (padrão no computador), **Lista** (próximos 14 dias). Navegação anterior/hoje/próximo.
- Implementar a grade à mão (CSS grid) ou usar uma biblioteca leve com versão fixa e SRI. Preferir à mão se der em ~400 linhas; evita dependência grande.
- Criar: toque em horário vazio abre formulário (título, data, início, fim ou duração, local/link, descrição, tipo: consulta inicial, perícia, call de venda, prazo processual, pessoal). O tipo vira prefixo no título e cor (`colorId` do Google).
- Editar/apagar: toque no evento.
- Prazo processual: evento de dia inteiro com lembrete (o Google cuida da notificação no celular da Dra.).
- Mostrar quem criou pelo workspace (do `ws_agenda_log`).
- Fuso fixo da configuração, exibido no canto.

## Integrações futuras (não na v1)
- Leads do site com dia/horário escolhido em `/agendar` (`leads_clientes`, origem `landing_agendar`) aparecem numa barra lateral "Pedidos de horário" com botão "Agendar" que cria o evento já preenchido.
- WhatsApp (ferramenta 7) consultando horários livres (`freebusy`) para sugerir ao lead.

## Pronto quando
- [ ] Dra. conectou uma vez; Clemilson vê e edita a agenda dela pelo workspace.
- [ ] Evento criado no workspace aparece no celular da Dra. em segundos; evento criado no celular aparece no workspace ao recarregar.
- [ ] Depois de 8 dias a agenda continua funcionando (prova de que o app saiu do modo Testando).
- [ ] Token nunca chega ao navegador; tabela de tokens sem política; `get_advisors` limpo.
