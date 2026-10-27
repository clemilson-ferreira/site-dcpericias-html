# Ferramenta 1: gerador de propostas comerciais (PDF no padrão DC Perícias)

Complexidade: média. Terceira na ordem. Sem IA na primeira versão; sem custo.

## Objetivo
Montar uma proposta comercial preenchendo um formulário e sair com um PDF idêntico em padrão ao modelo de 21/10/2026 (`C:\Users\clemi\Downloads\DC Perícias Médicas Proposta Comercial - Signed2026-10_261021_173951.pdf`). Guardar o histórico para reabrir, duplicar e acompanhar status.

## Anatomia do modelo (o que reproduzir)
Página A4 (595,92 × 841,92 pt), 5 páginas:
1. **Capa** de página inteira, fundo azul-marinho (`#06222f`/`#0a2733`), logo horizontal dourado centralizado no alto, filete dourado, título "PROPOSTA COMERCIAL" (caixa alta, espaçado, branco), subtítulo dourado com o tipo de serviço ("Assistência técnica médica em perícia judicial"), bloco "Preparada para / PARTE RECLAMADA / Processo nº …", ano no rodapé. Capa sem número de página.
2. **Páginas internas** com timbrado:
   - Faixa azul-marinho no topo com o logo horizontal centralizado.
   - Número da página no canto superior direito, abaixo da faixa.
   - Marca d'água do símbolo (arcos) grande e clara no centro/fundo.
   - Rodapé: filete fino, linha "Dra. Darleny Cidreira | CRM-MA 5133 | RQE 2360" e linha de contatos com ícones dourados: telefone (98) 92003-2113, e-mail dra-darleny@dcpericias.com, site dcpericias.com.
   - Texto: fonte sem serifa tipo Arial, ~12 pt, justificado, recuo na primeira linha, entrelinha ~1,5 (padrão ABNT).
   - Títulos numerados em caixa alta, negrito, azul-marinho: "1 IDENTIFICAÇÃO", "2 A DC PERÍCIAS MÉDICAS", … ; subtítulos "4.1 …".
   - Listas com alíneas "a)", "b)", "c)" com recuo francês.
   - **Quadro** com cabeçalho azul-marinho ("Quadro 1: Serviços e investimento"), linhas com rótulo em negrito à esquerda, bordas finas azuladas, e "Fonte: DC Perícias Médicas (2026)." logo abaixo (padrão ABNT de quadros).
   - Fecho: "Ficamos à disposição…", cidade e data por extenso ("São Luís (MA), 21 de outubro de 2026."), linha de assinatura, nome, "Médica, CRM-MA 5133, RQE 2360", "DC Perícias Médicas".
3. Seções do modelo: 1 Identificação (Para, A/C, Processo nº, Reclamante, Reclamadas, Perito do Juízo, Data e local da perícia), 2 A DC Perícias Médicas, 3 Objeto da proposta (+ resumo da ação e o que não faz parte), 4 Serviços ofertados (4.1 quesitos, 4.2 acompanhamento, 4.3 impugnação), 5 Metodologia, 6 Serviços e investimento (quadro), 7 Condições gerais de pagamento.
4. A assinatura digital (selo "Assinado digitalmente por… Data…", canto inferior esquerdo) foi aplicada **depois**, fora da ferramenta. Continua assim: a ferramenta gera o PDF sem assinatura e a Dra. assina no mesmo assinador que usa hoje (por exemplo, o assinador gratuito do gov.br). Confirmar com o Clemilson qual assinador usam.

