(function(window) {
    'use strict';

    window.PBC_CREATE_MANAGER_PANEL = function(deps = {}) {
        const getVisibleModuleIds = deps.getVisibleModuleIds || (() => []);
        const toDateFromFirestore = deps.toDateFromFirestore || (() => null);
        const getAdminCreatedDateInfo = deps.getAdminCreatedDateInfo || (() => ({ date: null, inferred: false }));
        const formatAdminDateTime = deps.formatAdminDateTime || (() => 'Não registrado');
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const showAppToast = deps.showAppToast || (() => {});
        const userMatchesSearch = deps.userMatchesSearch || (() => true);
        const openCommandPanel = deps.openCommandPanel || (() => {});
        const closeCommandPanel = deps.closeCommandPanel || (() => {});
        const getCurrentUserData = deps.getCurrentUserData || (() => null);

        let managerUnsubscribe = null;
        let currentManagerQuickFilter = 'all';

        window.closeManagerRealtime = function() {
            if (typeof managerUnsubscribe === 'function') {
                managerUnsubscribe();
                managerUnsubscribe = null;
                console.log("🔒 Conexão em tempo real encerrada.");
            }
        };

// ============================================================
// BLOCO CORRIGIDO: GESTÃO DE EQUIPE, FILTRO E PROGRESSO
// ============================================================

// --- FUNÇÃO SUBSTITUTA (Copie e cole sobre a antiga window.openManagerPanel) ---
window.openManagerPanel = function() {
    console.log("🔓 Abrindo Painel do Gestor (MODO TEMPO REAL)...");

    const db = window.__fbDB || window.fbDB; 
    
    // Verificação de segurança
    if (!db) { alert("⏳ Sistema carregando. Tente novamente."); return; }
    if (!getCurrentUserData()) { alert("❌ Erro: Usuário não identificado."); return; }

    const modal = document.getElementById("manager-modal");
    const overlay = document.getElementById("admin-modal-overlay");
    const tbody = document.getElementById("manager-table-body");
    const titleEl = document.getElementById("manager-company-name");
    const filterSelect = document.getElementById('mgr-filter-turma');

    if (!modal || !overlay) return;

    // Abre o modal sem deslocar a página de fundo
    openCommandPanel(modal, overlay);
    currentManagerQuickFilter = 'all';
    document.querySelectorAll('[data-manager-filter-btn]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.managerFilterBtn === 'all');
        btn.classList.toggle('ring-2', false);
        btn.classList.toggle('ring-blue-500', false);
    });

    if (titleEl) titleEl.textContent = "Gestão de Equipe (Ao Vivo 🔴)";
    
    // Configura o botão de fechar para DESLIGAR a conexão (Economia de dados)
    const closeBtn = document.getElementById("close-manager-modal");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove("show");
            
            // 🔥 AQUI ESTÁ O SEGREDO: Desliga o radar ao fechar a janela
            if (typeof managerUnsubscribe === 'function') {
                managerUnsubscribe();
                managerUnsubscribe = null;
                console.log("🔒 Conexão em tempo real encerrada.");
            }
            
            // Só fecha o overlay se o painel de admin geral não estiver aberto por baixo
            closeCommandPanel(modal, overlay);
        };
    }

    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Conectando ao satélite...</td></tr>`;

    // --- CONEXÃO FIREBASE EM TEMPO REAL ---
    
    // 1. Se já existir uma conexão aberta, fecha a anterior para não duplicar
    if (managerUnsubscribe) managerUnsubscribe();

    try {
        // 2. Cria o Listener (.onSnapshot em vez de .get)
        managerUnsubscribe = db.collection("users").onSnapshot((snapshot) => {
            let users = [];
            let turmasEncontradas = new Set();

            snapshot.forEach(doc => {
                const u = doc.data();
                u.uid = doc.id;
                // Tratamento de dados para evitar erro se o campo não existir
                u.company = (u.company || "Particular").trim()
                if (!u.completedModules) u.completedModules = [];
                
                users.push(u);
                turmasEncontradas.add(u.company);
            });

            // Ordenação Alfabética
            users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            
            // Salva no cache global para o filtro usar
            window.managerCachedUsers = users;

           // Preenche SEMPRE o filtro de turmas com o snapshot atual
if (filterSelect) {
    const valorAtual = filterSelect.value || 'TODOS';
    filterSelect.innerHTML = '<option value="TODOS">Todas as Turmas</option>';
    Array.from(turmasEncontradas).sort().forEach(turma => {
        filterSelect.innerHTML += `<option value="${turma}">${turma}</option>`;
    });
    // Se a turma selecionada ainda existir, mantém; senão volta para TODOS
    const exists = Array.from(filterSelect.options).some(opt => opt.value === valorAtual);
    filterSelect.value = exists ? valorAtual : 'TODOS';
}

            // Chama o renderizador da tabela
            window.filterManagerTable();
            console.log("📡 Dados atualizados em tempo real! (Ping)");

        }, (error) => {
            console.error("Erro no listener:", error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Erro de conexão: ${error.message}</td></tr>`;
        });

    } catch (err) {
        console.error("Erro ao iniciar listener:", err);
    }
};

