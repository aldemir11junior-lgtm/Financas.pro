// ─────────────────────────────────────────────────────────────────────────
// CONTA
// ─────────────────────────────────────────────────────────────────────────
function renderConta() {
  const container = qs('#page-Conta');
  container.innerHTML = `
    <div class="page-title">Minha <span>Conta</span></div>
    <div class="page-sub">Altere sua senha de acesso quando quiser.</div>

    <div class="section-title">Atualizar Dados</div>
    <div class="caption">Se você lançou algo em outro aparelho (ou outra aba) e não está aparecendo aqui, use este botão para recarregar tudo direto do banco de dados, sem precisar sair e entrar de novo.</div>
    <div id="conta-msg-atualizar"></div>
    <button class="btn btn-primary btn-block" id="conta-btn-atualizar">Atualizar Dados</button>

    <div class="divider"></div>

    <div class="section-title">Alterar Senha</div>
    <div id="conta-msg-senha"></div>
    <div class="field"><label>Senha atual</label><input type="password" id="conta-senha-atual"></div>
    <div class="field"><label>Nova senha</label><input type="password" id="conta-senha-nova1"></div>
    <div class="field"><label>Confirmar nova senha</label><input type="password" id="conta-senha-nova2"></div>
    <button class="btn btn-primary btn-block" id="conta-btn-salvar-senha">Salvar nova senha</button>
  `;

  qs('#conta-btn-atualizar').addEventListener('click', async () => {
    const btn = qs('#conta-btn-atualizar');
    btn.disabled = true; btn.textContent = 'Atualizando...';
    try {
      const [{ lancamentos, lixeira }, categoriasMap, planejamentoMap] = await Promise.all([
        loadData(STATE.username), loadCategorias(), loadPlanejamento(STATE.username),
      ]);
      STATE.lancamentos = lancamentos;
      STATE.lixeira = lixeira;
      STATE.categoriasMap = categoriasMap;
      STATE.planejamentoMap = planejamentoMap;
      atualizarFooter();
      qs('#conta-msg-atualizar').innerHTML = `<div class="alerta alerta-success">Dados atualizados direto do banco de dados!</div>`;
    } catch (e) {
      qs('#conta-msg-atualizar').innerHTML = `<div class="alerta alerta-error">Erro ao atualizar: ${escapeHtml(e.message)}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = 'Atualizar Dados';
    }
  });

  qs('#conta-btn-salvar-senha').addEventListener('click', async () => {
    const atual = qs('#conta-senha-atual').value;
    const n1 = qs('#conta-senha-nova1').value;
    const n2 = qs('#conta-senha-nova2').value;
    const msgBox = qs('#conta-msg-senha');

    if (!atual || !n1 || !n2) { msgBox.innerHTML = `<div class="alerta alerta-warning">Preencha todos os campos.</div>`; return; }
    if (n1.length < 3) { msgBox.innerHTML = `<div class="alerta alerta-warning">A nova senha deve ter pelo menos 3 caracteres.</div>`; return; }
    if (n1 !== n2) { msgBox.innerHTML = `<div class="alerta alerta-error">As novas senhas não conferem.</div>`; return; }

    const btn = qs('#conta-btn-salvar-senha');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      const usuarios = await loadUsers();
      const uConta = usuarios.find(u => u.usuario.toLowerCase() === STATE.username.toLowerCase());
      const hashAtual = await hashPw(atual);
      if (!uConta || uConta.senha_hash !== hashAtual) {
        msgBox.innerHTML = `<div class="alerta alerta-error">Senha atual incorreta.</div>`;
      } else {
        await atualizarSenhaUsuario(STATE.username, n1);
        msgBox.innerHTML = `<div class="alerta alerta-success">Senha alterada com sucesso!</div>`;
        qs('#conta-senha-atual').value = ''; qs('#conta-senha-nova1').value = ''; qs('#conta-senha-nova2').value = '';
      }
    } catch (e) {
      msgBox.innerHTML = `<div class="alerta alerta-error">Erro ao alterar senha: ${escapeHtml(e.message)}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar nova senha';
    }
  });
}
