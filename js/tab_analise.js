// ─────────────────────────────────────────────────────────────────────────
// ANÁLISE E INSIGHTS
// ─────────────────────────────────────────────────────────────────────────
function renderAnalise() {
  const container = qs('#page-Analise');
  const hoje = hojeBr();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaAtual = hoje.getDate();
  const fracaoMesPassado = diaAtual / diasNoMes;

  const chaveMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const plano = getMesPlanejamento(chaveMes);

  const lancMesAtual = STATE.lancamentos.filter(l => {
    const d = parseISO(l.data);
    return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
  });
  const despesasMesAtual = lancMesAtual.filter(l => l.tipo !== 'Receita');
  const receitasMesAtual = lancMesAtual.filter(l => l.tipo === 'Receita');

  const gastoPorCatAtual = {};
  for (const l of despesasMesAtual) gastoPorCatAtual[l.classe] = (gastoPorCatAtual[l.classe] || 0) + l.valor;

  const limites = plano.limites_categoria || {};

  const mesAnt = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
  const anoAnt = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const gastoPorCatAnt = {};
  for (const l of STATE.lancamentos) {
    const d = parseISO(l.data);
    if (d.getFullYear() === anoAnt && d.getMonth() === mesAnt && l.tipo !== 'Receita') {
      gastoPorCatAnt[l.classe] = (gastoPorCatAnt[l.classe] || 0) + l.valor;
    }
  }

  const insights = []; // [severidade, titulo, detalhe, cor]

  // 1) Estouro de limite
  for (const [cat, limite] of Object.entries(limites)) {
    if (limite <= 0) continue;
    const gastoCat = gastoPorCatAtual[cat] || 0;
    const pct = (gastoCat / limite) * 100;
    if (pct >= 100) {
      const excedente = gastoCat - limite;
      insights.push([0, `Estourou o limite de ${cat}`, `Você já gastou ${fmtBRL(gastoCat)} de um limite de ${fmtBRL(limite)} — ${fmtBRL(excedente)} acima do combinado (${pct.toFixed(0)}% do limite).`, '#c0392b']);
    } else if (pct >= 80) {
      insights.push([1, ` ${cat} perto do limite`, `Já foram usados ${pct.toFixed(0)}% do limite de ${cat} (${fmtBRL(gastoCat)} de ${fmtBRL(limite)}), e o mês ainda tem ${diasNoMes - diaAtual} dia(s) pela frente.`, '#f39c12']);
    } else if (pct >= fracaoMesPassado * 100 + 25 && diaAtual <= 20) {
      insights.push([2, `Ritmo acelerado em ${cat}`, `Já se passaram ${pct.toFixed(0)}% do limite de ${cat}, mas só ${(fracaoMesPassado * 100).toFixed(0)}% do mês. No ritmo atual, a categoria deve estourar antes do fim do mês.`, '#f1c40f']);
    }
  }

  // 2) Projeção de estouro por ritmo diário
  if (diaAtual > 3) {
    for (const [cat, limite] of Object.entries(limites)) {
      if (limite <= 0) continue;
      const gastoCat = gastoPorCatAtual[cat] || 0;
      const mediaDiaria = gastoCat / diaAtual;
      const projecaoFimMes = mediaDiaria * diasNoMes;
      if (projecaoFimMes > limite && gastoCat < limite) {
        insights.push([1, `Projeção de estouro em ${cat}`, `No ritmo atual (~${fmtBRL(mediaDiaria)}/dia), a projeção é fechar o mês em ${fmtBRL(projecaoFimMes)}, ${fmtBRL(projecaoFimMes - limite)} acima do limite de ${fmtBRL(limite)}.`, '#f39c12']);
      }
    }
  }

  // 3) Categorias sem limite mas relevantes
  const totalDespesasAtual = Object.values(gastoPorCatAtual).reduce((a, b) => a + b, 0);
  for (const [cat, val] of Object.entries(gastoPorCatAtual)) {
    if (!(cat in limites) && totalDespesasAtual > 0 && (val / totalDespesasAtual) >= 0.25) {
      insights.push([2, ` ${cat} concentra boa parte dos gastos`, `${cat} já representa ${((val / totalDespesasAtual) * 100).toFixed(0)}% de tudo que você gastou este mês (${fmtBRL(val)}), mas ainda não tem um limite definido no Planejamento.`, '#3498db']);
    }
  }

  // 4) Comparação com mês anterior
  for (const [cat, valAtual] of Object.entries(gastoPorCatAtual)) {
    const valAnt = gastoPorCatAnt[cat];
    if (valAnt && valAnt > 0) {
      const valAntProporcional = valAnt * fracaoMesPassado;
      if (valAntProporcional > 0 && valAtual > valAntProporcional * 1.3 && valAtual > 100) {
        insights.push([2, ` ${cat} subiu em relação ao mês passado`, `Até este ponto do mês, o gasto em ${cat} está ${(((valAtual / valAntProporcional) - 1) * 100).toFixed(0)}% maior do que no mesmo período do mês anterior.`, '#8e44ad']);
      }
    }
  }

  // 5) Progresso das metas
  const saldoMesAtual = receitasMesAtual.reduce((s, l) => s + l.valor, 0) - totalDespesasAtual;
  const metaTotal = (plano.meta_poupanca || 0) + (plano.meta_investimento || 0);
  if (metaTotal > 0) {
    const pctMeta = (saldoMesAtual / metaTotal) * 100;
    if (pctMeta >= 100) {
      insights.push([3, 'Meta de poupança/investimento batida', `Seu saldo atual do mês (${fmtBRL(saldoMesAtual)}) já cobre a meta combinada de ${fmtBRL(metaTotal)}. Bom trabalho!`, '#00704A']);
    } else if (pctMeta < fracaoMesPassado * 100 - 20) {
      insights.push([1, 'Meta de poupança/investimento em risco', `Faltam ${fmtBRL(metaTotal - saldoMesAtual)} para bater a meta de ${fmtBRL(metaTotal)} deste mês, e o mês já está ${(fracaoMesPassado * 100).toFixed(0)}% concluído.`, '#c0392b']);
    }
  }

  // 6) Sem planejamento
  if (!Object.keys(limites).length && !(plano.eventos || []).length && !(plano.fixos_parcelas || []).length) {
    insights.push([3, 'Nenhum planejamento cadastrado para este mês', 'Vá até a aba Planejamento e monte o orçamento do mês para receber alertas mais precisos aqui.', '#1a6645']);
  }

  insights.sort((a, b) => a[0] - b[0]);

  let html = `
    <div class="page-title">Análise <span>e Insights</span></div>
    <div class="page-sub">O que os seus números estão tentando te dizer — do problema mais urgente para o menos urgente.</div>
  `;

  if (!insights.length) {
    html += `<div class="alerta alerta-success">Nenhum alerta no momento. Seus gastos estão dentro do esperado para este ponto do mês!</div>`;
  } else {
    const nomesMeses = MESES_NOMES_PL;
    html += `<div style="font-size:0.78rem;color:var(--text-sub);margin-bottom:10px;">Análise referente a ${nomesMeses[hoje.getMonth()]}/${hoje.getFullYear()} · dia ${diaAtual} de ${diasNoMes} (${(fracaoMesPassado * 100).toFixed(0)}% do mês) · ${insights.length} ponto(s) de atenção, do mais urgente ao menos urgente.</div>`;
    for (const [, titulo, detalhe, cor] of insights) {
      html += `<div class="insight-card" style="border-left-color:${cor};"><div class="titulo">${titulo}</div><div class="detalhe">${detalhe}</div></div>`;
    }
  }

  html += `<div class="divider"></div>`;

  if (Object.keys(limites).length || Object.keys(gastoPorCatAtual).length) {
    html += `<div class="section-title">Planejado x Real por Categoria</div>`;
    const catsGeral = [...new Set([...Object.keys(limites), ...Object.keys(gastoPorCatAtual)])].sort();
    for (const cat of catsGeral) {
      const limiteC = limites[cat] || 0;
      const gastoC = gastoPorCatAtual[cat] || 0;
      let pctC = 0, corBarra = '#b0b0b0', textoPct = 'sem limite';
      if (limiteC > 0) {
        pctC = Math.min((gastoC / limiteC) * 100, 100);
        corBarra = gastoC >= limiteC ? '#c0392b' : (gastoC / limiteC >= 0.8 ? '#f39c12' : '#05C47A');
        textoPct = `${((gastoC / limiteC) * 100).toFixed(0)}%`;
      }
      html += `<div style="margin-bottom:10px;">
        <div class="barra-linha"><span><b>${escapeHtml(cat)}</b></span><span>${fmtBRL(gastoC)}${limiteC > 0 ? ` / ${fmtBRL(limiteC)}` : ''} · ${textoPct}</span></div>
        <div class="barra-fundo"><div class="barra-cheia" style="width:${pctC}%;background:${corBarra};"></div></div>
      </div>`;
    }
  } else {
    html += `<div class="alerta alerta-info">Assim que você tiver limites definidos no Planejamento e lançamentos registrados, essa comparação aparece aqui.</div>`;
  }

  container.innerHTML = html;
}