// 2. Função de Filtro Inteligente
window.filterManagerTable = function() {
    const input = document.getElementById('manager-search-input');
    const select = document.getElementById('mgr-filter-turma');
    const selectedTurma = select ? select.value : 'TODOS';
    
    if (!window.managerCachedUsers) return;

    let filteredList = window.managerCachedUsers;

    if (selectedTurma !== 'TODOS') {
        filteredList = window.managerCachedUsers.filter(u => u.company === selectedTurma);
    }

    if (input && input.value) {
        filteredList = filteredList.filter(u => userMatchesSearch(u, input.value));
    }

    filteredList = filteredList.filter(user => {
        const metrics = getManagerUserMetrics(user);
        if (currentManagerQuickFilter === 'inactive') return metrics.isInactive;
        if (currentManagerQuickFilter === 'completed') return metrics.percent >= 100;
        if (currentManagerQuickFilter === 'noAccess') return metrics.noAccess;
        if (currentManagerQuickFilter === 'expired') return metrics.isExpired;
        if (currentManagerQuickFilter === 'premium') return user.status === 'premium';
        return true;
    });

    window.renderManagerTable(filteredList);
};

window.setManagerQuickFilter = function(filter) {
    currentManagerQuickFilter = filter || 'all';
    document.querySelectorAll('[data-manager-filter-btn]').forEach(btn => {
        const active = btn.dataset.managerFilterBtn === currentManagerQuickFilter;
        btn.classList.toggle('active', active);
        btn.classList.toggle('ring-2', active);
        btn.classList.toggle('ring-blue-500', active);
    });
    window.filterManagerTable();
};

function getManagerUserMetrics(u) {
    const completedArr = Array.isArray(u.completedModules)
        ? u.completedModules
        : (u.completedModules && typeof u.completedModules === 'object'
            ? Object.keys(u.completedModules)
            : []);

    const userVisibleModules = getVisibleModuleIds(u);
    const total = userVisibleModules.length || 1;
    const modulesDone = userVisibleModules.filter(id => completedArr.includes(id)).length;
    const percent = Math.min(Math.round((modulesDone / total) * 100), 100);
    const lastLoginDate = toDateFromFirestore(u.last_login);
    const createdInfo = getAdminCreatedDateInfo(u);
    const referenceDate = lastLoginDate || createdInfo.date;
    const daysSinceAccess = referenceDate ? Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const validade = u.acesso_ate ? new Date(u.acesso_ate) : null;
    const isExpired = Boolean(validade && new Date() > validade);
    const noAccess = !lastLoginDate;
    const isInactive = percent < 100 && (noAccess || (daysSinceAccess !== null && daysSinceAccess >= 7) || isExpired);

    return { completedArr, total, modulesDone, percent, lastLoginDate, createdInfo, daysSinceAccess, validade, isExpired, noAccess, isInactive };
}

