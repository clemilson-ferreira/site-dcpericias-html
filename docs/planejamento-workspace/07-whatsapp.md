# Ferramenta 7: integração com o WhatsApp (com liga/desliga)

Complexidade: alta e ainda em maturação. Última na ordem. Custo: tokens do Claude + eventuais mensagens-modelo da Meta (sem mensalidade).

## O que dá para fazer (resumo para decidir)
Um assistente que:
1. Recebe as mensagens do número comercial da DC Perícias.
2. Mostra as conversas numa caixa de entrada no workspace.
3. Conforme o modo escolhido no **liga/desliga**:
   - **Desligado**: só registra; ninguém responde automaticamente.
   - **Rascunho**: o Claude escreve a resposta sugerida; Clemilson ou a Dra. aprova/edita e envia pelo workspace (recomendado para começar).
   - **Automático**: o Claude responde sozinho dentro de regras (acolher, entender o caso, pedir documentos, oferecer horário), e passa para humano quando necessário.
4. Guarda documentos enviados pelo lead e permite mandar o caso para o **analisador (ferramenta 2)** com um toque.
5. Consulta horários livres da **agenda (ferramenta 3)** para sugerir call.

## Caminho técnico recomendado: WhatsApp Cloud API oficial (Meta), direto, sem intermediário
- **Por quê**: oficial (sem risco de banimento), sem mensalidade, webhooks entregues numa Edge Function do Supabase (sem servidor ligado 24 h).
- **Descartados**:
  - Bibliotecas não oficiais (Baileys, Evolution API, WPPConnect): exigem servidor sempre ligado (custo de VPS) e violam os termos do WhatsApp, com risco real de bloquear o número da empresa.
  - Intermediários (BSPs como Twilio, Z-API, Take Blip, etc.): cobram mensalidade ou taxa por mensagem acima da Meta.
- **Custo da Meta** (modelo por mensagem, conferir a tabela atual da Meta para o Brasil antes de ligar): responder dentro de 24 h depois da última mensagem do cliente é gratuito; mensagens-modelo de utilidade dentro dessa janela também; mensagens-modelo de marketing e as enviadas fora da janela são cobradas por envio. Como o fluxo da DC Perícias é o lead que chama, quase tudo cai no gratuito.
- **Custo do Claude**: cada resposta curta custa frações de centavo de dólar (conversa com histórico de ~5 mil tokens de entrada e ~300 de saída). Usar o mesmo `ANTHROPIC_API_KEY` da ferramenta 2.

## Decisões que o Clemilson precisa tomar antes de qualquer código
1. **Qual número**: o atual (98) 92003-2113? Hoje ele está no app WhatsApp Business ou no WhatsApp comum?
   - A Meta tem o modo **Coexistência**: o mesmo número continua no app **WhatsApp Business** do celular e passa a funcionar também pela Cloud API; as mensagens aparecem nos dois lados. É o cenário ideal (a Dra. continua usando o app normalmente).
   - Se o número estiver no WhatsApp comum (não Business), migrar antes para o WhatsApp Business (mantém histórico no próprio aparelho).
   - Alternativa sem mexer no número atual: um número novo só para a API.
2. **Tintim**: a política de privacidade cita o Tintim (rastreamento de conversas do WhatsApp para atribuir anúncios). Confirmar com o Tintim se ele continua funcionando com o número em Coexistência. Se houver conflito, decidir qual fica.
3. **O que o assistente pode dizer**: tom, horário de atendimento, quando passar para humano, se pode falar preço (recomendação: não falar valor; levar para a call, como nos 7 passos), regras do CFM (sem promessa de resultado, sem diagnóstico).
4. **Modo inicial**: Rascunho por pelo menos 2 semanas antes de pensar em Automático.

## Configuração na Meta (Clemilson, guiado passo a passo pelo executor)
1. Meta Business Suite: conta empresarial da DC Perícias (verificação da empresa pode ser pedida; ter CNPJ e documentos à mão).
2. developers.facebook.com → Criar app (tipo Empresa) → adicionar produto WhatsApp.
3. Registrar o número (Coexistência pelo app WhatsApp Business: escanear QR no próprio app) ou número novo.
4. Criar usuário de sistema com token permanente (`WA_TOKEN`), anotar `WA_PHONE_ID`, `WA_APP_SECRET`; inventar `WA_VERIFY_TOKEN`. Colar todos nos segredos do Supabase.
5. Webhook: URL da Edge Function `whatsapp-webhook`, token de verificação = `WA_VERIFY_TOKEN`; assinar os campos `messages` (e `smb_message_echoes` em Coexistência, para saber quando a Dra. respondeu pelo app).

