# Ferramenta 2: analisador de casos e gerador da colinha

Complexidade: alta. Quinta na ordem. Usa a API do Claude (cobrança por token, sem assinatura).

## Objetivo
Dentro do workspace: subir tudo o que o lead mandou (PDFs, fotos de documentos, prints de WhatsApp, exportação de conversa) e receber, alguns minutos depois, a mesma entrega que a skill `colinha-venda-dc-pericias` faz hoje no Claude Code: (1) análise honesta do que o papel prova e não prova, com selos FATO / INFERÊNCIA / HIPÓTESE / OPINIÃO; (2) a colinha HTML dos 7 passos de venda, pronta para baixar.

Fonte da regra de negócio: `C:\Users\clemi\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\local-agent-mode-sessions\skills-plugin\ec8d7cd2-6441-4fae-81e5-9d4181de814a\f666b128-e514-4e49-93dc-2e614dba614c\skills\colinha-venda-dc-pericias\SKILL.md`. O executor lê esse arquivo inteiro antes de escrever o prompt.

## Como a IA entra (decisão)
- **API do Claude** (console.anthropic.com), créditos pré-pagos, chave guardada como segredo `ANTHROPIC_API_KEY` nas Edge Functions do Supabase. Nada de chave no navegador.
- A assinatura Claude do Clemilson (Claude.ai / Claude Code) **não** cobre a API; são créditos separados. Configurar limite mensal de gasto no Console (sugestão inicial: US$ 20/mês) e alerta por e-mail.
- **Modelo**: `claude-opus-5-5` (o mais indicado para análise cuidadosa de documento médico; US$ 4 por milhão de tokens de entrada e US$ 20 por milhão de saída, tabela de 06/10/2026). Alternativa mais barata, se o Clemilson preferir depois de comparar resultados: `claude-sonnet-5-5` (US$ 2 / US$ 10). A escolha fica numa tabela de configuração, não no código.
- **Pensamento**: `thinking: {type: "adaptive"}`, `output_config.effort: "high"` (no Opus 5.5 o padrão é `medium`; definir explicitamente).
- **Batches API** (Message Batches): processamento assíncrono com **50% de desconto**. Resolve o limite de tempo das Edge Functions (a análise pode passar de 2 minutos, e a função grátis não pode esperar isso). Normalmente o lote termina em minutos; o teto teórico é 24 h. A tela mostra o status e avisa quando terminar.
- **Files API**: cada arquivo é enviado uma vez para a Anthropic e referenciado por `file_id` no pedido (evita o limite de 32 MB por requisição). Apagar os arquivos da Anthropic depois que o resultado chegar.
- **Saída estruturada**: `output_config.format` com JSON Schema. O Claude devolve **dados** (JSON); o workspace monta o HTML com um molde fixo. Vantagens: visual sempre igual ao aprovado, menos tokens de saída (mais barato e mais rápido), fácil reabrir e reimprimir. (Citations não combina com saída estruturada; não usar.)
- Limites de PDF nos modelos de 1M de contexto: até 600 páginas por pedido. Imagens: JPEG, PNG, GIF, WebP.

### Estimativa de custo por análise (ordem de grandeza)
Dossiê típico: ~30 páginas de PDF + 10 imagens ≈ 60 mil tokens de entrada; saída ≈ 8 mil tokens de JSON + raciocínio ≈ 20 mil. No Opus 5.5 com desconto de lote: ~US$ 0,12 (entrada) + ~US$ 0,20 (saída) ≈ **US$ 0,30 a 0,60 por caso**. Dossiês grandes (200 páginas) podem chegar a US$ 2. Registrar `usage` de cada análise na tabela para o Clemilson acompanhar.

## Fluxo completo
1. **Novo caso** (tela `casos/novo`): nome do lead, cidade/UF, tipo provável (previdenciário INSS/BPC, assistência técnica judicial, impugnação, defesa médica, erro médico, não sei), lado (autor/réu/não se aplica), quem é (pessoa física ou advogado), "o que o lead disse" (texto livre: a queixa nas palavras dele), observações do Clemilson/Dra.
2. **Arquivos**: arrastar ou escolher (no celular, câmera/galeria). Aceitar PDF, JPG, PNG, WebP, HEIC (converter no navegador; o Chrome do Android não decodifica HEIC, então usar a lib `heic2any` com versão fixa, ou pedir JPG), ZIP (descompactar no navegador com `fflate`, versão fixa) e o `.txt` da exportação de conversa do WhatsApp ("Exportar conversa → Anexar mídia" gera um ZIP com o .txt e as fotos; aceitar direto).
   - Redimensionar imagens no navegador para no máximo 1568 px no lado maior, JPEG qualidade 85 (economiza tokens sem perder legibilidade). Manter rotação EXIF.
   - Áudios (`.opus`) não são lidos pelo Claude: listar como "não analisado" e avisar.
   - Mostrar lista com miniatura, nome, páginas/tamanho, botão remover. Limite por caso: 100 arquivos, 150 MB no total.
