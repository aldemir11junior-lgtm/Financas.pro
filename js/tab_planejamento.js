// ─────────────────────────────────────────────────────────────────────────
// PLANEJAMENTO
// ─────────────────────────────────────────────────────────────────────────
const MESES_NOMES_PL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
let PL_MES_SEL = null; // {ano, mes(1-12)}
let PL_EVENTOS_ROWS = [];
let PL_FIXOS_ROWS = [];
let PL_LIMITES_ROWS = [];

function getMesPlanejamento(chaveMes) {
  if (!STATE.planejamentoMap[chaveMes]) {
    STATE.planejamentoMap[chaveMes] = { renda_prevista: 0, eventos: [], fixos_parcelas: [], limites_categoria: {}, meta_poupanca: 0, meta_investimento: 0 };
  }
  return STATE.planejamentoMap[chaveMes];
}

function renderPlanejamento() {
  const hoje = hojeBr();
  if (!PL_MES_SEL) PL_MES_SEL = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

  const container = qs('#page-Planejamento');
  container.innerHTML = `
    <div class="page-title">Planejamento <span>do Mês</span></div>
    <div class="page-sub">Monte o orçamento antes do mês começar: informe a renda prevista, os eventos e parcelas esperados, defina limites por categoria e metas de poupança/investimento — e veja a projeção antes mesmo de gastar um centavo.</div>

    <div class="form-row cols-2" style="max-width:520px;">
      <div class="field"><label>Mês de referência</label>
        <select id="pl-mes-sel">${MESES_NOMES_PL.map((m, i) => `<option value="${i + 1}" ${i + 1 === PL_MES_SEL.mes ? 'selected' : ''}>${m}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Ano</label>
        <select id="pl-ano-sel">
          <option value="${hoje.getFullYear()}" ${PL_MES_SEL.ano === hoje.getFullYear() ? 'selected' : ''}>${hoje.getFullYear()}</option>
          <option value="${hoje.getFullYear() + 1}" ${PL_MES_SEL.ano === hoje.getFullYear() + 1 ? 'selected' : ''}>${hoje.getFullYear() + 1}</option>
        </select>
      </div>
    </div>
    <div id="pl-aviso-mes"></div>
    <div id="pl-msg"></div>
    <div class="divider"></div>
    <div id="pl-corpo"></div>
  `;

  qs('#pl-mes-sel').addEventListener('change', e => { PL_MES_SEL.mes = parseInt(e.target.value); renderPlanejamentoCorpo(); });
  qs('#pl-ano-sel').addEventListener('change', e => { PL_MES_SEL.ano = parseInt(e.target.value); renderPlanejamentoCorpo(); });

  renderPlanejamentoCorpo();
}

function linhaEditorEvento(e) {
  return { descricao: e?.descricao || '', categoria: e?.categoria || '', valor_estimado: e?.valor_estimado ?? '' };
}
function linhaEditorFixo(f) {
  return { descricao: f?.descricao || '', categoria: f?.categoria || '', valor: f?.valor ?? '', tipo: f?.tipo || 'Fixo', parcelas_restantes: f?.parcelas_restantes ?? 0 };
}
function linhaEditorLimite(categoria, limite) {
  return { categoria: categoria || '', limite: limite ?? '' };
}

function renderPlanejamentoCorpo() {
  const hoje = hojeBr();
  const { ano, mes } = PL_MES_SEL;
  const chaveMes = `${ano}-${String(mes).padStart(2, '0')}`;
  const ehFuturo = new Date(ano, mes - 1, 1) > new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ehAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;

  const avisoBox = qs('#pl-aviso-mes');
  if (ehFuturo) avisoBox.innerHTML = `<div class="alerta alerta-success">Você está planejando um mês que <b>ainda não começou</b>. Perfeito — assim é possível se organizar com antecedência.</div>`;
  else if (ehAtual) avisoBox.innerHTML = `<div class="alerta alerta-warning">Você está ajustando o planejamento do mês <b>corrente</b>. A projeção abaixo já combina o que foi planejado com o que já foi de fato lançado.</div>`;
  else avisoBox.innerHTML = `<div class="alerta alerta-info">Você está revisando o planejamento de um mês passado.</div>`;

  const plano = getMesPlanejamento(chaveMes);
  PL_EVENTOS_ROWS = (plano.eventos || []).map(linhaEditorEvento);
  PL_FIXOS_ROWS = (plano.fixos_parcelas || []).map(linhaEditorFixo);
  PL_LIMITES_ROWS = Object.entries(plano.limites_categoria || {}).map(([c, v]) => linhaEditorLimite(c, v));

  const todasCategorias = [...new Set([...categoriasDisponiveis('despesa'), 'Casa','Carro','Moto','Saúde','Educação','Lazer','Presentes','Outros'])].sort();

  const corpo = qs('#pl-corpo');
  corpo.innerHTML = `
    <div class="section-title">Renda Prevista</div>
    <div class="field" style="max-width:280px;"><label>Quanto você espera receber neste mês?</label>
      <input type="number" min="0" step="50" id="pl-renda" value="${plano.renda_prevista || 0}">
    </div>
    <div class="divider"></div>

    <div class="section-title">Eventos e Gastos Previstos</div>
    <div class="caption">Coisas pontuais que você já sabe que vão acontecer nesse mês: uma viagem, um aniversário, uma compra planejada, um curso...</div>
    <div id="pl-eventos-editor"></div>
    <button class="btn btn-sm" id="pl-add-evento">+ Adicionar evento</button>
    <div class="divider"></div>

    <div class="section-title">Custos Fixos e Parcelas</div>
    <div class="caption">Contas que se repetem (aluguel, internet, assinaturas) e parcelas em andamento (financiamentos, compras parceladas).</div>
    <div id="pl-fixos-editor"></div>
    <button class="btn btn-sm" id="pl-add-fixo">+ Adicionar fixo/parcela</button>
    <div class="divider"></div>

    <div class="section-title">Limites de Gastos por Categoria</div>
    <div class="caption">Defina até quanto você quer gastar em cada categoria. A aba  Análise e Insights vai te avisar quando estiver perto de estourar.</div>
    <div id="pl-limites-editor"></div>
    <button class="btn btn-sm" id="pl-add-limite">+ Adicionar limite</button>
    <div class="divider"></div>

    <div class="section-title">Metas de Poupança e Investimento</div>
    <div class="form-row cols-2">
      <div class="field"><label>Meta de poupança do mês (R$)</label><input type="number" min="0" step="50" id="pl-meta-poupanca" value="${plano.meta_poupanca || 0}"></div>
      <div class="field"><label>Meta de investimento do mês (R$)</label><input type="number" min="0" step="50" id="pl-meta-invest" value="${plano.meta_investimento || 0}"></div>
    </div>

    <button class="btn btn-primary btn-block" id="pl-salvar">Salvar Planejamento do Mês</button>

    <div class="divider"></div>
    <div class="section-title">Projeção de Gastos por Categoria</div>
    <div id="pl-projecao"></div>
  `;

  renderEditorTabela('pl-eventos-editor', PL_EVENTOS_ROWS, [
    { campo: 'descricao', label: 'Evento', tipo: 'text' },
    { campo: 'categoria', label: 'Categoria', tipo: 'select', opcoes: todasCategorias },
    { campo: 'valor_estimado', label: 'Valor Estimado (R$)', tipo: 'number' },
  ]);
  renderEditorTabela('pl-fixos-editor', PL_FIXOS_ROWS, [
    { campo: 'descricao', label: 'Descrição', tipo: 'text' },
    { campo: 'categoria', label: 'Categoria', tipo: 'select', opcoes: todasCategorias },
    { campo: 'valor', label: 'Valor (R$)', tipo: 'number' },
    { campo: 'tipo', label: 'Tipo', tipo: 'select', opcoes: ['Fixo', 'Parcela'] },
    { campo: 'parcelas_restantes', label: 'Parcelas Restantes', tipo: 'number' },
  ]);
  renderEditorTabela('pl-limites-editor', PL_LIMITES_ROWS, [
    { campo: 'categoria', label: 'Categoria', tipo: 'select', opcoes: todasCategorias },
    { campo: 'limite', label: 'Limite (R$)', tipo: 'number' },
  ]);

  qs('#pl-add-evento').addEventListener('click', () => { PL_EVENTOS_ROWS.push(linhaEditorEvento()); renderEditorTabela('pl-eventos-editor', PL_EVENTOS_ROWS, [
    { campo: 'descricao', label: 'Evento', tipo: 'text' }, { campo: 'categoria', label: 'Categoria', tipo: 'select', opcoes: todasCategorias }, { campo: 'valor_estimado', label: 'Valor Estimado (R$)', tipo: 'number' },
  ]); });
  qs('#pl-add-fixo').addEventListener('click', () => { PL_FIXOS_ROWS.push(linhaEditorFixo()); renderEditorTabela('pl-fixos-editor', PL_FIXOS_ROWS, [
    { campo: 'descricao', label: 'Descrição', tipo: 'text' }, { campo: 'categoria', label: 'Categoria', tipo: 'select', opcoes: todasCategorias }, { campo: 'valor', label: 'Valor (R$)', tipo: 'number' }, { campo: 'tipo', label: 'Tipo', tipo: 'select', opcoes: ['Fixo','Parcela'] }, { campo: 'parcelas_restantes', label: 'Parcelas Restantes', tipo: 'number' },
  ]); });
  qs('#pl-add-limite').addEventListener('click', () => { PL_LIMITES_ROWS.push(linhaEditorLimite()); renderEditorTabela('pl-limites-editor', PL_LIMITES_ROWS, [
    { campo: 'categoria', label: 'Categoria', tipo: 'select', opcoes: todasCategorias }, { campo: 'limite', label: 'Limite (R$)', tipo: 'number' },
  ]); });

  qs('#pl-salvar').addEventListener('click', () => salvarPlanejamentoAtual(chaveMes, mes, ano));

  renderProjecaoPlanejamento(plano, ano, mes);
}

function renderEditorTabela(containerId, rows, colunas) {
  const box = qs('#' + containerId);
  let html = `<table class="editor-table"><thead><tr>${colunas.map(c => `<th>${c.label}</th>`).join('')}<th class="col-del"></th></tr></thead><tbody>`;
  rows.forEach((row, i) => {
    html += `<tr data-idx="${i}">`;
    for (const c of colunas) {
      if (c.tipo === 'select') {
        html += `<td><select data-campo="${c.campo}">${['', ...c.opcoes].map(o => `<option value="${escapeHtml(o)}" ${row[c.campo] === o ? 'selected' : ''}>${o || '—'}</option>`).join('')}</select></td>`;
      } else if (c.tipo === 'number') {
        html += `<td><input type="number" step="0.01" min="0" data-campo="${c.campo}" value="${row[c.campo]}"></td>`;
      } else {
        html += `<td><input type="text" data-campo="${c.campo}" value="${escapeHtml(row[c.campo])}"></td>`;
      }
    }
    html += `<td class="col-del"><button class="btn btn-sm btn-danger" data-del="${i}" aria-label="Remover linha">Remover</button></td></tr>`;
  });
  html += `</tbody></table>`;
  if (!rows.length) html += `<div class="caption">Nenhuma linha adicionada ainda.</div>`;
  box.innerHTML = html;

  qsa('input, select', box).forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.closest('tr').dataset.idx);
      const campo = inp.dataset.campo;
      rows[idx][campo] = inp.type === 'number' ? (inp.value === '' ? '' : parseFloat(inp.value)) : inp.value;
    });
  });
  qsa('[data-del]', box).forEach(btn => {
    btn.addEventListener('click', () => { rows.splice(parseInt(btn.dataset.del), 1); renderEditorTabela(containerId, rows, colunas); });
  });
}

async function salvarPlanejamentoAtual(chaveMes, mes, ano) {
  const btn = qs('#pl-salvar');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try {
    const eventosNovos = PL_EVENTOS_ROWS.filter(e => e.descricao && e.categoria && e.valor_estimado !== '' && e.valor_estimado != null)
      .map(e => ({ descricao: e.descricao.trim(), categoria: e.categoria, valor_estimado: parseFloat(e.valor_estimado) || 0 }));
    const fixosNovos = PL_FIXOS_ROWS.filter(f => f.descricao && f.categoria && f.valor !== '' && f.valor != null)
      .map(f => ({ descricao: f.descricao.trim(), categoria: f.categoria, valor: parseFloat(f.valor) || 0, tipo: f.tipo || 'Fixo', parcelas_restantes: parseInt(f.parcelas_restantes) || 0 }));
    const limitesNovos = {};
    for (const l of PL_LIMITES_ROWS) if (l.categoria && l.limite !== '' && l.limite != null) limitesNovos[l.categoria] = parseFloat(l.limite) || 0;

    const plano = {
      renda_prevista: parseFloat(qs('#pl-renda').value) || 0,
      eventos: eventosNovos,
      fixos_parcelas: fixosNovos,
      limites_categoria: limitesNovos,
      meta_poupanca: parseFloat(qs('#pl-meta-poupanca').value) || 0,
      meta_investimento: parseFloat(qs('#pl-meta-invest').value) || 0,
    };

    await salvarPlanejamentoMes(STATE.username, chaveMes, plano);
    STATE.planejamentoMap[chaveMes] = plano;

    qs('#pl-msg').innerHTML = `<div class="alerta alerta-success">Planejamento de ${MESES_NOMES_PL[mes - 1]}/${ano} salvo com sucesso! (${eventosNovos.length} evento(s), ${fixosNovos.length} fixo(s)/parcela(s), ${Object.keys(limitesNovos).length} limite(s) de categoria)</div>`;
    renderProjecaoPlanejamento(plano, ano, mes);
  } catch (e) {
    console.error(e);
    qs('#pl-msg').innerHTML = `<div class="alerta alerta-error">Erro ao salvar o planejamento: ${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar Planejamento do Mês';
  }
}

