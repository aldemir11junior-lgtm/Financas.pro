// ─────────────────────────────────────────────────────────────────────────
// CAMADA DE DADOS — Supabase (equivalente às funções load_/save_ do Python)
// Tabelas usadas (iguais às do banco atual, prefixo Orç_):
//   Orç_Usuarios, Orç_Lancamentos, Orç_Lixeira, Orç_Categorias,
//   Orç_Planejamento, Orç_Planejamento_Eventos, Orç_Planejamento_Fixos,
//   Orç_Planejamento_Limites
// ─────────────────────────────────────────────────────────────────────────

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function checarErro(error, contexto) {
  if (error) {
    console.error(contexto, error);
    throw new Error(`${contexto}: ${error.message}`);
  }
}

// ─── USUÁRIOS ──────────────────────────────────────────────────────────
async function loadUsers() {
  const { data, error } = await sb.from('Orç_Usuarios')
    .select('id, usuario, senha_hash, role, status').order('id');
  checarErro(error, 'Erro ao carregar usuários');
  if (!data || data.length === 0) {
    const senhaHash = await hashPw('123');
    await sb.from('Orç_Usuarios').insert({ usuario: 'Aldemir', senha_hash: senhaHash, role: 'admin', status: 'aprovado' });
    return [{ usuario: 'Aldemir', senha_hash: senhaHash, role: 'admin', status: 'aprovado' }];
  }
  return data;
}
async function criarUsuario(usuario, senha) {
  const senhaHash = await hashPw(senha);
  const { error } = await sb.from('Orç_Usuarios').insert({
    usuario, senha_hash: senhaHash, role: 'user', status: 'pendente'
  });
  checarErro(error, 'Erro ao criar conta');
}
async function atualizarStatusUsuario(usuario, status) {
  const { error } = await sb.from('Orç_Usuarios').update({ status }).ilike('usuario', usuario);
  checarErro(error, 'Erro ao atualizar status do usuário');
}
async function removerUsuario(usuario) {
  const { error } = await sb.from('Orç_Usuarios').delete().ilike('usuario', usuario);
  checarErro(error, 'Erro ao remover usuário');
}
async function atualizarSenhaUsuario(usuario, novaSenha) {
  const senhaHash = await hashPw(novaSenha);
  const { error } = await sb.from('Orç_Usuarios').update({ senha_hash: senhaHash }).ilike('usuario', usuario);
  checarErro(error, 'Erro ao atualizar senha');
}