3. **Upload** para o Supabase Storage, bucket privado `ws-casos`, caminho `<caso_id>/<arquivo>`. Políticas de Storage só para membros (`eh_membro_workspace()`).
4. **Analisar** (botão): chama a Edge Function `casos-analisar` com o `caso_id`. Ela:
   1. confere que o usuário é membro;
   2. lê os arquivos do Storage e envia cada um para a Files API (guarda os `file_id` em `ws_caso_arquivos`);
   3. monta o pedido (system = prompt da colinha, versão atual da tabela `ws_prompts`; user = blocos `document`/`image` por `file_id` + texto com os dados do formulário, a data de hoje e os parâmetros vigentes da tabela `ws_parametros`);
   4. cria o lote (`messages.batches.create`) com um único pedido, `custom_id = analise_id`;
   5. grava `status = 'processando'` e `batch_id`, responde rápido.
5. **Coleta** (Edge Function `casos-coletar`, disparada por **pg_cron a cada 2 minutos** via `pg_net`, com segredo próprio no cabeçalho): para cada análise `processando`, consulta o lote; quando `ended`, lê o resultado, valida o JSON contra o schema, grava em `resultado`, grava `usage` e custo estimado, apaga os arquivos na Files API, marca `concluida` (ou `erro` com a mensagem). Se o `stop_reason` for `refusal` ou `max_tokens`, marcar `erro` com explicação legível.
6. **Aviso**: a tela do caso escuta a tabela por Realtime e troca o "Analisando…" pelo resultado. Opcional: notificação por e-mail/Telegram reaproveitando `notif_config` (já existe).
7. **Resultado** (tela `casos/ver`): mostra primeiro o **achado principal** (a skill manda dizer isso antes de tudo), depois a análise em cartões e a colinha. Botões: **Baixar colinha (.html autocontido)**, **Imprimir/PDF**, **Copiar resumo** (texto curto para WhatsApp interno), **Reanalisar** (com arquivos novos ou instrução extra: novo pedido com o resultado anterior + orientação do usuário).
8. **Ligação com outras ferramentas**: botão "Criar proposta a partir deste caso" (ferramenta 1, fase 2) e, no futuro, arquivos chegando pelo WhatsApp (ferramenta 7).

## Banco (migração `ws_casos_criar`)
- `ws_casos` (id, nome_lead, cidade, uf, tipo, lado, perfil, relato_lead, observacoes, status: novo/analisando/analisado/arquivado, criado_por, criado_em, atualizado_em).
- `ws_caso_arquivos` (id, caso_id, caminho_storage, nome_original, mime, bytes, paginas, anthropic_file_id, enviado_em, removido_em).
- `ws_analises` (id, caso_id, status: na_fila/processando/concluida/erro, modelo, effort, prompt_versao, batch_id, resultado jsonb, erro text, tokens_entrada, tokens_saida, custo_estimado_usd numeric, criada_em, concluida_em, criada_por).
- `ws_prompts` (chave, versao, texto, ativo) — o prompt da colinha fica aqui, editável sem novo deploy. Guardar também o texto em `workspace/_fontes/prompts/colinha-v1.md` (fora do que vai para o ar) para histórico.
- `ws_parametros` (chave, valor, atualizado_em): `salario_minimo_2026`, `modelo_analise`, `effort_analise`, preços por produto (a skill proíbe inventar preço; se não houver, a colinha sai com `R$ ______`).
- RLS padrão nas tabelas do caso. `ws_prompts` e `ws_parametros`: membros leem e alteram.
- pg_cron: `casos-coletar` a cada 2 min; limpeza diária que apaga do Storage os arquivos de casos com mais de 90 dias (prazo a confirmar com o Clemilson; o Storage grátis tem 1 GB).

## Prompt (system) — como montar
Adaptar a skill para a API, sem as partes que dependem de ferramentas do Claude Code:
- Manter: leitura completa de cada documento; registro por documento (data, emissor, CRM, CID, medicação, o que afirma e o que não afirma); `Confirmar no original` para manuscrito incerto; achado nº 1 quando o diagnóstico dito pelo lead não aparece no papel; classificação do caso; selos epistêmicos; triagem de viabilidade (qualidade de segurado, carência, BPC 1/4 do salário mínimo — valor vindo de `ws_parametros`, não da memória do modelo); regras clínicas citadas na skill; CID-10 apenas; os 7 passos com nomes e metas fixos; falas no feminino pela Dra.; sem promessa de resultado (CFM 2.336/2023); não citar rede de parceiros; posicionamento "Somos Brasil"; preço nunca inventado; nota "para a Dra., fora da call"; viabilidade em faixa percentual, dita como estimativa subjetiva.
- Retirar: descompactar com PIL, Playwright, SendUserFile, consultar memória (substituído por `ws_parametros`).
- Fontes externas: o modelo não navega no lote. A colinha cita só fontes fornecidas em `ws_parametros` (ex.: link oficial do salário mínimo) e marca o resto como "conferir".
- Pedir que o modelo marque no JSON quando faltar documento essencial (ex.: CNIS) e o que pedir ao lead.