function renderProjecaoPlanejamento(plano, ano, mes) {
  const box = qs('#pl-projecao');
  const projMap = {};
  for (const e of (plano.eventos || [])) projMap[e.categoria] = (projMap[e.categoria] || 0) + (e.valor_estimado || 0);
  for (const f of (plano.fixos_parcelas || [])) projMap[f.categoria] = (projMap[f.categoria] || 0) + (f.valor || 0);

  const realMesMap = {};
  for (const l of STATE.lancamentos) {
    const d = parseISO(l.data);
    if (d.getFullYear() === ano && d.getMonth() + 1 === mes && l.tipo !== 'Receita') {
      realMesMap[l.classe] = (realMesMap[l.classe] || 0) + l.valor;
    }
  }

  const limitesAtuais = plano.limites_categoria || {};
  if (!Object.keys(projMap).length && !Object.keys(realMesMap).length) {
    box.innerHTML = `<div class="alerta alerta-info">Adicione eventos, custos fixos ou parcelas acima para ver a projeção por categoria.</div>`;
    return;
  }

  const todasCats = [...new Set([...Object.keys(projMap), ...Object.keys(realMesMap)])].sort();
  const valsProj = todasCats.map(c => projMap[c] || 0);
  const valsReal = todasCats.map(c => realMesMap[c] || 0);
  const valsLimite = todasCats.map(c => limitesAtuais[c] || 0);

  const totalPlanejado = valsProj.reduce((a, b) => a + b, 0);
  const rendaPrevista = plano.renda_prevista || 0;
  const saldoProj = rendaPrevista - totalPlanejado;
  const corSaldo = saldoProj >= 0 ? 'pos' : 'neg';
  const borSaldo = saldoProj >= 0 ? 'verde' : 'vermelho';

  let extra = `<div class="kpi-row" style="margin-top:14px;">
    <div class="kpi verde"><div class="kpi-label">Renda Prevista</div><div class="kpi-value pos">${fmtBRL(rendaPrevista)}</div></div>
    <div class="kpi vermelho"><div class="kpi-label">Total Planejado (Gastos)</div><div class="kpi-value neg">${fmtBRL(totalPlanejado)}</div></div>
    <div class="kpi ${borSaldo}"><div class="kpi-label">Saldo Projetado</div><div class="kpi-value ${corSaldo}">${fmtBRL(saldoProj)}</div></div>
  </div>`;

  const metaTotal = (plano.meta_poupanca || 0) + (plano.meta_investimento || 0);
  if (metaTotal > 0) {
    if (saldoProj >= metaTotal) {
      extra += `<div class="alerta alerta-success" style="margin-top:10px;">Pelo planejado, sobra o suficiente para bater suas metas de poupança e investimento (${fmtBRL(metaTotal)})!</div>`;
    } else {
      const falta = metaTotal - saldoProj;
      extra += `<div class="alerta alerta-warning" style="margin-top:10px;">Do jeito que está planejado, ainda faltam ${fmtBRL(falta)} para alcançar suas metas de poupança + investimento neste mês.</div>`;
    }
  }

  box.innerHTML = `<div class="chart-box"><canvas id="chart-projecao"></canvas></div>` + extra;
  graficoProjecao('chart-projecao', todasCats, valsProj, valsReal, valsLimite);
}