Arquivos de marca já existentes em `dcpericias-v37/assets/`: `logo-dcpericias-horizontal.png` (2604×1331, texto claro, serve para capa e faixa escura), `logo-simbolo-puro.png` (1089×1722, para a marca d'água com opacidade baixa), `logo-simbolo-marca-dagua-v1.webp`. Copiar para `workspace/propostas/assets/`. Os ícones do rodapé: desenhar em SVG inline (telefone, envelope, globo) em dourado.

## Como gerar o PDF sem servidor e sem custo
**HTML paginado + impressão do navegador (Salvar como PDF).** Texto vetorial, nítido, pesquisável, igual ao original.
- Usar **Paged.js** (polyfill de CSS Paged Media, licença MIT, via jsdelivr com versão exata + SRI) para: `@page` A4 com margens, `@page :first` sem margem (capa sangrada), cabeçalho e rodapé repetidos em toda página interna, contador `counter(page)` no canto superior direito, quebra de página controlada (`break-before: page` nas seções que pedirem, `break-inside: avoid` no quadro e na assinatura).
- `print-color-adjust: exact` (e `-webkit-`) para imprimir os fundos azuis sem o usuário marcar "gráficos de plano de fundo".
- Botão **"Gerar PDF"** chama `window.print()`; o título do documento (`document.title`) vira o nome sugerido do arquivo: `DC Pericias - Proposta <numero> - <cliente>`.
- Testar no Chrome do computador e no Chrome do Android (os dois imprimem para PDF).
- Alternativa descartada: html2pdf/jsPDF (vira imagem, texto borrado e arquivo pesado). Geração no servidor exigiria Chrome headless, que o Supabase Free e a hospedagem compartilhada não oferecem.

## Banco (migração `ws_propostas_criar`)
```sql
create table public.ws_propostas (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,              -- "2026-001", gerado por função/sequence por ano
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aceita','recusada','arquivada')),
  modelo text not null,                     -- chave do modelo de texto (ver abaixo)
  dados jsonb not null default '{}',        -- todos os campos do formulário
  valor_pix numeric(12,2),
  valor_cartao_total numeric(12,2),
  parcelas_cartao int,
  criada_por text not null default lower(auth.jwt() ->> 'email'),
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  enviada_em timestamptz, respondida_em timestamptz
);
```
- RLS padrão. Função `ws_proximo_numero_proposta()` (security definer, só membros) que devolve o próximo número do ano.
- Tabela `ws_proposta_modelos` (chave, nome, `blocos jsonb`, ativo) para os textos-padrão, editáveis sem novo deploy. Na primeira versão pode começar como constante em `propostas/modelos.js` e migrar para a tabela depois.

## Modelos de texto (primeira leva)
Escrever a partir do texto do PDF-modelo, com marcadores `{{campo}}`. Clemilson revisa cada um antes de valer.
- `assistencia-judicial-reclamada`: o modelo atual (quesitos + acompanhamento + impugnação).
- `assistencia-judicial-reclamante`: mesmo, do lado do autor.
- `impugnacao-laudo`: só análise de laudo + impugnação.
- `previdenciario`: INSS/BPC (fases de análise, parecer, preparação para perícia).
- `defesa-medica` e `erro-medico`: análise de prontuário + parecer.
Cada modelo define: subtítulo da capa, seções e quais serviços (4.x) aparecem marcados por padrão. Serviços são blocos que o usuário liga/desliga; a numeração (4.1, 4.2…) e as alíneas da metodologia se refazem sozinhas.

## Tela (`propostas/`)
- **Lista**: número, cliente, processo, valor, status (chips coloridos), data. Filtro por status. Ações: Abrir, Duplicar, Mudar status.
- **Editor** em duas colunas no computador (formulário à esquerda, pré-visualização paginada à direita) e em abas no celular (Formulário | Prévia):
  - Bloco Identificação: para, a/c, processo nº, vara/tribunal, reclamante, reclamadas (lista, uma por linha), perito do juízo (com "a confirmar nos autos"), data/hora/local da perícia.
  - Bloco Caso: resumo da ação (texto livre), o que não faz parte do objeto.
  - Bloco Serviços: checkboxes dos serviços do modelo; texto de cada um editável (começa com o padrão).
  - Bloco Quesitos-alvo: lista editável que vira as alíneas a), b), c)…
  - Bloco Investimento: valor PIX; regra de parcelamento (padrão: 50% no aceite e 50% até um dia antes da perícia, data calculada); cartão em N parcelas com acréscimo (padrão 20%, como no modelo: R$ 5.800 → 12 × R$ 580 = R$ 6.960). Calcular e mostrar valores **por extenso** automaticamente.
  - Local e data do fecho (padrão: "São Luís (MA)" e hoje; data por extenso).
  - Salvamento automático do rascunho (debounce 1,5 s) e indicador "Salvo".
- **Prévia** renderizada com Paged.js a cada mudança (com debounce; Paged.js é pesado, rodar no máximo a cada 800 ms).

## Utilitários com teste
- `valorPorExtenso(5800)` → "cinco mil e oitocentos reais"; centavos ("… e cinquenta centavos"); milhões; 1 real/1 centavo no singular. Criar testes simples (arquivo `propostas/testes.html` que roda asserts no console) com pelo menos 15 casos, incluindo 6.960, 2.900, 580, 1.001, 100, 101, 1.000.000.
- `dataPorExtenso(2026-10-21)` → "21 de outubro de 2026".
- Formatação BRL com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`.

## Fase 2 (depois, opcional, usa API do Claude)
Botão "Rascunho com IA": manda os dados do caso (ou a análise da ferramenta 2) para uma Edge Function que pede ao Claude o texto das seções 3 e 4 no tom do modelo. Custo de centavos por proposta. Só depois que a ferramenta 2 existir (reaproveita a infraestrutura).

## Confirmar com o Clemilson antes de começar
- Acréscimo do cartão é sempre 20%? Parcelas máximas 12?
- Cidade do fecho sempre "São Luís (MA)"? (A skill da colinha diz para não dizer ao cliente que a empresa é de São Luís; o PDF-modelo traz São Luís no fecho. Decidir.)
- Qual assinador digital usam.

## Pronto quando
- [ ] PDF gerado a partir dos dados do modelo de 21/10 fica visualmente igual ao original (comparar página a página, lado a lado).
- [ ] Capa sem número; internas com faixa, número, marca d'água e rodapé em todas.
- [ ] Quadro não quebra no meio; assinatura não fica órfã em página nova.
- [ ] Valores por extenso corretos (testes passando).
- [ ] Funciona no celular (gerar PDF pelo Chrome do Android).
- [ ] Histórico, duplicar e status funcionando; RLS padrão; `get_advisors` limpo.
