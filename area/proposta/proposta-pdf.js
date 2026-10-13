// Gerador da Proposta Comercial DC Perícias.
// Reproduz o modelo "Proposta Comercial 003-180926": papel timbrado (imagem de fundo, em 9 tiras JPEG
// idênticas às do PDF original) + texto vivo por cima. Medidas em pt, A4, y medido do topo da página.
// Funciona no navegador e no Node: recebe o construtor jsPDF e as tiras do papel (Uint8Array) já carregadas.

export const PAGE = { w: 595.32, h: 841.92 };
const L = 56.6;            // margem esquerda do texto
const R = 540.0;           // limite direito do texto
const RULE_X0 = 55.2, RULE_X1 = 540.0;
const BULLET_X = 70.2, BULLET_TEXT_X = 83.6;
const RULE_COLOR = [31, 58, 95];
const BOX_FILL = [238, 242, 247], BOX_BORDER = [197, 206, 218];
const BODY = 11, H2 = 13, TITLE = 16;
const LINE = 15.85;       // passo de linha do corpo (medido no modelo)
const BOTTOM = 772;        // nenhum conteúdo abaixo disto (o rodapé do papel começa ~790)
const TOP_P2 = 132;        // topo do primeiro bloco nas páginas seguintes
const ASCENT = 0.89;       // ajuste entre "topo da caixa do texto" (medido no modelo) e a linha de base

export const FIXOS = {
  subtitulo: 'Assistência técnica pericial médica',
  condicoes: [
    ['Início dos trabalhos:', 'os trabalhos terão início somente após a confirmação do pagamento.'],
    ['Contrato:', 'será enviado a você um contrato de prestação de serviços para assinatura, que formaliza escopo, prazos e responsabilidades das partes.'],
    ['Sigilo:', 'todo o material produzido é confidencial e entregue apenas ao(à) advogado(a) contratante.'],
    ['Resultado:', 'a assistência técnica é uma atividade de meio. Não há garantia de resultado no processo, que depende também da prova produzida e da decisão judicial.'],
  ],
  comoAvancar: [
    'Você confirma o aceite desta proposta e a forma de pagamento (PIX ou cartão).',
    'Enviamos os dados para pagamento e o contrato para assinatura.',
    'Confirmado o pagamento, iniciamos os trabalhos e agendamos a reunião de alinhamento técnico.',
  ],
  assinatura: ['Dra. Darleny Cidreira', 'CRM-MA 5133 · RQE 2360 — DC Perícias'],
};

export const PADRAO = {
  numero: '003',
  data: '2026-09-18',
  tratamento: 'Ao Dr.',
  destinatario: 'Matheus Barros Santos',
  referencia: 'Caso D.S.O. — trauma ortopédico com múltiplos atendimentos e procedimentos',
  sobreOCaso: 'O caso envolve um trauma ortopédico de membro inferior, com atendimento hospitalar de urgência, mais de um momento de intervenção com repercussão funcional atestada.',
  jaFeitoIntro: 'Leitura integral e preliminar de todo o conjunto documental e mapeamentos dos pontos importantes para a elaboração de um parecer técnico. A sequência estrutural para o futuro parecer será a seguinte:',
  jaFeitoItens: [
    'cronologia e sequência da assistência prestada;',
    'coerência entre os documentos e o enquadramento diagnóstico registrado;',
    'condutas assistenciais e a forma como foram documentadas;',
    'repercussão funcional e capacidade laborativa;',
    'elementos úteis à formulação de quesitos.',
  ],
  jaFeitoFecho: 'As conclusões, os fundamentos e as estratégias decorrentes desse mapa ficam reservados ao parecer técnico. Eles são apresentados exclusivamente ao advogado contratante após a formalização da contratação.',
  escopo: [
    'Análise técnica completa da documentação médica do caso.',
    'Elaboração de parecer técnico fundamentado, para uso exclusivo do(a) advogado(a) contratante.',
    'Sugestão de quesitos técnicos para a perícia judicial, se necessária.',
    'Reunião de alinhamento técnico com o(a) advogado(a) para apresentação das conclusões.',
    'Análise do laudo do perito judicial e manifestação técnica sobre ele, quando for produzido.',
  ],
  valorAVista: 1800,
};

