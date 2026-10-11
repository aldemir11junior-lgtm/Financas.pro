// ─────────────────────────────────────────────────────────────────────────
// HISTÓRICO — Lançamentos Ativos + Apagados
// ─────────────────────────────────────────────────────────────────────────
let HIST_SUBABA = 'ativos';
let HIST_FILTRO_TIPO = 'Todos';
let HIST_FILTRO_CAT_EXTRA = 'Todas';

function renderHistorico() {
  const container = qs('#page-Historico');
  container.innerHTML = `
    <div class="page-title">Histórico <span>& Apagados</span></div>
    <div class="page-sub">Gerencie seus lançamentos e itens excluídos em um só lugar.</div>

    <div class="login-abas" style="max-width:420px;">
      <button class="login-aba-btn ${HIST_SUBABA === 'ativos' ? 'active' : ''}" data-sub="ativos">Lançamentos Ativos</button>
      <button class="login-aba-btn ${HIST_SUBABA === 'apagados' ? 'active' : ''}" data-sub="apagados">Apagados</button>
    </div>
    <div id="hist-corpo"></div>
  `;
  qsa('[data-sub]', container).forEach(btn => btn.addEventListener('click', () => { HIST_SUBABA = btn.dataset.sub; renderHistorico(); }));

  if (HIST_SUBABA === 'ativos') renderHistoricoAtivos();
  else renderHistoricoApagados();
}

