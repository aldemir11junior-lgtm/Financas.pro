// ─────────────────────────────────────────────────────────────────────────
// LANÇAMENTOS — Manual + Importar Excel
// ─────────────────────────────────────────────────────────────────────────
let LANC_SUBABA = 'manual';
let EXCEL_STATE = null; // { linhasOk, linhasRev, ehReceita, formaPagamento, usarCatExtra, colCatExtra }

function renderLancamentos() {
  const container = qs('#page-Lancamentos');
  container.innerHTML = `
    <div class="page-title">Novo <span>Lançamento</span></div>
    <div class="page-sub">Informe data e valor, e escolha a Categoria (visão macro) e a Descrição (detalhe).</div>

    <div class="login-abas" style="max-width:420px;">
      <button class="login-aba-btn ${LANC_SUBABA === 'manual' ? 'active' : ''}" data-sub="manual">Lançamento Manual</button>
      <button class="login-aba-btn ${LANC_SUBABA === 'excel' ? 'active' : ''}" data-sub="excel">Importar Excel</button>
    </div>
    <div id="lanc-corpo"></div>
  `;
  qsa('[data-sub]', container).forEach(btn => btn.addEventListener('click', () => { LANC_SUBABA = btn.dataset.sub; renderLancamentos(); }));

  if (LANC_SUBABA === 'manual') renderLancamentoManual();
  else renderImportarExcel();
}

function dataParcelaMensal(dataInicial, mesesDepois) {
  const [ano, mes, dia] = dataInicial.split('-').map(Number);
  const dataAlvo = new Date(ano, mes - 1 + mesesDepois, 1);
  const ultimoDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth() + 1, 0).getDate();
  dataAlvo.setDate(Math.min(dia, ultimoDia));
  return dataISO(dataAlvo);
}