## Schema da resposta (resumo; o executor detalha com `additionalProperties: false` e `required`)
```
achado_principal: { texto, confianca: alta|media|baixa }
classificacao: { perfil, produto, lado }
prep: [string]                         // "Leia antes de entrar · 2 minutos", 4 a 5 itens
fatos: [{ rotulo, valor }]             // "O caso, em uma olhada"
analise: {
  sustenta:   [{ selo, texto, fonte }],
  nao_prova:  [{ selo, texto, fonte }],
  fraquezas:  [{ selo, texto }],
  pendencias: [string],
  caminhos:   [{ titulo, quando, descricao }],
  viabilidade: { faixa_min, faixa_max, justificativa },
  nota_para_dra: [string]
}
documentos: [{ arquivo, data, emissor, registro, cid, medicacao, afirma, nao_afirma, confirmar_original: bool }]
triagem: [{ pergunta, por_que }]       // perguntas do passo 2
passos: [ { numero 1..7, titulo, meta, falas: [string], itens: [string], avisos: [string] } ]
preco: { fases: [{ nome, valor_texto }], observacao }
se_travar: [{ objecao, resposta }]
fontes: [{ titulo, url, secundaria: bool }]
documentos_faltando: [{ documento, por_que }]
```

## Molde da colinha (front-end)
- `casos/colinha-molde.js` recebe o JSON e monta o HTML com os **tokens e componentes da skill** (seção "Referência visual": `--navy`, `--gold`, `.prep`, `.facts`, `.step`, `.say`, `.warn`, `.note`, `.price`, `.acard`, selos `.b.f/.b.i/.b.h`, ordem das seções, rodapé "Firme no valor, calorosa na escuta. A venda acontece no passo 2, não no 5.").
- Montar com `textContent`/`createElement` (o JSON vem do modelo; nunca `innerHTML` com conteúdo dele).
- "Baixar colinha": gera um `.html` único com CSS embutido (fontes Google via `<link>` são aceitáveis no arquivo baixado) usando `Blob` + `download`. Nome: `colinha-<nome-lead>-<data>.html`.
- Conferir em 390 px de largura sem rolagem horizontal.

## Edge Functions
- `casos-analisar` (chamada pelo navegador, exige membro). SDK `npm:@anthropic-ai/sdk` no Deno. Ler a skill `claude-api` (TypeScript: README, files-api, batches) antes de escrever.
- `casos-coletar` (chamada pelo pg_cron; valida `x-cron-secret`).
- Tratar erros por tipo (limite de taxa, 5xx com nova tentativa; 400 vira erro legível).
- Registrar no banco, nunca em log, qualquer trecho de documento.

## Etapas de entrega
1. Banco + Storage + upload + tela de caso (sem IA). Testar com arquivos fictícios.
2. `casos-analisar` + `casos-coletar` com um caso fictício (documentos inventados, sem dado real) e conferir JSON.
3. Molde da colinha a partir do JSON; comparar visualmente com uma colinha já aprovada feita pela skill.
4. Rodar 2 ou 3 casos reais já analisados antes pela skill e comparar achados (Clemilson e Dra. avaliam). Ajustar o prompt na tabela.
5. Limpeza automática e painel de custo (total do mês por análise).

## O que o Clemilson precisa fazer
- Criar conta/organização em console.anthropic.com (se ainda não tiver), comprar créditos (mínimo que o Console permitir), criar a chave e colar no Supabase como `ANTHROPIC_API_KEY`. Definir o limite mensal.
- Decidir: prazo de retenção dos arquivos (sugestão 90 dias), modelo padrão (Opus 5.5 recomendado), preços por produto para `ws_parametros`.

## Pronto quando
- [ ] Caso criado do celular com fotos e PDF; análise chega sozinha na tela.
- [ ] Colinha baixada abre offline e fica igual ao padrão da skill.
- [ ] Custo de cada análise registrado; limite no Console configurado.
- [ ] Arquivos apagados da Anthropic após a coleta; limpeza do Storage agendada.
- [ ] Membros veem; ninguém mais (Storage e tabelas); `get_advisors` limpo.
