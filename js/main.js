// ─────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL + NAVEGAÇÃO (equivalente ao st.session_state / st.tabs)
// ─────────────────────────────────────────────────────────────────────────
const STATE = {
  loggedIn: false,
  username: '',
  isAdmin: false,
  page: 'Dashboard',
  lancamentos: [],
  lixeira: [],
  categoriasMap: { despesa: [], receita: [] },
  planejamentoMap: {},
  editandoLancId: null,
  temaEscuro: localStorage.getItem('fp_tema') === 'escuro',
  filtroInicio: null,
  filtroFim: null,
};

function persistir() {
  return salvarLancamentosNoBanco();
}
async function salvarLancamentosNoBanco() {
  // Mantido apenas por compatibilidade semântica; as operações de dados
  // já são feitas diretamente (insert/update/delete) em cada ação.
}

function aplicarTema() {
  document.documentElement.setAttribute('data-theme', STATE.temaEscuro ? 'dark' : 'light');
  const btn = qs('#btn-tema');
  if (btn) btn.textContent = STATE.temaEscuro ? 'Tema claro' : 'Tema escuro';
}

function irParaPagina(pagina) {
  STATE.page = pagina;
  qsa('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pagina));
  qsa('.page').forEach(p => p.style.display = 'none');
  const alvo = qs('#page-' + pagina);
  if (alvo) alvo.style.display = 'block';
  renderizarPagina(pagina);
}

function renderizarPagina(pagina) {
  try {
    if (pagina === 'Dashboard') renderDashboard();
    else if (pagina === 'Planejamento') renderPlanejamento();
    else if (pagina === 'Analise') renderAnalise();
    else if (pagina === 'Lancamentos') renderLancamentos();
    else if (pagina === 'Historico') renderHistorico();
    else if (pagina === 'Conta') renderConta();
    else if (pagina === 'Usuarios') renderUsuarios();
  } catch (e) {
    console.error(`Erro ao renderizar página ${pagina}:`, e);
    const alvo = qs('#page-' + pagina);
    if (alvo) alvo.innerHTML = `<div class="alerta alerta-error">Ocorreu um erro ao carregar esta aba: ${escapeHtml(e.message)}</div>`;
  }
}

function atualizarFooter() {
  const footer = qs('#app-footer');
  if (footer) {
    footer.innerHTML = `FinançasPro · Usuário: <b>${escapeHtml(STATE.username)}</b> · ${STATE.lancamentos.length} lançamentos`;
  }
}

function limparLixeiraAntiga() {
  if (!STATE.lixeira.length) return [];
  const hoje = agoraBr();
  const manter = [];
  const remover = [];
  for (const l of STATE.lixeira) {
    const apagadoEm = new Date(l.apagadoEm || hoje.toISOString());
    const dias = Math.floor((hoje - apagadoEm) / (1000 * 60 * 60 * 24));
    if (dias <= 30) manter.push(l); else remover.push(l);
  }
  STATE.lixeira = manter;
  return remover;
}

async function iniciarApp() {
  qs('#tela-login').style.display = 'none';
  qs('#app').style.display = 'block';
  qs('#top-user').innerHTML = `<b>${escapeHtml(STATE.username)}</b>${STATE.isAdmin ? ' · Administrador' : ''}`;
  qs('#tab-btn-usuarios').style.display = STATE.isAdmin ? 'inline-block' : 'none';
  aplicarTema();
  irParaPagina('Dashboard');
  atualizarFooter();

  // Limpeza de itens da lixeira com mais de 30 dias (silenciosa, em segundo plano)
  const expirados = limparLixeiraAntiga();
  if (expirados.length) {
    for (const l of expirados) {
      try { await excluirDefinitivo(STATE.username, l.id); } catch (e) { console.warn('Falha ao expirar item da lixeira', e); }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => irParaPagina(btn.dataset.page));
  });
  configurarAuth();
  aplicarTema();
});