// ─── LANÇAMENTOS E LIXEIRA ─────────────────────────────────────────────
function rowToLancamento(r) {
  return {
    id: r.id, data: r.data, valor: parseFloat(r.valor), descricao: r.descricao,
    categoria_extra: r.categoria_extra || '', forma_pagamento: r.forma_pagamento || 'Cartão',
    tipo: r.tipo, classe: r.classe, icone: r.icone || '',
    recorrencia_id: r.recorrencia_id || '', parcela_numero: r.parcela_numero || null,
    total_parcelas: r.total_parcelas || null, apagadoEm: r.apagado_em || undefined,
  };
}
async function loadData(usuario) {
  const { data: lancRows, error: e1 } = await sb.from('Orç_Lancamentos')
    .select('id, data, valor, descricao, categoria_extra, forma_pagamento, tipo, classe, icone, recorrencia_id, parcela_numero, total_parcelas')
    .ilike('usuario', usuario).order('id', { ascending: false });
  checarErro(e1, 'Erro ao carregar lançamentos');

  const { data: lixRows, error: e2 } = await sb.from('Orç_Lixeira')
    .select('id, data, valor, descricao, categoria_extra, forma_pagamento, tipo, classe, icone, recorrencia_id, parcela_numero, total_parcelas, apagado_em')
    .ilike('usuario', usuario).order('apagado_em', { ascending: false });
  checarErro(e2, 'Erro ao carregar lixeira');

  return {
    lancamentos: (lancRows || []).map(rowToLancamento),
    lixeira: (lixRows || []).map(rowToLancamento),
  };
}
async function inserirLancamento(usuario, l) {
  const { error } = await sb.from('Orç_Lancamentos').insert({
    id: l.id, usuario, data: l.data, valor: l.valor, descricao: l.descricao,
    categoria_extra: l.categoria_extra || '', forma_pagamento: l.forma_pagamento || 'Cartão',
    tipo: l.tipo, classe: l.classe, icone: l.icone || '',
    recorrencia_id: l.recorrencia_id || null, parcela_numero: l.parcela_numero || null,
    total_parcelas: l.total_parcelas || null,
  });
  checarErro(error, 'Erro ao registrar lançamento');
}
async function inserirLancamentosEmLote(usuario, lista) {
  if (!lista.length) return;
  const rows = lista.map(l => ({
    id: l.id, usuario, data: l.data, valor: l.valor, descricao: l.descricao,
    categoria_extra: l.categoria_extra || '', forma_pagamento: l.forma_pagamento || 'Cartão',
    tipo: l.tipo, classe: l.classe, icone: l.icone || '',
    recorrencia_id: l.recorrencia_id || null, parcela_numero: l.parcela_numero || null,
    total_parcelas: l.total_parcelas || null,
  }));
  const { error } = await sb.from('Orç_Lancamentos').insert(rows);
  checarErro(error, 'Erro ao gravar lançamentos');
}
async function atualizarLancamento(id, usuario, campos) {
  const { error } = await sb.from('Orç_Lancamentos').update(campos).eq('id', id).ilike('usuario', usuario);
  checarErro(error, 'Erro ao atualizar lançamento');
}
async function moverParaLixeira(usuario, l) {
  const apagadoEm = agoraBr().toISOString();
  const { error: eIns } = await sb.from('Orç_Lixeira').insert({
    id: l.id, usuario, data: l.data, valor: l.valor, descricao: l.descricao,
    categoria_extra: l.categoria_extra || '', forma_pagamento: l.forma_pagamento || 'Cartão',
    tipo: l.tipo, classe: l.classe, icone: l.icone || '',
    recorrencia_id: l.recorrencia_id || null, parcela_numero: l.parcela_numero || null,
    total_parcelas: l.total_parcelas || null, apagado_em: apagadoEm,
  });
  checarErro(eIns, 'Erro ao mover para a lixeira');
  const { error: eDel } = await sb.from('Orç_Lancamentos').delete().eq('id', l.id).ilike('usuario', usuario);
  checarErro(eDel, 'Erro ao remover lançamento original');
  return apagadoEm;
}
async function restaurarDaLixeira(usuario, l) {
  const { error: eIns } = await sb.from('Orç_Lancamentos').insert({
    id: l.id, usuario, data: l.data, valor: l.valor, descricao: l.descricao,
    categoria_extra: l.categoria_extra || '', forma_pagamento: l.forma_pagamento || 'Cartão',
    tipo: l.tipo, classe: l.classe, icone: l.icone || '',
    recorrencia_id: l.recorrencia_id || null, parcela_numero: l.parcela_numero || null,
    total_parcelas: l.total_parcelas || null,
  });
  checarErro(eIns, 'Erro ao restaurar lançamento');
  const { error: eDel } = await sb.from('Orç_Lixeira').delete().eq('id', l.id).ilike('usuario', usuario);
  checarErro(eDel, 'Erro ao remover da lixeira');
}
async function excluirDefinitivo(usuario, id) {
  const { error } = await sb.from('Orç_Lixeira').delete().eq('id', id).ilike('usuario', usuario);
  checarErro(error, 'Erro ao excluir definitivamente');
}

// ─── CATEGORIAS (globais, somente leitura pelo app — edição é via banco) ──
async function loadCategorias() {
  const { data, error } = await sb.from('Orç_Categorias').select('tipo_lanc, categoria, descricao');
  checarErro(error, 'Erro ao carregar categorias');
  const rows = data || [];
  let despesa = rows.filter(r => r.tipo_lanc === 'despesa').map(r => ({ categoria: r.categoria, descricao: r.descricao }));
  let receita = rows.filter(r => r.tipo_lanc === 'receita').map(r => ({ categoria: r.categoria, descricao: r.descricao }));
  if (!despesa.length) despesa = despesasPadrao();
  if (!receita.length) receita = receitasPadrao();
  return { despesa, receita };
}