// Regra comercial (Clemilson, 13/10/2026): 12 parcelas, cada uma = 1/10 do valor à vista (total parcelado = 120%).
export function calcularInvestimento(valorAVista) {
  const aVista = Math.round(valorAVista * 100) / 100;
  const parcela = Math.round(aVista * 10) / 100;          // 1/10 do valor, em centavos
  const total = Math.round(parcela * 12 * 100) / 100;
  return { aVista, parcelas: 12, parcela, total };
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const brl = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function dataPorExtenso(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}
export function nomeArquivo(v) {
  const [a, m, d] = v.data.split('-');
  return `DC Perícias - Proposta Comercial ${v.numero}-${d}${m}${a.slice(2)}.pdf`;
}

export function gerarProposta(JsPDF, tiras, dados) {
  const v = { ...PADRAO, ...dados };
  const doc = new JsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({ title: `Proposta Comercial ${v.numero} — DC Perícias Médicas`, author: 'DC Perícias Médicas' });

  // ---- papel timbrado: 9 tiras empilhadas cobrindo a página inteira
  const totalPx = 3494; // soma das alturas das tiras no PDF original
  const alturas = [388, 389, 389, 389, 389, 389, 389, 389, 383];
  const fundo = () => {
    let y = 0;
    tiras.forEach((bytes, i) => {
      const h = alturas[i] * PAGE.h / totalPx;
      doc.addImage(bytes, 'JPEG', 0, y, PAGE.w, h + 0.4, undefined, 'FAST');
      y += h;
    });
  };
  // Rodapé: a imagem do papel traz "CRM 5133-MA"; cobrimos só essa linha e a reescrevemos com o RQE,
  // no mesmo centro, linha de base, altura de maiúsculas e cor medidos na imagem (px→pt: 0,23681 em x; 0,24096 em y).
  const rodape = () => {
    const yTira = 3111 * PAGE.h / totalPx;                 // topo da última tira
    doc.setFillColor(255, 255, 255);
    doc.rect(250, yTira + 226 * 0.24096, 113, 50 * 0.24096, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12.55); doc.setTextColor(14, 45, 57);
    doc.setCharSpace(-0.28);
    doc.text('CRM 5133-MA · RQE 2360', 1295.5 * 0.23681, yTira + 269.5 * 0.24096, { align: 'center', baseline: 'alphabetic' });
    doc.setCharSpace(0);
  };
  const papel = () => { fundo(); rodape(); };
  papel();

  let y = 0; // "topo" da próxima linha, como medido no modelo
  const font = (style, size) => { doc.setFont('times', style); doc.setFontSize(size); doc.setTextColor(0, 0, 0); };
  const txt = (s, x, top, size) => doc.text(s, x, top + size * ASCENT - 1.3, { baseline: 'alphabetic' });
  const novaPagina = () => { doc.addPage(); papel(); y = TOP_P2; };
  const garante = (altura) => { if (y + altura > BOTTOM) novaPagina(); };
  // quebra de linha gulosa; 'recuo' reduz só a largura da primeira linha (rótulo em negrito)
  const wrap = (s, w, style, size, recuo = 0) => {
    font(style, size);
    const linhas = []; let atual = '';
    for (const palavra of s.split(' ')) {
      const teste = atual ? atual + ' ' + palavra : palavra;
      const largura = w - (linhas.length === 0 ? recuo : 0);
      if (doc.getTextWidth(teste) <= largura || !atual) atual = teste; else { linhas.push(atual); atual = palavra; }
    }
    linhas.push(atual);
    return linhas;
  };

  // ---- título e identificação
  y = 150;
  font('bold', TITLE); txt('PROPOSTA COMERCIAL', L, y, TITLE);
  font('normal', H2); txt(FIXOS.subtitulo, L, 171, H2);
  const meta = [['Data: ', dataPorExtenso(v.data)], [v.tratamento + ' ', v.destinatario], ['Referência: ', v.referencia]];
  let my = 196;
  for (const [rotulo, valor] of meta) {
    font('bold', BODY); txt(rotulo, L, my, BODY);
    const wx = doc.getTextWidth(rotulo.trimEnd()) + (doc.getTextWidth('x x') - doc.getTextWidth('xx')); // rótulo + 1 espaço em negrito
    // valor longo quebra de linha; as linhas seguintes voltam à margem esquerda, como no modelo (HTML)
    wrap(valor, R - L, 'normal', BODY, wx).forEach((l, i) => { font('normal', BODY); txt(l, i === 0 ? L + wx : L, my + i * 14.65, BODY); });
    my += 14.65 * wrap(valor, R - L, 'normal', BODY, wx).length;
  }
  y = my - 14.65 + 29.7; // o modelo deixa ~30 pt entre a última linha de identificação e o título 1
  // ---- blocos
  let n = 0;
  const secao = (titulo, folga) => {
    garante(15 + 8 + 16 * 2);            // título + régua + pelo menos 2 linhas (não deixa título órfão)
    n += 1;
    font('bold', H2); txt(`${n}. ${titulo}`, L, y, H2);
    doc.setFillColor(...RULE_COLOR); doc.rect(RULE_X0, y + 15.1, RULE_X1 - RULE_X0, 0.7, 'F');
    y += 15.1 + 7.9 + folga;
  };
  const paragrafo = (s) => {
    const ls = wrap(s, R - L, 'normal', BODY);
    for (const l of ls) { garante(16); font('normal', BODY); txt(l, L, y, BODY); y += LINE; }
  };
  const lista = (itens, primeiroGap = 5) => {
    y += primeiroGap;
    for (const it of itens) {
      const rotulo = Array.isArray(it) ? it[0] + ' ' : '';
      const corpo = Array.isArray(it) ? it[1] : it;
      font('bold', BODY); const wr = rotulo ? doc.getTextWidth(rotulo) : 0;
      const ls = wrap(corpo, R - BULLET_TEXT_X, 'normal', BODY, wr);
      garante(15.3 * ls.length + 4);
      font('normal', BODY); txt('•', BULLET_X, y, BODY);
      ls.forEach((l, i) => {
        const x = BULLET_TEXT_X + (i === 0 ? wr : 0);
        if (i === 0 && rotulo) { font('bold', BODY); txt(rotulo.trim(), BULLET_TEXT_X, y, BODY); }
        font('normal', BODY); txt(l, x, y + i * 15.3, BODY);
      });
      y += 15.3 * (ls.length - 1) + 19.3;
    }
    y -= 19.3 - LINE; // a última linha volta ao passo do corpo
  };

  secao('Sobre o caso', 0);
  paragrafo(v.sobreOCaso);
  y += 35.7;

  secao('O que já foi feito', 0);
  paragrafo(v.jaFeitoIntro);
  lista(v.jaFeitoItens, 6);
  y += 4.3; paragrafo(v.jaFeitoFecho);
  y += 35.8;

  secao('Escopo previsto', 0);
  lista(v.escopo, 0);
  y += 22;

  // Investimento: título + caixa de duas colunas são mantidos juntos
  garante(15 + 8 + 62);
  secao('Investimento', 0); y -= 2.2;
  const bx = 56.6, bw = 235, gx = 292.1, by = y, bh = 60.4;
  doc.setDrawColor(...BOX_BORDER); doc.setLineWidth(0.5);
  doc.setFillColor(...BOX_FILL);
  doc.rect(bx, by, bw, bh, 'FD'); doc.rect(gx, by, 526.6 - gx + 0.4, bh, 'FD');
  const inv = calcularInvestimento(v.valorAVista);
  const colA = ['À VISTA · PIX', brl(inv.aVista), 'pagamento único via PIX'];
  const colB = ['PARCELADO · CARTÃO DE CRÉDITO', `${inv.parcelas}x de ${brl(inv.parcela)}`, `total ${brl(inv.total)}`];
  [[colA, 66.0], [colB, 300.8]].forEach(([c, x]) => {
    font('bold', 12); txt(c[0], x, by + 9.3, 12); txt(c[1], x, by + 25.1, 12);
    font('normal', 12); txt(c[2], x, by + 40.8, 12);
  });
  y = by + bh + 45;

  secao('Condições', 18.6);
  lista(FIXOS.condicoes, 0);
  y += 32.9;

  secao('Como avançar', 21.2);
  FIXOS.comoAvancar.forEach((s, i) => { garante(22); font('normal', BODY); txt(`${i + 1}. ${s}`, L, y, BODY); y += 22; });
  y += 35.7; garante(30);
  font('bold', BODY); txt(FIXOS.assinatura[0], L, y, BODY);
  font('normal', BODY); txt(FIXOS.assinatura[1], L, y + 14.6, BODY);

  return doc;
}
