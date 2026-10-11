// ─────────────────────────────────────────────────────────────────────────
// LOGIN / CRIAR CONTA / LOGOUT / TEMA
// ─────────────────────────────────────────────────────────────────────────
function mostrarMsg(seletor, tipo, texto) {
  const box = qs(seletor);
  box.innerHTML = texto ? `<div class="alerta alerta-${tipo}">${texto}</div>` : '';
}

function configurarAuth() {
  qsa('.login-aba-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.login-aba-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      qs('#aba-entrar').style.display = btn.dataset.aba === 'entrar' ? 'block' : 'none';
      qs('#aba-criar').style.display = btn.dataset.aba === 'criar' ? 'block' : 'none';
    });
  });

  qs('#btn-entrar').addEventListener('click', fazerLogin);
  qs('#btn-criar-conta').addEventListener('click', fazerRegistro);
  qs('#li-senha').addEventListener('keydown', e => { if (e.key === 'Enter') fazerLogin(); });

  qs('#btn-sair').addEventListener('click', fazerLogout);
  qs('#btn-tema').addEventListener('click', () => {
    STATE.temaEscuro = !STATE.temaEscuro;
    localStorage.setItem('fp_tema', STATE.temaEscuro ? 'escuro' : 'claro');
    aplicarTema();
    renderizarPagina(STATE.page);
  });
}

async function fazerLogin() {
  const userIn = qs('#li-usuario').value.trim();
  const passIn = qs('#li-senha').value;
  const btn = qs('#btn-entrar');
  mostrarMsg('#msg-login', 'error', '');

  if (!userIn || !passIn) {
    mostrarMsg('#msg-login', 'error', 'Preencha todos os campos.');
    return;
  }
  btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const usuarios = await loadUsers();
    const senhaHash = await hashPw(passIn);
    const found = usuarios.find(u => u.usuario.toLowerCase() === userIn.toLowerCase() && u.senha_hash === senhaHash);

    if (!found) {
      mostrarMsg('#msg-login', 'error', 'Usuário ou senha incorretos.');
    } else if ((found.status || 'aprovado') === 'pendente') {
      mostrarMsg('#msg-login', 'warning', 'Sua conta foi criada, mas ainda aguarda a aprovação do Aldemir.');
    } else if (found.status === 'desativado') {
      mostrarMsg('#msg-login', 'error', 'Sua conta foi desativada. Entre em contato com o administrador.');
    } else {
      STATE.loggedIn = true;
      STATE.username = found.usuario;
      STATE.isAdmin = found.role === 'admin';

      const [{ lancamentos, lixeira }, categoriasMap, planejamentoMap] = await Promise.all([
        loadData(found.usuario), loadCategorias(), loadPlanejamento(found.usuario),
      ]);
      STATE.lancamentos = lancamentos;
      STATE.lixeira = lixeira;
      STATE.categoriasMap = categoriasMap;
      STATE.planejamentoMap = planejamentoMap;

      await iniciarApp();
    }
  } catch (e) {
    console.error(e);
    mostrarMsg('#msg-login', 'error', `Erro ao entrar: ${escapeHtml(e.message)}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

async function fazerRegistro() {
  const nu = qs('#reg-usuario').value.trim();
  const p1 = qs('#reg-senha1').value;
  const p2 = qs('#reg-senha2').value;
  const btn = qs('#btn-criar-conta');
  mostrarMsg('#msg-registro', 'warning', '');

  if (!nu || !p1 || !p2) { mostrarMsg('#msg-registro', 'warning', 'Preencha todos os campos.'); return; }
  if (nu.length < 3) { mostrarMsg('#msg-registro', 'warning', 'Usuário: mínimo 3 caracteres.'); return; }
  if (p1.length < 3) { mostrarMsg('#msg-registro', 'warning', 'Senha: mínimo 3 caracteres.'); return; }
  if (p1 !== p2) { mostrarMsg('#msg-registro', 'error', 'As senhas não conferem.'); return; }

  btn.disabled = true; btn.textContent = 'Criando...';
  try {
    const usuarios = await loadUsers();
    if (usuarios.some(u => u.usuario.toLowerCase() === nu.toLowerCase())) {
      mostrarMsg('#msg-registro', 'error', 'Esse usuário já existe.');
    } else {
      await criarUsuario(nu, p1);
      mostrarMsg('#msg-registro', 'success', 'Conta solicitada com sucesso! Aguarde a aprovação do Aldemir.');
      qs('#reg-usuario').value = ''; qs('#reg-senha1').value = ''; qs('#reg-senha2').value = '';
    }
  } catch (e) {
    console.error(e);
    mostrarMsg('#msg-registro', 'error', `Erro ao criar conta: ${escapeHtml(e.message)}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Criar conta';
  }
}

function fazerLogout() {
  Object.assign(STATE, {
    loggedIn: false, username: '', isAdmin: false, page: 'Dashboard',
    lancamentos: [], lixeira: [], categoriasMap: { despesa: [], receita: [] },
    planejamentoMap: {}, editandoLancId: null,
  });
  qs('#app').style.display = 'none';
  qs('#tela-login').style.display = 'block';
  qs('#li-usuario').value = ''; qs('#li-senha').value = '';
  mostrarMsg('#msg-login', 'error', '');
}
