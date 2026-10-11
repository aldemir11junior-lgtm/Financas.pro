// ─────────────────────────────────────────────────────────────────────────
// USUÁRIOS (admin)
// ─────────────────────────────────────────────────────────────────────────
async function renderUsuarios() {
  const container = qs('#page-Usuarios');
  if (!STATE.isAdmin) {
    container.innerHTML = `<div class="alerta alerta-error">Acesso restrito ao administrador.</div>`;
    return;
  }
  container.innerHTML = `
    <div class="page-title">Gestão de <span>Usuários</span></div>
    <div class="page-sub">Painel de controle de acessos e aprovações.</div>
    <div id="usr-corpo">Carregando…</div>
  `;

  let usuarios;
  try {
    usuarios = await loadUsers();
  } catch (e) {
    qs('#usr-corpo').innerHTML = `<div class="alerta alerta-error">Erro ao carregar usuários: ${escapeHtml(e.message)}</div>`;
    return;
  }
  renderUsuariosCorpo(usuarios);
}

function renderUsuariosCorpo(usuarios) {
  const box = qs('#usr-corpo');
  const pendentes = usuarios.filter(u => u.status === 'pendente');
  const cadastrados = usuarios.filter(u => u.status !== 'pendente');
  const ativos = usuarios.filter(u => (u.status || 'aprovado') === 'aprovado');

  let html = `<div class="section-title">Aguardando Aprovação</div>`;
  if (!pendentes.length) {
    html += `<div class="alerta alerta-info">Não há nenhuma solicitação de acesso pendente.</div>`;
  } else {
    for (const u of pendentes) {
      html += `<div class="user-row" style="border-color:#f39c12;">
        <div class="user-ava" style="background:#f39c12;">${escapeHtml(u.usuario[0].toUpperCase())}</div>
        <div class="user-info"><div class="nome">${escapeHtml(u.usuario)}</div><div class="status" style="color:#d35400;">Aguardando liberação</div></div>
        <button class="btn btn-primary btn-sm" data-aprovar="${escapeHtml(u.usuario)}">Aprovar</button>
        <button class="btn btn-sm" data-recusar="${escapeHtml(u.usuario)}">Recusar</button>
      </div>`;
    }
  }

  html += `<div class="divider"></div><div class="section-title">Usuários Cadastrados</div>
    <div class="caption">Use os botões para ativar ou desativar o acesso de cada usuário. Você não pode desativar sua própria conta.</div>`;

  for (const u of cadastrados) {
    const isAdminU = u.role === 'admin';
    const isMe = u.usuario.toLowerCase() === STATE.username.toLowerCase();
    const estaAtivo = (u.status || 'aprovado') === 'aprovado';
    const roleLabel = isAdminU ? 'Administrador' : 'Usuário';
    const statusCor = estaAtivo ? 'var(--text-sub)' : '#c0392b';
    const statusTxt = estaAtivo ? 'Ativo' : 'Desativado';
    const meTag = isMe ? ' <span style="font-size:10px;color:#00704A">(você)</span>' : '';
    let acao = '';
    if (isMe) acao = `<button class="btn btn-sm" disabled>Você</button>`;
    else if (estaAtivo) acao = `<button class="btn btn-sm" data-desativar="${escapeHtml(u.usuario)}">Desativar</button>`;
    else acao = `<button class="btn btn-primary btn-sm" data-ativar="${escapeHtml(u.usuario)}">Ativar</button>`;

    html += `<div class="user-row" style="${estaAtivo ? '' : 'background:#fdecea;border-color:#f5b7b1;'}">
      <div class="user-ava ${isAdminU ? 'user-ava-admin' : ''}" style="opacity:${estaAtivo ? 1 : 0.5};">${escapeHtml(u.usuario[0].toUpperCase())}</div>
      <div class="user-info"><div class="nome">${escapeHtml(u.usuario)}${meTag}</div><div class="status" style="color:${statusCor};">${roleLabel} · ${statusTxt}</div></div>
      ${acao}
    </div>`;
  }

  html += `<div class="divider"></div><div class="section-title">Trocar Senha</div>
    <div id="usr-msg-senha"></div>
    <div class="field" style="max-width:320px;"><label>Selecionar usuário</label>
      <select id="usr-sel-usuario">${ativos.map(u => `<option value="${escapeHtml(u.usuario)}">${escapeHtml(u.usuario)}</option>`).join('')}</select>
    </div>
    <div class="form-row cols-2">
      <div class="field"><label>Nova senha</label><input type="password" id="usr-nova-senha"></div>
      <div class="field"><label>Confirmar senha</label><input type="password" id="usr-conf-senha"></div>
    </div>
    <button class="btn btn-primary" id="usr-btn-salvar-senha">Salvar nova senha</button>
  `;

  box.innerHTML = html;

  qsa('[data-aprovar]', box).forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await atualizarStatusUsuario(btn.dataset.aprovar, 'aprovado'); await renderUsuarios(); }
    catch (e) { alert('Erro: ' + e.message); btn.disabled = false; }
  }));
  qsa('[data-recusar]', box).forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`Recusar e remover a solicitação de ${btn.dataset.recusar}?`)) return;
    btn.disabled = true;
    try { await removerUsuario(btn.dataset.recusar); await renderUsuarios(); }
    catch (e) { alert('Erro: ' + e.message); btn.disabled = false; }
  }));
  qsa('[data-desativar]', box).forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await atualizarStatusUsuario(btn.dataset.desativar, 'desativado'); await renderUsuarios(); }
    catch (e) { alert('Erro: ' + e.message); btn.disabled = false; }
  }));
  qsa('[data-ativar]', box).forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await atualizarStatusUsuario(btn.dataset.ativar, 'aprovado'); await renderUsuarios(); }
    catch (e) { alert('Erro: ' + e.message); btn.disabled = false; }
  }));

  qs('#usr-btn-salvar-senha').addEventListener('click', async () => {
    const sel = qs('#usr-sel-usuario').value;
    const n1 = qs('#usr-nova-senha').value;
    const n2 = qs('#usr-conf-senha').value;
    const msgBox = qs('#usr-msg-senha');
    if (!n1 || !n2) { msgBox.innerHTML = `<div class="alerta alerta-warning">Preencha os dois campos.</div>`; return; }
    if (n1.length < 3) { msgBox.innerHTML = `<div class="alerta alerta-warning">Mínimo 3 caracteres.</div>`; return; }
    if (n1 !== n2) { msgBox.innerHTML = `<div class="alerta alerta-error">As senhas não conferem.</div>`; return; }
    const btn = qs('#usr-btn-salvar-senha');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      await atualizarSenhaUsuario(sel, n1);
      msgBox.innerHTML = `<div class="alerta alerta-success">Senha de ${escapeHtml(sel)} alterada com sucesso!</div>`;
      qs('#usr-nova-senha').value = ''; qs('#usr-conf-senha').value = '';
    } catch (e) {
      msgBox.innerHTML = `<div class="alerta alerta-error">Erro: ${escapeHtml(e.message)}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar nova senha';
    }
  });
}