function managerWhatsAppLink(phone, name) {
    const digits = onlyDigits(phone);
    if (digits.length < 8) return '';
    const normalized = digits.startsWith('55') ? digits : `55${digits}`;
    const msg = encodeURIComponent(`Olá, ${name || 'aluno'}! Aqui é da equipe Projeto Bravo Charlie. Vi seu progresso no curso e estou passando para acompanhar sua evolução. Precisa de alguma ajuda?`);
    return `https://wa.me/${normalized}?text=${msg}`;
}

// 3. Função de Tabela com Progresso Corrigido
window.renderManagerTable = function(usersList) {
    const tbody = document.getElementById('manager-table-body');
    if (!tbody) return;

    let html = '';
    let stats = { total: 0, completed: 0, progress: 0, pending: 0, inactive: 0, average: 0 };
    let percentSum = 0;

    if (!usersList || usersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500 italic">Nenhum aluno encontrado nesta turma.</td></tr>';
        updateManagerStats(stats);
        return;
    }

    usersList
        .slice()
        .sort((a, b) => getManagerUserMetrics(a).percent - getManagerUserMetrics(b).percent)
        .forEach(u => {
        const metrics = getManagerUserMetrics(u);
        const { total, modulesDone, percent, daysSinceAccess, validade, isExpired, noAccess, isInactive } = metrics;

        let progressColor = 'bg-gray-300';
        if (percent > 0) progressColor = 'bg-red-500';
        if (percent > 30) progressColor = 'bg-yellow-500';
        if (percent > 80) progressColor = 'bg-green-500';
        if (percent === 100) progressColor = 'bg-blue-600';

        stats.total++;
        if (percent >= 100) stats.completed++;
        else if (percent > 0) stats.progress++;
        else stats.pending++;
        if (isInactive) stats.inactive++;
        percentSum += percent;

        const phone = u.phone || 'Não informado';
        const email = u.email || 'Sem e-mail';
        const turma = u.company || 'Particular';
        const whatsapp = managerWhatsAppLink(phone, u.name);
        const lastAccessText = noAccess
            ? 'Nunca acessou'
            : (daysSinceAccess <= 0 ? 'Hoje' : `Há ${daysSinceAccess} dia${daysSinceAccess > 1 ? 's' : ''}`);
        const createdText = metrics.createdInfo.date ? formatAdminDateTime(metrics.createdInfo.date) : 'Não registrado';
        const note = u.managerNote || u.adminNote || '';
        const alertBadge = isExpired
            ? '<span class="manager-alert danger"><i class="fas fa-ban"></i> vencido</span>'
            : isInactive
                ? '<span class="manager-alert warn"><i class="fas fa-triangle-exclamation"></i> parado</span>'
                : percent >= 100
                    ? '<span class="manager-alert ok"><i class="fas fa-check"></i> concluído</span>'
                    : '<span class="manager-alert info"><i class="fas fa-route"></i> acompanhando</span>';
        
        let statusBadge = u.status === 'premium' 
            ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-[10px] rounded font-bold uppercase">PREMIUM</span>' 
            : '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] rounded font-bold uppercase">TRIAL</span>';

        let validadeStr = validade ? validade.toLocaleDateString('pt-BR') : '-';

        html += `
            <tr class="manager-row hover:bg-gray-50 border-b border-gray-100 group transition-colors ${isInactive ? 'manager-row-alert' : ''}">
                <td class="px-4 py-3">
                    <div class="font-bold text-gray-800 text-sm">${escapeHtml(u.name || 'Sem Nome')}</div>
                    <div class="text-xs text-gray-500">${escapeHtml(email)}</div>
                    <div class="mt-1">${alertBadge}</div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="fas fa-envelope text-blue-500"></i> ${escapeHtml(email)}
                        <button onclick="editUserEmail('${u.uid}', '${escapeJsString(email)}')" class="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100" title="Editar e-mail"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                    <div class="flex items-center gap-2">
                        ${phone !== 'Não informado' ? '<i class="fab fa-whatsapp text-green-500"></i>' : ''} ${escapeHtml(phone)}
                        <button onclick="editUserPhone('${u.uid}', '${escapeJsString(phone)}')" class="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                    ${whatsapp ? `<a href="${whatsapp}" target="_blank" rel="noopener" class="manager-whatsapp-link"><i class="fab fa-whatsapp"></i> chamar</a>` : ''}
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] rounded font-bold border border-blue-100 uppercase">${escapeHtml(turma)}</span>
                        <button onclick="editUserClass('${u.uid}', '${escapeJsString(turma)}')" class="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                </td>
                <td class="px-4 py-3" title="${modulesDone}/${total}">
                    <div class="flex items-center w-full max-w-[140px]">
                        <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden">
                            <div class="${progressColor} h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                        <span class="text-xs font-bold text-gray-700 w-8 text-right">${percent}%</span>
                    </div>
                    <div class="text-[11px] text-gray-500 mt-1">${modulesDone}/${total} módulos</div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600">
                    <div><strong>Último acesso:</strong> ${lastAccessText}</div>
                    <div class="mt-1"><strong>Criado:</strong> ${createdText}</div>
                    ${note ? `<div class="manager-note mt-2"><i class="fas fa-sticky-note"></i> ${escapeHtml(note)}</div>` : ''}
                </td>
                <td class="px-4 py-3">
                    ${statusBadge}
                    <div class="text-[11px] text-gray-500 mt-1">Vence: ${validadeStr}</div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-2">
                        <button onclick="openManagerStudentDetails('${u.uid}')" class="manager-action-btn details"><i class="fas fa-eye"></i></button>
                        <button onclick="editManagerNote('${u.uid}', '${escapeJsString(note)}')" class="manager-action-btn note"><i class="fas fa-pen-to-square"></i></button>
                        ${whatsapp ? `<a href="${whatsapp}" target="_blank" rel="noopener" class="manager-action-btn whatsapp"><i class="fab fa-whatsapp"></i></a>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    stats.average = stats.total ? Math.round(percentSum / stats.total) : 0;
    tbody.innerHTML = html;
    updateManagerStats(stats);
};

function updateManagerStats(stats) {
    if(document.getElementById('mgr-total-users')) document.getElementById('mgr-total-users').innerText = stats.total;
    if(document.getElementById('mgr-completed')) document.getElementById('mgr-completed').innerText = stats.completed;
    if(document.getElementById('mgr-progress')) document.getElementById('mgr-progress').innerText = stats.progress;
    if(document.getElementById('mgr-pending')) document.getElementById('mgr-pending').innerText = stats.pending;
    if(document.getElementById('mgr-inactive')) document.getElementById('mgr-inactive').innerText = stats.inactive || 0;
    if(document.getElementById('mgr-average')) document.getElementById('mgr-average').innerText = `${stats.average || 0}%`;
}

window.openManagerStudentDetails = function(uid) {
    const user = (window.managerCachedUsers || []).find(u => u.uid === uid);
    if (!user) return alert("Aluno não encontrado no painel atual.");

    const metrics = getManagerUserMetrics(user);
    const lastAccessText = metrics.noAccess
        ? 'Nunca acessou'
        : (metrics.daysSinceAccess <= 0 ? 'Hoje' : `Há ${metrics.daysSinceAccess} dia${metrics.daysSinceAccess > 1 ? 's' : ''}`);
    const validadeStr = metrics.validade ? metrics.validade.toLocaleDateString('pt-BR') : '-';
    const createdText = metrics.createdInfo.date ? formatAdminDateTime(metrics.createdInfo.date) : 'Não registrado';
    const note = user.managerNote || user.adminNote || 'Sem observação.';

    alert(
        `Aluno: ${user.name || 'Sem nome'}\n` +
        `E-mail: ${user.email || 'Sem e-mail'}\n` +
        `Telefone: ${user.phone || 'Não informado'}\n` +
        `Turma: ${user.company || 'Particular'}\n\n` +
        `Progresso: ${metrics.percent}% (${metrics.modulesDone}/${metrics.total} módulos)\n` +
        `Status: ${(user.status || 'trial').toUpperCase()}\n` +
        `Vencimento: ${validadeStr}\n` +
        `Último acesso: ${lastAccessText}\n` +
        `Criado em: ${createdText}\n\n` +
        `Observação:\n${note}`
    );
};

window.editManagerNote = async function(uid, currentNote) {
    const cleanNote = currentNote === 'undefined' ? '' : currentNote;
    const note = prompt("Observação do gestor para este aluno:", cleanNote);
    if (note === null) return;

    try {
        await window.__fbDB.collection('users').doc(uid).update({
            managerNote: note,
            managerNoteUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAppToast('Observação salva', 'A nota do gestor foi atualizada.', 'success');
    } catch (e) {
        alert("Erro ao salvar observação: " + e.message);
    }
};

function refreshUserManagementPanels() {
    const adminOpen = document.getElementById('admin-modal')?.classList.contains('show');
    const managerOpen = document.getElementById('manager-modal')?.classList.contains('show');
    if (adminOpen && typeof window.openAdminPanel === 'function') {
        window.openAdminPanel();
    } else if (managerOpen && typeof window.openManagerPanel === 'function') {
        window.openManagerPanel();
    }
}

// FUNÇÃO DE EDITAR TURMA
window.editUserClass = async function(uid, oldClass) {
    const newClass = prompt("Digite o novo nome da Turma/Empresa:", oldClass);
    
    if (newClass && newClass !== oldClass) {
        try {
            await window.__fbDB.collection('users').doc(uid).update({ 
                company: newClass.toUpperCase() 
            });
            showAppToast('Turma atualizada', 'O cadastro do aluno foi ajustado.', 'success');
            refreshUserManagementPanels();
        } catch (e) {
            alert("Erro ao atualizar: " + e.message);
        }
    }
};

window.editUserEmail = async function(uid, oldEmail) {
    const cleanEmail = oldEmail === 'Sem e-mail' ? '' : oldEmail;
    const newEmail = prompt("Digite o novo e-mail do aluno:", cleanEmail);
    if (newEmail === null) return;
    const formatted = newEmail.trim().toLowerCase();
    if (!formatted || formatted === cleanEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formatted)) {
        showAppToast('E-mail inválido', 'Confira o endereço antes de salvar.', 'warning');
        return;
    }
    try {
        await window.__fbDB.collection('users').doc(uid).update({
            email: formatted,
            emailUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAppToast('E-mail atualizado', 'O cadastro do aluno foi ajustado na plataforma.', 'success');
        refreshUserManagementPanels();
    } catch (e) {
        alert("Erro ao atualizar e-mail: " + e.message);
    }
};

    // FUNÇÃO DE EDITAR TELEFONE (NOVO)
window.editUserPhone = async function(uid, oldPhone) {
    // Se for "Não informado", limpa o campo para digitar do zero
    const cleanPhone = oldPhone === 'Não informado' ? '' : oldPhone;
    
    const newPhone = prompt("Digite o novo WhatsApp/Telefone:", cleanPhone);
    
    // Verifica se digitou algo e se é diferente do anterior
    if (newPhone !== null && newPhone !== cleanPhone) {
        try {
            await window.__fbDB.collection('users').doc(uid).update({ 
                phone: newPhone 
            });
            showAppToast('Telefone atualizado', 'O cadastro do aluno foi ajustado.', 'success');
            refreshUserManagementPanels();
        } catch (e) {
            alert("Erro ao atualizar: " + e.message);
        }
    }
};
    // Função para dar/tirar poder de Gestor
window.toggleManagerRole = async function(uid, currentStatus) {
    const novoStatus = !currentStatus; // Inverte (se era true vira false, e vice-versa)
    const acao = novoStatus ? "PROMOVER" : "REMOVER";
    
    if(confirm(`Deseja ${acao} este usuário como Gestor de Empresa?`)) {
        try {
            await window.__fbDB.collection('users').doc(uid).update({ 
                isManager: novoStatus 
            });
            alert(`Sucesso! Permissão de Gestor ${novoStatus ? 'CONCEDIDA' : 'REMOVIDA'}.`);
            window.openAdminPanel(); // Atualiza a lista
        } catch(e) {
            alert("Erro: " + e.message);
        }
    }
};

    };
})(window);