// ── Lançamento Manual ──────────────────────────────────────────────────
function renderLancamentoManual() {
  const box = qs('#lanc-corpo');
  box.innerHTML = `
    <div id="ml-msg"></div>
    <div class="form-row cols-2">
      <div class="field"><label>Data</label><input type="date" id="ml-data" value="${dataISO(hojeBr())}"></div>
      <div class="field"><label>Valor (R$)</label><input type="number" id="ml-valor" min="0.01" step="0.01"></div>
    </div>
    <div class="form-row cols-2">
      <div class="field"><label>Tipo</label>
        <div class="radio-group">
          <label><input type="radio" name="ml-tipo" value="Receita" checked>  Receita</label>
          <label><input type="radio" name="ml-tipo" value="Despesa">  Despesa</label>
        </div>
      </div>
      <div class="field"><label>Forma de Pagamento</label>
        <select id="ml-forma">${FORMAS_PAGAMENTO.map(f => `<option value="${f}">${f}</option>`).join('')}</select>
      </div>
    </div>
    <div id="ml-recorrencia-area" style="display:none">
      <div class="field">
        <label class="radio-group"><input type="checkbox" id="ml-parcelado"> Parcelar esta despesa</label>
      </div>
      <div class="field" id="ml-parcelas-area" style="display:none;max-width:260px">
        <label for="ml-parcelas">Quantidade de parcelas</label>
        <input type="number" id="ml-parcelas" min="2" max="600" step="1" value="2">
      </div>
      <div class="caption">Será criado um lançamento por mês, com o valor informado para cada parcela.</div>
    </div>
    <div class="form-row cols-2" id="ml-cat-desc"></div>
    <button class="btn btn-primary btn-block" id="ml-submit">Registrar Lançamento</button>
  `;

  const atualizarCatDesc = () => {
    const tipoFinal = qs('input[name="ml-tipo"]:checked').value;
    const tipoChave = tipoFinal === 'Receita' ? 'receita' : 'despesa';
    const catOpts = categoriasDisponiveis(tipoChave);
    const catBox = qs('#ml-cat-desc');
    if (!catOpts.length) {
      catBox.innerHTML = `<div class="alerta alerta-warning">Nenhuma categoria de ${tipoFinal} cadastrada ainda. Peça ao administrador para cadastrar as categorias diretamente no banco de dados.</div>`;
      return;
    }
    catBox.innerHTML = `
      <div class="field"><label>Categoria</label><select id="ml-categoria">${catOpts.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Descrição</label><select id="ml-descricao"></select></div>
    `;
    const atualizarDesc = () => {
      const cat = qs('#ml-categoria').value;
      const descOpts = descricoesDisponiveis(tipoChave, cat);
      const descSel = qs('#ml-descricao');
      if (descOpts.length) {
        descSel.innerHTML = descOpts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
        descSel.disabled = false;
      } else {
        descSel.innerHTML = `<option value="">Nenhuma descrição cadastrada</option>`;
        descSel.disabled = true;
      }
    };
    qs('#ml-categoria').addEventListener('change', atualizarDesc);
    atualizarDesc();
  };
  const atualizarParcelamento = () => {
    const ehDespesa = qs('input[name="ml-tipo"]:checked').value === 'Despesa';
    const area = qs('#ml-recorrencia-area');
    area.style.display = ehDespesa ? 'block' : 'none';
    if (!ehDespesa) qs('#ml-parcelado').checked = false;
    qs('#ml-parcelas-area').style.display = ehDespesa && qs('#ml-parcelado').checked ? 'block' : 'none';
  };
  qs('#ml-parcelado').addEventListener('change', atualizarParcelamento);
  qsa('input[name="ml-tipo"]').forEach(r => r.addEventListener('change', atualizarCatDesc));
  qsa('input[name="ml-tipo"]').forEach(r => r.addEventListener('change', atualizarParcelamento));
  atualizarParcelamento();
  atualizarCatDesc();

  qs('#ml-submit').addEventListener('click', async () => {
    const msgBox = qs('#ml-msg');
    const tipoFinal = qs('input[name="ml-tipo"]:checked').value;
    const categoriaSel = qs('#ml-categoria');
    const descSel = qs('#ml-descricao');
    const valor = parseFloat(qs('#ml-valor').value);
    const data = qs('#ml-data').value;
    const forma = qs('#ml-forma').value;
    const parcelado = tipoFinal === 'Despesa' && qs('#ml-parcelado').checked;
    const totalParcelas = parcelado ? Number(qs('#ml-parcelas').value) : 1;

    if (!categoriaSel || !descSel || !categoriaSel.value || !descSel.value) {
      msgBox.innerHTML = `<div class="alerta alerta-error">Não foi possível registrar: selecione uma Categoria e uma Descrição válidas.</div>`;
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      msgBox.innerHTML = `<div class="alerta alerta-error">Não foi possível registrar: informe um valor maior que zero.</div>`;
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || dataISO(parseISO(data)) !== data) {
      msgBox.innerHTML = `<div class="alerta alerta-error">Informe uma data válida para o lançamento.</div>`;
      return;
    }
    if (parcelado && (!Number.isInteger(totalParcelas) || totalParcelas < 2 || totalParcelas > 600)) {
      msgBox.innerHTML = `<div class="alerta alerta-error">Informe uma quantidade de parcelas entre 2 e 600.</div>`;
      return;
    }
    const btn = qs('#ml-submit');
    btn.disabled = true; btn.textContent = parcelado ? 'Registrando parcelas...' : 'Registrando...';
    try {
      const recorrenciaId = parcelado ? crypto.randomUUID() : '';
      const novos = Array.from({ length: totalParcelas }, (_, indice) => ({
        id: novoIdLancamento() + indice,
        data: dataParcelaMensal(data, indice),
        valor,
        descricao: descSel.value,
        categoria_extra: '',
        forma_pagamento: forma,
        tipo: tipoFinal,
        classe: categoriaSel.value,
        recorrencia_id: recorrenciaId,
        parcela_numero: parcelado ? indice + 1 : null,
        total_parcelas: parcelado ? totalParcelas : null,
      }));
      await inserirLancamentosEmLote(STATE.username, novos);
      STATE.lancamentos.unshift(...novos);
      atualizarFooter();
      const resumoParcelas = parcelado ? ` em ${totalParcelas} parcelas mensais de ${fmtBRL(valor)}` : '';
      msgBox.innerHTML = `<div class="alerta alerta-success">${parcelado ? `${totalParcelas} parcelas registradas` : 'Lançamento registrado com sucesso'}: ${escapeHtml(categoriaSel.value)} · ${escapeHtml(descSel.value)}${resumoParcelas}</div>`;
      qs('#ml-valor').value = '';
      qs('#ml-parcelado').checked = false;
      atualizarParcelamento();
    } catch (e) {
      console.error(e);
      msgBox.innerHTML = `<div class="alerta alerta-error">Erro ao registrar o lançamento: ${escapeHtml(e.message)}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = 'Registrar Lançamento';
    }
  });
}

// ── Importar Excel ─────────────────────────────────────────────────────
function encontrarColuna(colunas, palavras) {
  for (const c of colunas) {
    const cn = String(c).toLowerCase().trim();
    if (palavras.some(p => cn.includes(p))) return c;
  }
  return null;
}
function parseValorPlanilha(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v > 0 ? v : null;
  let s = String(v).replace('R$', '').trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return (!isNaN(n) && n > 0) ? n : null;
}
function parseDataPlanilha(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // número serial do Excel
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000);
  }
  const s = String(v).trim();
  // tenta dd/mm/yyyy primeiro
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
    if (!isNaN(dt.getTime())) return dt;
  }
  const dt2 = new Date(s);
  return isNaN(dt2.getTime()) ? null : dt2;
}

function renderImportarExcel() {
  const box = qs('#lanc-corpo');
  box.innerHTML = `
    <div class="section-title">Importar planilha Excel</div>
    <div class="caption">Envie um arquivo <b>.xlsx</b> ou <b>.xls</b>. O sistema tentará identificar automaticamente as colunas de <b>data</b>, <b>valor</b> e <b>descrição</b>. Linhas não identificadas serão listadas para preenchimento manual.</div>

    <div class="form-row cols-2">
      <div class="field"><label>O que você está importando?</label>
        <div class="radio-group">
          <label><input type="radio" name="imp-tipo" value="receita" checked>  Receitas</label>
          <label><input type="radio" name="imp-tipo" value="despesa">  Despesas</label>
        </div>
      </div>
      <div class="field"><label>Forma de Pagamento (aplicada a todas as linhas)</label>
        <select id="imp-forma">${FORMAS_PAGAMENTO.map(f => `<option value="${f}">${f}</option>`).join('')}</select>
      </div>
    </div>

    <div class="upload-box" id="imp-upload-box">
      <input type="file" id="imp-arquivo" accept=".xlsx,.xls" style="display:none">
      <div>Clique para selecionar o arquivo Excel</div>
    </div>
    <div id="imp-resultado"></div>
  `;
  qs('#imp-upload-box').addEventListener('click', () => qs('#imp-arquivo').click());
  qs('#imp-arquivo').addEventListener('change', processarArquivoExcel);
}

function processarArquivoExcel(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(ws, { defval: null });
      if (!linhas.length) {
        qs('#imp-resultado').innerHTML = `<div class="alerta alerta-error">A planilha está vazia.</div>`;
        return;
      }
      montarRevisaoExcel(linhas);
    } catch (err) {
      console.error(err);
      qs('#imp-resultado').innerHTML = `<div class="alerta alerta-error">Erro ao ler o arquivo: ${escapeHtml(err.message)}</div>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

function montarRevisaoExcel(linhas) {
  const colunas = Object.keys(linhas[0]);
  const colData = encontrarColuna(colunas, ['data', 'date', 'dt', 'dia']);
  const colValor = encontrarColuna(colunas, ['valor', 'value', 'quantia', 'montante', 'vl', 'amount', 'total', 'preço', 'preco', 'price']);
  const colDesc = encontrarColuna(colunas, ['descri', 'desc', 'historico', 'hist', 'memo', 'observ', 'detalhe', 'título', 'titulo', 'nome']);

  const resultBox = qs('#imp-resultado');
  resultBox.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-sub);margin:10px 0;"> ${linhas.length} linhas encontradas · Colunas: ${colunas.join(', ')}</div>
    <div style="font-size:0.78rem;color:var(--text-sub);margin:6px 0 4px;">Colunas detectadas automaticamente. Ajuste abaixo se algo estiver errado:</div>
    <div class="form-row cols-3">
      <div class="field"><label>Coluna de Data</label><select id="imp-col-data">${colunas.map(c => `<option value="${escapeHtml(c)}" ${c === colData ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Coluna de Valor</label><select id="imp-col-valor">${colunas.map(c => `<option value="${escapeHtml(c)}" ${c === colValor ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Coluna de Descrição</label><select id="imp-col-desc">${colunas.map(c => `<option value="${escapeHtml(c)}" ${c === colDesc ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>
    </div>
    <div class="field" id="imp-cat-extra-check-box" style="display:none;">
      <label><input type="checkbox" id="imp-usar-cat-extra"> Usar uma coluna como Categoria (ex: Alimentação) para segmentar os gastos depois</label>
    </div>
    <div class="field" id="imp-col-cat-extra-box" style="display:none;"><label>Coluna que representa a Categoria</label><select id="imp-col-cat-extra">${colunas.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select></div>
    <div id="imp-linhas"></div>
  `;

  const ehReceitaInicial = () => qs('input[name="imp-tipo"]:checked').value === 'receita';
  function atualizarVisibilidadeCatExtra() {
    const mostra = !ehReceitaInicial();
    qs('#imp-cat-extra-check-box').style.display = mostra ? 'block' : 'none';
    qs('#imp-col-cat-extra-box').style.display = (mostra && qs('#imp-usar-cat-extra')?.checked) ? 'block' : 'none';
  }
  qsa('input[name="imp-tipo"]').forEach(r => r.addEventListener('change', () => { atualizarVisibilidadeCatExtra(); recalcularLinhasExcel(linhas); }));

  const rebind = () => {
    qs('#imp-col-data').addEventListener('change', () => recalcularLinhasExcel(linhas));
    qs('#imp-col-valor').addEventListener('change', () => recalcularLinhasExcel(linhas));
    qs('#imp-col-desc').addEventListener('change', () => recalcularLinhasExcel(linhas));
    qs('#imp-usar-cat-extra').addEventListener('change', () => { atualizarVisibilidadeCatExtra(); recalcularLinhasExcel(linhas); });
    qs('#imp-col-cat-extra').addEventListener('change', () => recalcularLinhasExcel(linhas));
  };
  rebind();
  atualizarVisibilidadeCatExtra();
  recalcularLinhasExcel(linhas);
}

function recalcularLinhasExcel(linhas) {
  const colData = qs('#imp-col-data').value;
  const colValor = qs('#imp-col-valor').value;
  const colDesc = qs('#imp-col-desc').value;
  const ehReceita = qs('input[name="imp-tipo"]:checked').value === 'receita';
  const usarCatExtra = !ehReceita && qs('#imp-usar-cat-extra')?.checked;
  const colCatExtra = usarCatExtra ? qs('#imp-col-cat-extra').value : null;

  const linhasOk = [];
  const linhasRev = [];

  linhas.forEach((row, idx) => {
    const dParsed = parseDataPlanilha(row[colData]);
    const vParsed = parseValorPlanilha(row[colValor]);
    const sRaw = row[colDesc];
    const sParsed = (sRaw !== null && sRaw !== undefined) ? String(sRaw).trim() : '';
    const sOk = sParsed.length >= 2;
    let catExtra = '';
    if (usarCatExtra && colCatExtra && row[colCatExtra] != null) catExtra = String(row[colCatExtra]).trim();

    if (dParsed && vParsed && sOk) {
      linhasOk.push({ idx, data: dParsed, valor: vParsed, desc: sParsed, catExtra });
    } else {
      linhasRev.push({ idx, dOk: !!dParsed, dVal: dParsed, vOk: !!vParsed, vVal: vParsed, sOk, sVal: sParsed, catExtra });
    }
  });

  EXCEL_STATE = { linhasOk, linhasRev, ehReceita, revisaoValores: {} };
  renderLinhasExcel();
}

function classificarParaImportacao(desc, ehReceita) {
  if (ehReceita) return ['Receita', 'Receita'];
  const [tipo, cls] = classificar(desc);
  if (tipo === 'Receita') return ['Variável', 'Outros'];
  return [tipo, cls];
}

function renderLinhasExcel() {
  const { linhasOk, linhasRev, ehReceita } = EXCEL_STATE;
  const box = qs('#imp-linhas');
  let html = '';

  if (linhasOk.length) {
    html += `<div class="section-title"> ${linhasOk.length} linha(s) prontas para importar</div>`;
    for (const item of linhasOk.slice(0, 5)) {
      const [tipoP, clsP] = classificarParaImportacao(item.desc, ehReceita);
      const catTag = item.catExtra ? ` ·  ${escapeHtml(item.catExtra)}` : '';
      html += `<div class="excel-row excel-row-ok">
        <span style="font-size:0.72rem;color:var(--text-sub);">${item.data.toLocaleDateString('pt-BR')} · ${badgeTipo(tipoP)} ${badgeClasse(clsP)}${catTag}</span><br>
        <span style="font-size:0.9rem;font-weight:600;">${escapeHtml(item.desc)}</span>
        <span class="valor-float">${fmtBRL(item.valor)}</span>
      </div>`;
    }
    if (linhasOk.length > 5) html += `<div class="caption">… e mais ${linhasOk.length - 5} linha(s).</div>`;
  }

  if (linhasRev.length) {
    html += `<div class="section-title"> ${linhasRev.length} linha(s) precisam de revisão</div>
      <div style="font-size:0.78rem;color:#c05e00;margin-bottom:10px;">Preencha apenas os campos com  que não puderam ser identificados automaticamente.</div>`;
    for (const item of linhasRev) {
      const titulo = item.sVal ? item.sVal.slice(0, 40) : `Linha ${item.idx + 1} (sem descrição)`;
      html += `<div class="expander"><div class="expander-head">Linha ${item.idx + 1} — ${escapeHtml(titulo)}</div>
        <div class="expander-body">
          <div class="form-row cols-3">
            <div class="field"><label>Data${item.dOk ? '' : ' '}</label><input type="date" data-rev="data" data-idx="${item.idx}" value="${item.dOk ? dataISO(item.dVal) : dataISO(hojeBr())}" ${item.dOk ? 'disabled' : ''}></div>
            <div class="field"><label>Valor${item.vOk ? '' : ' '}</label><input type="number" min="0.01" step="0.01" data-rev="valor" data-idx="${item.idx}" value="${item.vOk ? item.vVal : 0.01}" ${item.vOk ? 'disabled' : ''}></div>
            <div class="field"><label>Descrição${item.sOk ? '' : ' '}</label><input type="text" data-rev="desc" data-idx="${item.idx}" value="${escapeHtml(item.sVal || '')}" ${item.sOk ? 'disabled' : ''}></div>
          </div>
        </div>
      </div>`;
    }
  }

  if (linhasOk.length || linhasRev.length) {
    const total = linhasOk.length + linhasRev.length;
    html += `<div style="font-size:0.78rem;color:var(--text-sub);margin:10px 0;"> <b>${total}</b> linha(s) serão processadas (${linhasOk.length} prontas, ${linhasRev.length} com revisão).</div>
      <div id="imp-msg"></div>
      <button class="btn btn-primary btn-block" id="imp-btn-importar">Importar todos os lançamentos</button>`;
  }

  box.innerHTML = html;

  qsa('[data-rev]', box).forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      const campo = inp.dataset.rev;
      if (!EXCEL_STATE.revisaoValores[idx]) EXCEL_STATE.revisaoValores[idx] = {};
      EXCEL_STATE.revisaoValores[idx][campo] = inp.value;
    });
  });

  qs('#imp-btn-importar')?.addEventListener('click', importarLinhasExcel);
}

async function importarLinhasExcel() {
  const btn = qs('#imp-btn-importar');
  const msgBox = qs('#imp-msg');
  btn.disabled = true; btn.textContent = 'Importando...';
  try {
    const { linhasOk, linhasRev, ehReceita, revisaoValores } = EXCEL_STATE;
    const forma = qs('#imp-forma').value;
    const novos = [];
    let erros = 0;
    const tsBase = novoIdLancamento();

    linhasOk.forEach((item, i) => {
      const [tipo, cls] = classificarParaImportacao(item.desc, ehReceita);
      novos.push({
        id: tsBase + i, data: dataISO(item.data), valor: item.valor, descricao: item.desc,
        categoria_extra: item.catExtra || '', forma_pagamento: forma, tipo, classe: cls,
      });
    });

    linhasRev.forEach((item, j) => {
      const rev = revisaoValores[item.idx] || {};
      const dFinal = item.dOk ? dataISO(item.dVal) : (rev.data || dataISO(hojeBr()));
      const vFinal = item.vOk ? item.vVal : parseFloat(rev.valor);
      const sFinal = item.sOk ? item.sVal : (rev.desc || '').trim();
      if (dFinal && vFinal && vFinal > 0 && sFinal && sFinal.length >= 2) {
        const [tipo, cls] = classificarParaImportacao(sFinal, ehReceita);
        novos.push({
          id: tsBase + linhasOk.length + j, data: dFinal, valor: vFinal, descricao: sFinal,
          categoria_extra: item.catExtra || '', forma_pagamento: forma, tipo, classe: cls,
        });
      } else {
        erros++;
      }
    });

    if (novos.length) {
      await inserirLancamentosEmLote(STATE.username, novos);
      STATE.lancamentos.unshift(...novos);
      atualizarFooter();
    }

    if (novos.length > 0 && erros === 0) {
      msgBox.innerHTML = `<div class="alerta alerta-success">Importação concluída! ${novos.length} lançamento(s) adicionado(s) ao histórico.</div>`;
    } else if (novos.length > 0 && erros > 0) {
      msgBox.innerHTML = `<div class="alerta alerta-warning">Importação parcial: ${novos.length} importado(s), ${erros} linha(s) ignorada(s) por dados incompletos.</div>`;
    } else {
      msgBox.innerHTML = `<div class="alerta alerta-error">Nenhum lançamento importado. ${erros} linha(s) com dados incompletos.</div>`;
    }
    qs('#imp-arquivo').value = '';
  } catch (e) {
    console.error(e);
    msgBox.innerHTML = `<div class="alerta alerta-error">Erro ao importar: ${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Importar todos os lançamentos';
  }
}