## Banco (migração `ws_whatsapp_criar`)
- `ws_wa_config` (id=1, modo: desligado/rascunho/automatico, horario_inicio, horario_fim, dias, mensagem_fora_horario, pausa_humano_horas int default 12, prompt_chave, atualizado_por, atualizado_em). RLS: membros leem e alteram. **Este é o liga/desliga.**
- `ws_wa_contatos` (wa_id pk, nome, telefone, lead_ref (tabela, id) opcional, caso_id opcional, criado_em).
- `ws_wa_conversas` (id, wa_id, status: aberta/aguardando_humano/encerrada, bot_pausado_ate timestamptz, ultima_msg_em, nao_lidas int).
- `ws_wa_mensagens` (id, conversa_id, wa_message_id unique, direcao: entrada/saida, autor: lead/bot/humano_app/humano_workspace, tipo: texto/imagem/documento/audio/…, texto, midia_caminho, status_envio, criado_em).
- `ws_wa_rascunhos` (id, conversa_id, texto, gerado_em, aprovado_por, enviado_em, descartado bool).
- Storage: bucket privado `ws-whatsapp` para mídias recebidas.
- RLS padrão nas tabelas de conversa. Realtime em `ws_wa_mensagens` e `ws_wa_rascunhos`.

## Edge Functions
- `whatsapp-webhook`:
  - `GET`: verificação (`hub.mode`, `hub.verify_token`, devolve `hub.challenge`).
  - `POST`: valida `X-Hub-Signature-256` com `WA_APP_SECRET` (HMAC SHA-256 do corpo bruto; rejeitar se não bater). Responde 200 **imediatamente** e processa em segundo plano (`EdgeRuntime.waitUntil`).
  - Grava mensagem (idempotente por `wa_message_id`), baixa mídia (Graph API `/{media-id}` → URL → download com `WA_TOKEN`) para o Storage.
  - Eco de mensagem enviada pelo app (Coexistência) → marca `bot_pausado_ate = agora + pausa_humano_horas` (humano assumiu).
  - Se modo ≠ desligado, dentro do horário e conversa não pausada → chama o Claude com o histórico recente + prompt do assistente; em **rascunho** grava em `ws_wa_rascunhos`; em **automático** envia pela Graph API (`POST /{WA_PHONE_ID}/messages`) e grava.
  - Fora do horário: envia `mensagem_fora_horario` uma vez por conversa por dia.
- `whatsapp-enviar` (exige membro): envia texto/aprovação de rascunho pelo workspace. Fora da janela de 24 h só pode mandar mensagem-modelo aprovada (avisar na tela).
- Claude: modelo e effort em `ws_parametros` (sugestão: `claude-opus-5-5` com effort `low` para respostas curtas e rápidas; o Clemilson pode trocar para `claude-sonnet-5-5` ou `claude-haiku-5-5` se quiser reduzir custo, comparando qualidade em rascunho). Ler a skill `claude-api` antes. Resposta tem que caber no tempo da função (respostas curtas, `max_tokens` baixo, sem lote).

## Tela (`whatsapp/`)
- Topo: **interruptor grande de modo** (Desligado / Rascunho / Automático) com confirmação ao ligar o Automático e registro de quem mudou. Indicador de horário de atendimento.
- Caixa de entrada: lista de conversas (nome, última mensagem, não lidas, selo "bot pausado" / "aguardando humano").
- Conversa: balões estilo WhatsApp; rascunho do Claude em destaque com botões Enviar / Editar / Descartar; campo para escrever; botão "Pausar bot nesta conversa"; botão "Abrir caso no analisador" (cria `ws_casos` com as mídias da conversa e o texto, ferramenta 2).
- Configurações: horário, mensagem fora do horário, horas de pausa, prompt do assistente (editável, versionado).

## Prompt do assistente (diretrizes para o executor redigir e o Clemilson aprovar)
- Fala em nome da equipe da Dra. Darleny, em português simples, acolhedor, mensagens curtas (WhatsApp).
- Objetivo: entender o caso (o que aconteceu, tipo: INSS/BPC, trabalho, erro médico, processo judicial; se tem advogado; cidade), pedir documentos, oferecer call com a Dra. em horário livre.
- Nunca: dar diagnóstico, opinar sobre chance de ganhar, prometer resultado ou prazo, falar valor (levar para a call), citar parceiros, dizer que a empresa é de São Luís.
- Passa para humano quando: pedido de preço insistente, cliente irritado, assunto fora do escopo, urgência médica (orientar procurar atendimento), advogado querendo negociar.
- Responde sempre com no máximo ~3 frases.

## Etapas de entrega
1. Decisões (número, Tintim, regras) + configuração na Meta.
2. Webhook + gravação + caixa de entrada só leitura (modo Desligado).
3. Envio pelo workspace (humano) + pausa automática quando a Dra. responde pelo app.
4. Modo Rascunho com Claude. Duas semanas de uso, ajustar prompt.
5. Modo Automático com horário, pausas e passagem para humano.
6. Ligações: analisador (02) e agenda (03, `freebusy`).

## Pronto quando
- [ ] Interruptor muda o comportamento na hora (testar os três modos com um número de teste).
- [ ] Mensagens e mídias chegam ao workspace; assinatura do webhook validada.
- [ ] Quando a Dra. responde pelo app, o bot pausa naquela conversa.
- [ ] Nenhuma resposta automática fora das regras em 2 semanas de Rascunho.
- [ ] Tokens e segredos só nas Edge Functions; `get_advisors` limpo.
