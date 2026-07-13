(function(window) {
    'use strict';

    window.PBC_CREATE_ADMIN_PANEL = function(deps = {}) {
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase());
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const showAppToast = deps.showAppToast || (() => {});
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const openCommandPanel = deps.openCommandPanel || (() => {});
        const forceCloseCommandPanels = deps.forceCloseCommandPanels || (() => {});
        const getAdminCreatedDateInfo = deps.getAdminCreatedDateInfo || (() => ({ date: null, inferred: false }));
        const formatAdminDateTime = deps.formatAdminDateTime || (() => 'Não registrado');
        const getCurrentUserData = deps.getCurrentUserData || (() => null);

        let currentAdminQuickFilter = 'all';
        
        window.filterAdminTable = function() {
            const input = document.getElementById('admin-search-input');
            const termo = normalizeSearchText(input?.value || '');
            const termoDigits = onlyDigits(input?.value || '');
            const linhas = document.querySelectorAll('#admin-table-body tr');
            linhas.forEach(linha => {
                const rowText = normalizeSearchText(linha.innerText);
                const rowDigits = onlyDigits(linha.innerText);
                const matchesEmpty = !termo && !termoDigits;
                const matchesText = termo && rowText.includes(termo);
                const matchesDigits = termoDigits && rowDigits.includes(termoDigits);
                let matchesQuickFilter = true;
        
                if (currentAdminQuickFilter === 'recent') matchesQuickFilter = linha.dataset.adminRecent === 'true';
                if (currentAdminQuickFilter === 'duplicates') matchesQuickFilter = linha.dataset.adminDuplicate === 'true';
                if (currentAdminQuickFilter === 'expired') matchesQuickFilter = linha.dataset.adminExpired === 'true';
                if (currentAdminQuickFilter === 'trial') matchesQuickFilter = linha.dataset.adminStatus === 'trial';
                if (currentAdminQuickFilter === 'premium') matchesQuickFilter = linha.dataset.adminStatus === 'premium';
        
                linha.style.display = (matchesQuickFilter && (matchesEmpty || matchesText || matchesDigits)) ? '' : 'none';
            });
        };
        
        window.setAdminQuickFilter = function(filter) {
            currentAdminQuickFilter = filter || 'all';
            const input = document.getElementById('admin-search-input');
            if (input) input.value = '';
        
            document.querySelectorAll('[data-admin-filter-btn]').forEach(btn => {
                const isActive = btn.dataset.adminFilterBtn === currentAdminQuickFilter;
                btn.classList.toggle('ring-2', isActive);
                btn.classList.toggle('ring-blue-500', isActive);
                btn.classList.toggle('scale-[1.02]', isActive);
            });
        
            window.filterAdminTable();
            document.getElementById('admin-users-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        // --- FUNÇÕES ADMIN (ATUALIZADAS E LEGÍVEIS) ---
        window.openAdminPanel = async function() {
            if (!getCurrentUserData() || !getCurrentUserData().isAdmin) return;
        
            const adminModal = document.getElementById('admin-modal');
            const adminOverlay = document.getElementById('admin-modal-overlay');
            
            openCommandPanel(adminModal, adminOverlay);
        
            const tbody = document.getElementById('admin-table-body');
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center">Carregando usuários...</td></tr>';
        
            const db = window.__fbDB || window.fbDB;
            if (!db) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Banco de dados não carregado.</td></tr>';
                return;
            }
        
            try {
                const snapshot = await db.collection('users').get();
                tbody.innerHTML = '';
                currentAdminQuickFilter = 'all';
        
                let users = [];
                snapshot.forEach(doc => {
                    const u = doc.data();
                    const uid = doc.id;
                    users.push({ uid, data: u });
                });
        
                const countBy = (getKey) => {
                    const map = {};
                    users.forEach(({ data }) => {
                        const key = getKey(data);
                        if (!key) return;
                        map[key] = (map[key] || 0) + 1;
                    });
                    return map;
                };
        
                const cpfCounts = countBy(u => {
                    const cpf = onlyDigits(u.cpf);
                    return cpf.length >= 11 ? cpf : '';
                });
                const phoneCounts = countBy(u => {
                    const phone = onlyDigits(u.phone);
                    return phone.length >= 8 ? phone.slice(-9) : '';
                });
                const nameCounts = countBy(u => normalizeSearchText(u.name));
        
                const getDuplicateAlerts = (u) => {
                    const alerts = [];
                    const cpf = onlyDigits(u.cpf);
                    const phone = onlyDigits(u.phone);
                    const name = normalizeSearchText(u.name);
        
                    if (cpf && cpfCounts[cpf] > 1) alerts.push('CPF repetido');
                    if (phone.length >= 8 && phoneCounts[phone.slice(-9)] > 1) alerts.push('telefone repetido');
                    if (name && nameCounts[name] > 1) alerts.push('nome repetido');
        
                    return alerts;
                };
        
                // Ordena por cadastro recente para você ver primeiro quem acabou de entrar.
                users.sort((a, b) => {
                    const da = getAdminCreatedDateInfo(a.data).date?.getTime() || 0;
                    const dbb = getAdminCreatedDateInfo(b.data).date?.getTime() || 0;
                    if (dbb !== da) return dbb - da;
                    const na = (a.data.name || '').toLocaleLowerCase('pt-BR');
                    const nb = (b.data.name || '').toLocaleLowerCase('pt-BR');
                    return na.localeCompare(nb, 'pt-BR');
                });
        
                let stats = { total: 0, premium: 0, trial: 0, recent: 0, expired: 0, duplicateSuspects: 0 };
        
                users.forEach(({ uid, data: u }) => {
                    stats.total++;
                    if (u.status === 'premium') stats.premium++;
                    else stats.trial++;
        
                    // --- LÓGICA DE STATUS ---
                    let statusDisplay = u.status || 'trial';
                    let statusColor = 'bg-gray-100 text-gray-800';
                    const validade = u.acesso_ate ? new Date(u.acesso_ate) : null;
                    const isExpired = validade && new Date() > validade;
                    const validadeStr = validade ? validade.toLocaleDateString('pt-BR') : '-';
                    const createdInfo = getAdminCreatedDateInfo(u);
                    const createdDate = createdInfo.date;
                    const createdAtStr = createdDate ? `${formatAdminDateTime(createdDate)}${createdInfo.inferred ? ' (estimado pelo trial)' : ''}` : 'Não registrado';
                    const lastLoginStr = formatAdminDateTime(u.last_login);
                    const isRecentSignup = createdDate && ((Date.now() - createdDate.getTime()) <= 7 * 24 * 60 * 60 * 1000);
                    const duplicateAlerts = getDuplicateAlerts(u);
        
                    if (isRecentSignup) stats.recent++;
                    if (isExpired) stats.expired++;
                    if (duplicateAlerts.length) stats.duplicateSuspects++;
        
                    if (u.status === 'premium') {
                        if (isExpired) {
                            statusDisplay = 'EXPIRADO';
                            statusColor = 'bg-red-100 text-red-800';
                        } else {
                            statusColor = 'bg-green-100 text-green-800';
                        }
                    } else {
                        statusColor = 'bg-yellow-100 text-yellow-800';
                    }
        
                    const cpf = u.cpf || 'Sem CPF';
                    const phone = u.phone || 'Sem telefone';
                    const turmaLabel = String(u.company || 'Turma não informada').trim() || 'Turma não informada';
                    const planoTipo = u.planType || (u.status === 'premium' ? 'Indefinido' : 'Trial');
                    const deviceInfo = u.last_device || 'Desconhecido';
                    const signupDevice = u.signup_device || deviceInfo;
                    const noteIconColor = u.adminNote ? 'text-yellow-500' : 'text-gray-400';
                    const duplicateBadge = duplicateAlerts.length
                        ? `<div class="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-[11px] font-bold text-red-700"><i class="fas fa-triangle-exclamation"></i> Possível duplicado: ${escapeHtml(duplicateAlerts.join(', '))}</div>`
                        : '';
                    const recentBadge = isRecentSignup
                        ? `<span class="ml-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">NOVO</span>`
                        : '';
                    const expiredBadge = isExpired
                        ? `<div class="mt-1 text-[11px] font-bold text-red-600"><i class="fas fa-clock"></i> Acesso vencido</div>`
                        : '';
        
                    // --- NOVO: LÓGICA DO CURSO (BC vs SP) ---
                    const cursoCodigo = u.courseType || 'BC'; // Padrão BC se não existir
                    const cursoLabel = cursoCodigo === 'SP' ? 'SEG. PATRIMONIAL' : 'BOMBEIRO CIVIL';
                    const cursoBadgeColor = cursoCodigo === 'SP' 
                        ? 'bg-blue-100 text-blue-800 border-blue-200' 
                        : 'bg-red-100 text-red-800 border-red-200';
        
                    const row = `
                        <tr id="admin-user-${uid}" data-admin-recent="${isRecentSignup ? 'true' : 'false'}" data-admin-duplicate="${duplicateAlerts.length ? 'true' : 'false'}" data-admin-expired="${isExpired ? 'true' : 'false'}" data-admin-status="${escapeHtml(u.status || 'trial')}" class="border-b hover:bg-gray-50 transition-colors ${duplicateAlerts.length ? 'bg-red-50/40' : ''}">
                            <td class="p-3 font-bold text-gray-800">
                                ${escapeHtml(u.name || 'Sem nome')} ${recentBadge}
                                <div class="admin-student-meta-row">
                                    <span class="admin-class-badge"><i class="fas fa-users"></i> ${escapeHtml(turmaLabel)}</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${cursoBadgeColor}">${cursoLabel}</span>
                                </div>
                                ${duplicateBadge}
                            </td>
                            <td class="p-3 text-gray-600 text-sm">
                                <div class="admin-contact-line">
                                    <span>${escapeHtml(u.email || 'Sem e-mail')}</span>
                                    <button onclick="editUserEmail('${uid}', '${escapeJsString(u.email || '')}')" class="admin-mini-edit" title="Editar e-mail"><i class="fas fa-pencil-alt"></i></button>
                                </div>
                                <span class="text-xs text-gray-500">CPF: ${escapeHtml(cpf)}</span><br>
                                <span class="text-xs text-gray-500">Tel: ${escapeHtml(phone)}</span>
                                <button onclick="editUserPhone('${uid}', '${escapeJsString(phone)}')" class="admin-mini-edit" title="Editar telefone"><i class="fas fa-phone"></i></button>
                            </td>
                            <td class="p-3 text-xs text-gray-500">
                                <div><strong class="text-gray-700">Criou:</strong> ${createdAtStr}</div>
                                <div class="mt-1"><strong class="text-gray-700">Último acesso:</strong> ${lastLoginStr}</div>
                                <div class="mt-1 max-w-[180px] truncate" title="${escapeHtml(signupDevice)}"><strong class="text-gray-700">Dispositivo:</strong> ${escapeHtml(signupDevice)}</div>
                            </td>
                            <td class="p-3">
                                <div class="flex flex-col items-start">
                                    <span class="px-2 py-1 rounded text-xs font-bold uppercase ${statusColor}">${statusDisplay}</span>
                                    <span class="text-xs text-gray-500 mt-1">${planoTipo}</span>
                                    ${expiredBadge}
                                </div>
                            </td>
                            <td class="p-3 text-sm font-medium">${validadeStr}</td>
                            <td class="p-3 flex flex-wrap gap-2">
                                <button onclick="editUserData('${uid}', '${escapeJsString(u.name)}', '${escapeJsString(cpf)}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Editar Dados"><i class="fas fa-pen"></i></button>
                                <button onclick="previewStudentProfile('${uid}')" class="bg-sky-500 hover:bg-sky-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Ver como aluno"><i class="fas fa-eye"></i></button>
                                
                                <!-- BOTÃO NOVO: ALTERAR CURSO -->
                                <button onclick="changeUserCourse('${uid}', '${cursoCodigo}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded text-xs shadow" title="Alterar Curso (BC/SP)"><i class="fas fa-graduation-cap"></i></button>
                                
                                <button onclick="editUserNote('${uid}', '${escapeJsString(u.adminNote || '')}')" class="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-2 py-1.5 rounded text-xs shadow" title="Nota Admin"><i class="fas fa-sticky-note ${noteIconColor}"></i></button>
                                <button onclick="manageUserAccess('${uid}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Gerenciar Plano"><i class="fas fa-calendar-alt"></i></button>
                                <button onclick="sendResetEmail('${escapeJsString(u.email || '')}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Resetar Senha"><i class="fas fa-key"></i></button>
                                <button onclick="deleteUser('${uid}', '${escapeJsString(u.name)}', '${escapeJsString(cpf)}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Excluir"><i class="fas fa-trash"></i></button>
                                <button onclick="toggleManagerRole('${uid}', ${u.isManager})" class="${u.isManager ? 'bg-purple-600' : 'bg-gray-400'} hover:bg-purple-500 text-white px-2 py-1.5 rounded text-xs shadow" title="Alternar Gestor"><i class="fas fa-briefcase"></i></button>
                            </td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
        
                updateAdminStats(stats);
                window.setAdminQuickFilter('all');
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Erro ao carregar: ${err.message}</td></tr>`;
            }
        };
        
        window.editUserCertificate = async function(uid, currentUrl = '') {
            if (!isInstructorAdmin(getCurrentUserData())) {
                showAppToast('Acesso restrito', 'Apenas o administrador pode alterar certificado.', 'warning');
                return;
            }
            const db = window.__fbDB || window.fbDB;
            if (!db || !uid) {
                showAppToast('Erro', 'Banco de dados ou aluno não encontrado.', 'error');
                return;
            }
            const url = prompt(
                'Cole o link do certificado do aluno.\n\nUse um link do Google Drive, PDF ou página do certificado.\nPara remover, deixe em branco e confirme.',
                currentUrl || ''
            );
            if (url === null) return;
        
            try {
                await db.collection('users').doc(uid).update({
                    certificateUrl: String(url || '').trim(),
                    certificateUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                showAppToast(url ? 'Certificado vinculado' : 'Certificado removido', 'O perfil do aluno foi atualizado.', 'success');
                await window.openAdminPanel?.();
            } catch (error) {
                console.error(error);
                showAppToast('Erro ao salvar certificado', error?.message || 'Tente novamente.', 'error');
            }
        };
        
        window.previewStudentProfile = async function(uid) {
            if (!isInstructorAdmin(getCurrentUserData())) {
                showAppToast('Acesso restrito', 'A visão do aluno é exclusiva do administrador.', 'warning');
                return;
            }
        
            const db = window.__fbDB || window.fbDB;
            if (!db || !uid) {
                showAppToast('Não consegui abrir', 'Banco de dados ou aluno não encontrado.', 'error');
                return;
            }
        
            try {
                const doc = await db.collection('users').doc(uid).get();
                if (!doc.exists) {
                    showAppToast('Aluno não encontrado', 'Esse cadastro não existe mais no banco.', 'warning');
                    return;
                }
        
                forceCloseCommandPanels();
                const studentData = { ...(doc.data() || {}), uid: doc.id, __adminPreview: true };
                window.renderStudentProfilePage?.(studentData);
                showAppToast('Visão do aluno aberta', `Você está vendo o perfil de ${studentData.name || 'aluno'}.`, 'info');
            } catch (error) {
                console.error(error);
                showAppToast('Erro ao abrir visão do aluno', 'Tente novamente pelo painel administrativo.', 'error');
            }
        };
        
        function updateAdminStats(stats) {
            const totalEl = document.getElementById('admin-total-users');
            const premEl  = document.getElementById('admin-total-premium');
            const trialEl = document.getElementById('admin-total-trial');
            const recentEl = document.getElementById('admin-total-recent');
            const expiredEl = document.getElementById('admin-total-expired');
            const duplicateEl = document.getElementById('admin-total-duplicates');
        
            if (totalEl) totalEl.textContent = stats.total || 0;
            if (premEl)  premEl.textContent  = stats.premium || 0;
            if (trialEl) trialEl.textContent = stats.trial || 0;
            if (recentEl) recentEl.textContent = stats.recent || 0;
            if (expiredEl) expiredEl.textContent = stats.expired || 0;
            if (duplicateEl) duplicateEl.textContent = stats.duplicateSuspects || 0;
        }
        
        window.editUserData = async function(uid, oldName) {
            const newName = prompt('Editar Nome do Aluno:', oldName);
            if (newName === null || newName === oldName) return;

            try {
                await window.__fbDB.collection('users').doc(uid).update({ name: newName });
                alert('Nome atualizado com sucesso!');
                window.openAdminPanel();
            } catch (e) {
                alert('Erro ao atualizar: ' + e.message);
            }
        };

        window.editUserNote = async function(uid, currentNote) {
            const cleanNote = currentNote === 'undefined' ? '' : currentNote;
            const note = prompt("Nota do Admin (Ex: 'Pagamento pendente', 'VIP'):", cleanNote);
            if (note === null) return;

            try {
                await window.__fbDB.collection('users').doc(uid).update({ adminNote: note });
                window.openAdminPanel();
            } catch (e) {
                alert('Erro ao salvar nota: ' + e.message);
            }
        };

        window.sendResetEmail = async function(email) {
            if (!confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;

            try {
                window.__fbAuth.languageCode = 'pt_BR';
                await window.__fbAuth.sendPasswordResetEmail(email);
                alert(`E-mail de redefinição enviado para ${email}. Peça para o aluno verificar a caixa de entrada/spam.`);
            } catch (e) {
                alert('Erro ao enviar e-mail: ' + e.message);
            }
        };

        window.changeUserCourse = async function(uid, currentType) {
            const promptText = 'Digite o código do curso para este aluno:\n\nBC = Bombeiro Civil\nSP = Segurança Patrimonial';
            let newType = prompt(promptText, currentType);

            if (newType === null) return;

            newType = newType.toUpperCase().trim();

            if (newType !== 'BC' && newType !== 'SP') {
                alert("❌ Código inválido! Use apenas 'BC' ou 'SP'.");
                return;
            }

            if (newType === currentType) {
                alert('O aluno já está neste curso.');
                return;
            }

            try {
                const db = window.__fbDB || window.fbDB;
                await db.collection('users').doc(uid).update({ courseType: newType });
                alert(`✅ Sucesso!\nCurso alterado para: ${newType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil'}.`);
                window.openAdminPanel();
            } catch (e) {
                alert('Erro ao alterar curso: ' + e.message);
                console.error(e);
            }
        };

        window.manageUserAccess = async function(uid) {
            const op = prompt(
                "Selecione a Ação:\n" +
                "1 - MENSAL (30 dias - Vira Premium)\n" +
                "2 - SEMESTRAL (180 dias - Vira Premium)\n" +
                "3 - ANUAL (365 dias - Vira Premium)\n" +
                "4 - VITALÍCIO (10 anos - Vira Premium)\n" +
                "5 - REMOVER PREMIUM (Voltar para Trial Vencido)\n" +
                "6 - PERSONALIZADO (Dias - Vira Premium)\n" +
                "7 - ESTENDER TRIAL (Dias - Mantém TRIAL)" // <--- NOVA OPÇÃO AQUI
            );
        
            if (!op) return;
        
            let diasParaAdicionar = 0;
            let nomePlano = '';
            let novoStatus = 'premium'; // O padrão continua sendo premium para as opções 1 a 4
        
            if (op === '1') { diasParaAdicionar = 30; nomePlano = 'Mensal'; }
            else if (op === '2') { diasParaAdicionar = 180; nomePlano = 'Semestral'; }
            else if (op === '3') { diasParaAdicionar = 365; nomePlano = 'Anual'; }
            else if (op === '4') { diasParaAdicionar = 3650; nomePlano = 'Vitalício'; }
            
            else if (op === '5') {
                // Remover Premium (Lógica Existente)
                try {
                    const ontem = new Date();
                    ontem.setDate(ontem.getDate() - 1);
                    await window.__fbDB.collection('users').doc(uid).update({
                        status: 'trial',
                        acesso_ate: ontem.toISOString(),
                        planType: 'Cancelado'
                    });
                    alert("Acesso Premium removido. O aluno voltou para Trial expirado.");
                    window.openAdminPanel();
                    return;
                } catch (e) { alert(e.message); return; }
            }
            
            else if (op === '6') {
                const i = prompt("Digite a quantidade de dias para o PREMIUM:");
                if (!i) return;
                diasParaAdicionar = parseInt(i);
                nomePlano = 'Personalizado (Premium)';
                novoStatus = 'premium'; // Força Premium
            }
            
            // --- NOVA LÓGICA DO TRIAL ---
            else if (op === '7') {
                const i = prompt("Quantos dias de TRIAL você quer dar a mais?");
                if (!i) return;
                diasParaAdicionar = parseInt(i);
                nomePlano = 'Trial Estendido';
                novoStatus = 'trial'; // <--- AQUI ESTÁ O SEGREDO: Força Trial
            } 
            
            else {
                return;
            }
        
            // Calcula nova data a partir de AGORA
            const agora = new Date();
            const novaData = new Date(agora);
            novaData.setDate(novaData.getDate() + diasParaAdicionar);
        
            try {
                await window.__fbDB.collection('users').doc(uid).update({
                    status: novoStatus, // Usa a variável que definimos corretamente acima
                    acesso_ate: novaData.toISOString(),
                    planType: nomePlano
                });
                
                // Feedback visual mais claro
                const tipoStatus = novoStatus === 'premium' ? 'PREMIUM ⭐' : 'TRIAL ⏳';
                alert(`Sucesso! Status definido como ${tipoStatus}.\nVálido até ${novaData.toLocaleDateString()}`);
                
                window.openAdminPanel();
            } catch (e) {
                alert("Erro ao atualizar: " + e.message);
            }
        };
           
            // 4. Excluir Usuário (Do Banco de Dados)
            window.deleteUser = async function(uid, name, cpf) {
                const confirm1 = confirm(`TEM CERTEZA que deseja excluir os dados de ${name}?`);
                if (!confirm1) return;
                
                const confirm2 = confirm("ATENÇÃO: Esta ação apagará o progresso e o cadastro do banco de dados.\n(Nota: Para segurança, o login da conta deve ser removido manualmente no Console do Firebase, mas o acesso será revogado aqui). Continuar?");
                if (!confirm2) return;
        
                try {
                    // Remove da coleção de usuários
                    await window.__fbDB.collection('users').doc(uid).delete();
                    
                    // Remove da coleção de CPFs (para liberar o CPF)
                    if (cpf && cpf !== 'undefined' && cpf !== 'Sem CPF') {
                        await window.__fbDB.collection('cpfs').doc(cpf).delete();
                    }
        
                    alert("Usuário removido do banco de dados.");
                    window.openAdminPanel(); // Atualiza a tabela
                } catch (e) {
                    alert("Erro ao excluir: " + e.message);
                }
            };
    };
})(window);