// ─── PLANEJAMENTO ──────────────────────────────────────────────────────
async function loadPlanejamento(usuario) {
  const { data: meses, error } = await sb.from('Orç_Planejamento')
    .select('id, chave_mes, renda_prevista, meta_poupanca, meta_investimento').ilike('usuario', usuario);
  checarErro(error, 'Erro ao carregar planejamento');

  const resultado = {};
  for (const mes of (meses || [])) {
    const pid = mes.id;
    const [eventosRes, fixosRes, limitesRes] = await Promise.all([
      sb.from('Orç_Planejamento_Eventos').select('descricao, categoria, valor_estimado').eq('planejamento_id', pid),
      sb.from('Orç_Planejamento_Fixos').select('descricao, categoria, valor, tipo, parcelas_restantes').eq('planejamento_id', pid),
      sb.from('Orç_Planejamento_Limites').select('categoria, limite').eq('planejamento_id', pid),
    ]);
    checarErro(eventosRes.error, 'Erro ao carregar eventos do planejamento');
    checarErro(fixosRes.error, 'Erro ao carregar fixos do planejamento');
    checarErro(limitesRes.error, 'Erro ao carregar limites do planejamento');

    const limites = {};
    for (const r of (limitesRes.data || [])) limites[r.categoria] = parseFloat(r.limite);

    resultado[mes.chave_mes] = {
      renda_prevista: parseFloat(mes.renda_prevista) || 0,
      eventos: (eventosRes.data || []).map(e => ({ descricao: e.descricao, categoria: e.categoria, valor_estimado: parseFloat(e.valor_estimado) || 0 })),
      fixos_parcelas: (fixosRes.data || []).map(f => ({ descricao: f.descricao, categoria: f.categoria, valor: parseFloat(f.valor) || 0, tipo: f.tipo, parcelas_restantes: f.parcelas_restantes || 0 })),
      limites_categoria: limites,
      meta_poupanca: parseFloat(mes.meta_poupanca) || 0,
      meta_investimento: parseFloat(mes.meta_investimento) || 0,
    };
  }
  return resultado;
}

async function salvarPlanejamentoMes(usuario, chaveMes, plano) {
  // Remove o mês (cascade cuida dos filhos) e recria — mesmo padrão do app original.
  const { data: existente, error: eSel } = await sb.from('Orç_Planejamento')
    .select('id').ilike('usuario', usuario).eq('chave_mes', chaveMes);
  checarErro(eSel, 'Erro ao verificar planejamento existente');
  if (existente && existente.length) {
    const { error: eDel } = await sb.from('Orç_Planejamento').delete().ilike('usuario', usuario).eq('chave_mes', chaveMes);
    checarErro(eDel, 'Erro ao limpar planejamento anterior');
  }

  const { data: novo, error: eIns } = await sb.from('Orç_Planejamento').insert({
    usuario, chave_mes: chaveMes,
    renda_prevista: plano.renda_prevista || 0,
    meta_poupanca: plano.meta_poupanca || 0,
    meta_investimento: plano.meta_investimento || 0,
  }).select('id').single();
  checarErro(eIns, 'Erro ao salvar planejamento');
  const pid = novo.id;

  if (plano.eventos && plano.eventos.length) {
    const rows = plano.eventos.map(e => ({ planejamento_id: pid, descricao: e.descricao, categoria: e.categoria, valor_estimado: e.valor_estimado || 0 }));
    const { error } = await sb.from('Orç_Planejamento_Eventos').insert(rows);
    checarErro(error, 'Erro ao salvar eventos');
  }
  if (plano.fixos_parcelas && plano.fixos_parcelas.length) {
    const rows = plano.fixos_parcelas.map(f => ({ planejamento_id: pid, descricao: f.descricao, categoria: f.categoria, valor: f.valor || 0, tipo: f.tipo || 'Fixo', parcelas_restantes: f.parcelas_restantes || 0 }));
    const { error } = await sb.from('Orç_Planejamento_Fixos').insert(rows);
    checarErro(error, 'Erro ao salvar fixos/parcelas');
  }
  const limitesEntries = Object.entries(plano.limites_categoria || {});
  if (limitesEntries.length) {
    const rows = limitesEntries.map(([categoria, limite]) => ({ planejamento_id: pid, categoria, limite }));
    const { error } = await sb.from('Orç_Planejamento_Limites').insert(rows);
    checarErro(error, 'Erro ao salvar limites');
  }
}

// ─── HELPERS DE CATEGORIA/DESCRIÇÃO DISPONÍVEIS (a partir do state) ──────
function categoriasDisponiveis(tipoChave) {
  const lista = STATE.categoriasMap[tipoChave] || [];
  return [...new Set(lista.map(c => c.categoria).filter(Boolean))].sort();
}
function descricoesDisponiveis(tipoChave, categoria) {
  const lista = STATE.categoriasMap[tipoChave] || [];
  return [...new Set(lista.filter(c => c.categoria === categoria && c.descricao).map(c => c.descricao))].sort();
}