function renderHistoricoAtivos() {
  const box = qs('#hist-corpo');
  const lancamentos = STATE.lancamentos;
  if (!lancamentos.length) {
    box.innerHTML = `<div class="alerta alerta-info">Nenhum lançamento registrado ainda.</div>`;
    return;
  }

  const filtros = ['Todos', 'Receita', 'Despesa', 'Fixo', 'Variável'];
  let lista = HIST_FILTRO_TIPO === 'Todos' ? lancamentos : lancamentos.filter(l => l.tipo === HIST_FILTRO_TIPO);

  const catsExtraDisp = [...new Set(lista.filter(l => l.categoria_extra).map(l => l.categoria_extra))].sort();

  let html = `<div class="radio-group" style="margin-bottom:12px;">${filtros.map(f => `
    <label><input type="radio" name="hist-filtro-tipo" value="${f}" ${HIST_FILTRO_TIPO === f ? 'checked' : ''}> ${f}</label>`).join('')}</div>`;

  if (catsExtraDisp.length) {
    html += `<div class="field" style="max-width:280px;margin-bottom:14px;"><label>Filtrar por Categoria</label>
      <select id="hist-filtro-cat-extra"><option value="Todas">Todas</option>${catsExtraDisp.map(c => `<option value="${escapeHtml(c)}" ${HIST_FILTRO_CAT_EXTRA === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>`;
  }

  if (HIST_FILTRO_CAT_EXTRA !== 'Todas') lista = lista.filter(l => l.categoria_extra === HIST_FILTRO_CAT_EXTRA);

  html += `<div id="hist-lista-itens"></div>`;
  box.innerHTML = html;

  qsa('input[name="hist-filtro-tipo"]', box).forEach(r => r.addEventListener('change', e => { HIST_FILTRO_TIPO = e.target.value; HIST_FILTRO_CAT_EXTRA = 'Todas'; renderHistoricoAtivos(); }));
  qs('#hist-filtro-cat-extra')?.addEventListener('change', e => { HIST_FILTRO_CAT_EXTRA = e.target.value; renderHistoricoAtivos(); });

  renderListaLancamentosAtivos(lista);
}

function renderListaLancamentosAtivos(lista) {
  const itensBox = qs('#hist-lista-itens');
  let html = '';
  for (const l of lista) {
    const sinal = l.tipo === 'Receita' ? '+' : '-';
    const cor = l.tipo === 'Receita' ? 'pos' : 'neg';
    const catTag = l.categoria_extra ? ` ·  ${escapeHtml(l.categoria_extra)}` : '';
    const parcelaTag = l.total_parcelas ? ` · Parcela ${l.parcela_numero}/${l.total_parcelas}` : '';
    html += `<div class="lanc-item">
      <div class="lanc-card">
        <div class="meta">${fmtDataBR(l.data)} · ${badgeTipo(l.tipo)} ${badgeClasse(l.classe)} ${badgePagamento(l.forma_pagamento)}${catTag}${parcelaTag}</div>
        <div class="desc">${escapeHtml(l.descricao)}</div>
      </div>
      <div class="lanc-valor ${cor}">${sinal} ${fmtBRL(l.valor)}</div>
      <button class="btn btn-sm" data-edit="${l.id}" title="Editar">Editar</button>
      <button class="btn btn-sm btn-danger" data-del="${l.id}" title="Mover para Apagados">Apagar</button>
    </div>
    <div id="hist-edit-${l.id}"></div>`;
  }
  itensBox.innerHTML = html;

  qsa('[data-edit]', itensBox).forEach(btn => btn.addEventListener('click', () => {
    STATE.editandoLancId = (STATE.editandoLancId === parseInt(btn.dataset.edit)) ? null : parseInt(btn.dataset.edit);
    renderListaLancamentosAtivos(lista);
    if (STATE.editandoLancId) renderFormEdicaoLancamento(STATE.editandoLancId);
  }));
  qsa('[data-del]', itensBox).forEach(btn => btn.addEventListener('click', async () => {
    const id = parseInt(btn.dataset.del);
    const l = STATE.lancamentos.find(x => x.id === id);
    if (!l) return;
    btn.disabled = true;
    try {
      const apagadoEm = await moverParaLixeira(STATE.username, l);
      l.apagadoEm = apagadoEm;
      STATE.lixeira.unshift(l);
      STATE.lancamentos = STATE.lancamentos.filter(x => x.id !== id);
      atualizarFooter();
      renderHistoricoAtivos();
    } catch (e) {
      alert('Erro ao apagar: ' + e.message);
      btn.disabled = false;
    }
  }));

  if (STATE.editandoLancId) renderFormEdicaoLancamento(STATE.editandoLancId);
}

function renderFormEdicaoLancamento(id) {
  const l = STATE.lancamentos.find(x => x.id === id);
  const box = qs('#hist-edit-' + id);
  if (!l || !box) return;

  const tiposEditOpts = ['Receita', 'Despesa'];
  const tipoAtual = l.tipo === 'Receita' ? 'Receita' : 'Despesa';
  const tipoChaveEdit = tipoAtual === 'Receita' ? 'receita' : 'despesa';
  let categoriasOpts = categoriasDisponiveis(tipoChaveEdit);
  if (!categoriasOpts.includes(l.classe)) categoriasOpts = [...new Set([...categoriasOpts, l.classe])].sort();

  box.innerHTML = `
    <div class="section-title">Editando lançamento</div>
    <div class="form-row cols-2">
      <div class="field"><label>Data</label><input type="date" id="ed-data-${id}" value="${l.data}"></div>
      <div class="field"><label>Valor</label><input type="number" id="ed-valor-${id}" min="0.01" step="0.01" value="${l.valor}"></div>
    </div>
    <div class="form-row cols-2">
      <div class="field"><label>Forma de Pagamento</label><select id="ed-forma-${id}">${FORMAS_PAGAMENTO.map(f => `<option value="${f}" ${l.forma_pagamento === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
      <div class="field"><label>Tipo</label><select id="ed-tipo-${id}">${tiposEditOpts.map(t => `<option value="${t}" ${t === tipoAtual ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    </div>
    <div class="form-row cols-2">
      <div class="field"><label>Categoria</label><select id="ed-categoria-${id}">${categoriasOpts.map(c => `<option value="${escapeHtml(c)}" ${c === l.classe ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Descrição</label><select id="ed-descricao-${id}"></select></div>
    </div>
    <div class="field"><label>Categoria (opcional)</label><input type="text" id="ed-catextra-${id}" placeholder="Ex: Moto, Carro, Casa..." value="${escapeHtml(l.categoria_extra || '')}"></div>
    <div id="ed-msg-${id}"></div>
    <div class="form-row cols-2">
      <button class="btn btn-primary" id="ed-salvar-${id}">Salvar alterações</button>
      <button class="btn" id="ed-cancelar-${id}">Cancelar</button>
    </div>
  `;

  const atualizarDescOpts = () => {
    const catSel = qs(`#ed-categoria-${id}`).value;
    let descOpts = descricoesDisponiveis(tipoChaveEdit, catSel);
    if (!descOpts.includes(l.descricao) && catSel === l.classe) descOpts = [...new Set([...descOpts, l.descricao])].sort();
    const descSel = qs(`#ed-descricao-${id}`);
    descSel.innerHTML = descOpts.map(d => `<option value="${escapeHtml(d)}" ${d === l.descricao ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
  };
  qs(`#ed-categoria-${id}`).addEventListener('change', atualizarDescOpts);
  atualizarDescOpts();

  qs(`#ed-cancelar-${id}`).addEventListener('click', () => { STATE.editandoLancId = null; renderHistoricoAtivos(); });
  qs(`#ed-salvar-${id}`).addEventListener('click', async () => {
    const btn = qs(`#ed-salvar-${id}`);
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      const tipoNovo = qs(`#ed-tipo-${id}`).value;
      const campos = {
        data: qs(`#ed-data-${id}`).value,
        valor: parseFloat(qs(`#ed-valor-${id}`).value),
        descricao: qs(`#ed-descricao-${id}`).value,
        tipo: tipoNovo,
        classe: qs(`#ed-categoria-${id}`).value,
        categoria_extra: qs(`#ed-catextra-${id}`).value.trim(),
        forma_pagamento: qs(`#ed-forma-${id}`).value,
      };
      await atualizarLancamento(id, STATE.username, campos);
      Object.assign(l, campos);
      STATE.editandoLancId = null;
      renderHistoricoAtivos();
    } catch (e) {
      qs(`#ed-msg-${id}`).innerHTML = `<div class="alerta alerta-error">Erro ao salvar: ${escapeHtml(e.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Salvar alterações';
    }
  });
}

function renderHistoricoApagados() {
  const box = qs('#hist-corpo');
  const lixeira = STATE.lixeira;
  let html = `<div class="caption">Itens excluídos do histórico. Restaure ou exclua definitivamente.</div>
    <div class="alerta alerta-warning">Itens ficam disponíveis por <b>30 dias</b> após a exclusão. Após esse prazo são removidos automaticamente.</div>`;

  if (!lixeira.length) {
    html += `<div class="alerta alerta-info">Nenhum item apagado.</div>`;
    box.innerHTML = html;
    return;
  }

  html += `<div id="lix-itens"></div>`;
  box.innerHTML = html;

  const itensBox = qs('#lix-itens');
  let itensHtml = '';
  for (const l of lixeira) {
    let diasRestantes = 30;
    try {
      const apagadoEm = new Date(l.apagadoEm || agoraBr().toISOString());
      diasRestantes = Math.max(0, 30 - Math.floor((agoraBr() - apagadoEm) / 86400000));
    } catch (e) { /* mantém 30 */ }
    const corDias = diasRestantes <= 3 ? '#c0392b' : (diasRestantes <= 7 ? '#d97706' : 'var(--text-sub)');
    const parcelaTag = l.total_parcelas ? ` · Parcela ${l.parcela_numero}/${l.total_parcelas}` : '';
    itensHtml += `<div class="lanc-item">
      <div class="lixeira-card">
        <div class="meta" style="color:#c0392b;">${fmtDataBR(l.data)} · ${badgeTipo(l.tipo)} ${badgeClasse(l.classe)}${parcelaTag}</div>
        <div class="desc" style="color:#7b241c;">${escapeHtml(l.descricao)}</div>
      </div>
      <div class="lanc-valor neg">– ${fmtBRL(l.valor)}</div>
      <div>
        <div class="dias-restantes" style="color:${corDias};"> ${diasRestantes}d</div>
        <button class="btn btn-sm" data-rest="${l.id}" title="Restaurar">Restaurar</button>
      </div>
      <button class="btn btn-sm btn-danger" data-perm="${l.id}" title="Excluir permanentemente">Excluir</button>
    </div>`;
  }
  itensBox.innerHTML = itensHtml;

  qsa('[data-rest]', itensBox).forEach(btn => btn.addEventListener('click', async () => {
    const id = parseInt(btn.dataset.rest);
    const l = STATE.lixeira.find(x => x.id === id);
    if (!l) return;
    btn.disabled = true;
    try {
      await restaurarDaLixeira(STATE.username, l);
      const { apagadoEm, ...semApagado } = l;
      STATE.lancamentos.unshift(semApagado);
      STATE.lixeira = STATE.lixeira.filter(x => x.id !== id);
      atualizarFooter();
      renderHistoricoApagados();
    } catch (e) {
      alert('Erro ao restaurar: ' + e.message);
      btn.disabled = false;
    }
  }));
  qsa('[data-perm]', itensBox).forEach(btn => btn.addEventListener('click', async () => {
    const id = parseInt(btn.dataset.perm);
    if (!confirm('Excluir definitivamente este item? Essa ação não pode ser desfeita.')) return;
    btn.disabled = true;
    try {
      await excluirDefinitivo(STATE.username, id);
      STATE.lixeira = STATE.lixeira.filter(x => x.id !== id);
      renderHistoricoApagados();
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
      btn.disabled = false;
    }
  }));
}
