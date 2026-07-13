(function(window) {
    'use strict';

    window.PBC_CREATE_INSTRUCTOR_ANNOUNCEMENTS = function(deps = {}) {
        const getInstructorMessageUsers = deps.getInstructorMessageUsers || (() => []);
        const hasInstructorUsersLoaded = deps.hasInstructorUsersLoaded || (() => false);
        const loadInstructorUsersForMessages = deps.loadInstructorUsersForMessages || (async () => []);
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase());
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const showAppToast = deps.showAppToast || (() => {});
        const getCurrentUserData = deps.getCurrentUserData || (() => null);

        function getInstructorTargetPlaceholder(target) {
            const map = {
                all: 'Todos os alunos',
                company: 'Digite ou selecione a turma',
                student: 'Digite nome, e-mail ou CPF do aluno',
                status: 'Ex: premium ou trial',
                course: 'Ex: BC ou SP'
            };
            return map[target] || 'Selecione o público';
        }
        
        function buildInstructorTargetOptions(target) {
            const datalist = document.getElementById('instructor-ann-target-options');
            if (!datalist) return;
            const users = getInstructorMessageUsers();
            let options = [];
            if (target === 'company') {
                options = [...new Set(users.map(user => user.company || 'Particular').filter(Boolean))];
            } else if (target === 'student') {
                options = users.map(user => {
                    const cpf = user.cpf ? ` - CPF ${user.cpf}` : '';
                    const email = user.email ? ` - ${user.email}` : '';
                    return `${user.name || 'Sem nome'}${email}${cpf}`;
                });
            } else if (target === 'status') {
                options = ['premium', 'trial', 'expirado'];
            } else if (target === 'course') {
                options = ['BC', 'SP'];
            }
            datalist.innerHTML = options
                .slice(0, 200)
                .map(value => `<option value="${escapeHtml(value)}"></option>`)
                .join('');
        }
        
        function resolveInstructorRecipients(target, rawValue) {
            const users = getInstructorMessageUsers();
            const value = String(rawValue || '').trim();
            const valueText = normalizeSearchText(value);
            const valueDigits = onlyDigits(value);
        
            if (target === 'all') {
                return { recipients: users, label: 'todos os alunos' };
            }
        
            if (!value) return { recipients: [], label: 'público não informado' };
        
            if (target === 'student') {
                const found = users.find(user => {
                    const haystack = normalizeSearchText(`${user.name || ''} ${user.email || ''} ${user.cpf || ''}`);
                    const digits = onlyDigits(`${user.cpf || ''} ${user.phone || ''}`);
                    return haystack.includes(valueText) || (valueDigits && digits.includes(valueDigits)) || user.uid === value;
                });
                return {
                    recipients: found ? [found] : [],
                    label: found ? `aluno ${found.name || found.email || found.uid}`
                        : 'aluno não encontrado'
                };
            }
        
            if (target === 'company') {
                const recipients = users.filter(user => normalizeSearchText(user.company || 'Particular') === valueText);
                return { recipients, label: `turma ${value}` };
            }
        
            if (target === 'status') {
                const recipients = users.filter(user => normalizeSearchText(user.status || 'trial') === valueText);
                return { recipients, label: `status ${value}` };
            }
        
            if (target === 'course') {
                const recipients = users.filter(user => normalizeSearchText(user.courseType || 'BC') === valueText);
                return { recipients, label: `curso ${value}` };
            }
        
            return { recipients: [], label: 'público não encontrado' };
        }
        
        window.updateInstructorAnnouncementTarget = function() {
            const target = document.getElementById('instructor-ann-target')?.value || 'all';
            const input = document.getElementById('instructor-ann-target-value');
            const helper = document.getElementById('instructor-ann-helper');
            if (input) {
                input.placeholder = getInstructorTargetPlaceholder(target);
                input.disabled = target === 'all';
                if (target === 'all') input.value = '';
            }
            buildInstructorTargetOptions(target);
            if (helper) {
                helper.textContent = target === 'all'
                    ? 'Todos os alunos ativos receberão a mensagem dentro do app.'
                    : 'Use o campo de filtro para escolher exatamente quem vai receber.';
            }
            window.previewInstructorAnnouncementAudience();
        };
        
        window.previewInstructorAnnouncementAudience = function() {
            const preview = document.getElementById('instructor-ann-preview');
            if (!preview) return;
            const target = document.getElementById('instructor-ann-target')?.value || 'all';
            const value = document.getElementById('instructor-ann-target-value')?.value || '';
            if (!hasInstructorUsersLoaded()) {
                preview.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando alunos cadastrados...';
                return;
            }
            const { recipients, label } = resolveInstructorRecipients(target, value);
            preview.innerHTML = `
                <i class="fas fa-users"></i>
                <strong>${recipients.length}</strong>
                <span>${recipients.length === 1 ? 'aluno receberá' : 'alunos receberão'} esta mensagem (${escapeHtml(label)}).</span>
            `;
        };
        
        window.publishInstructorAnnouncement = async function() {
            if (!isInstructorAdmin()) return;
            const title = document.getElementById('instructor-ann-title')?.value.trim();
            const message = document.getElementById('instructor-ann-message')?.value.trim();
            const target = document.getElementById('instructor-ann-target')?.value || 'all';
            const targetValue = document.getElementById('instructor-ann-target-value')?.value.trim();
            if (!title || !message) {
                showAppToast('Comunicado incompleto', 'Preencha título e mensagem antes de publicar.', 'warning');
                return;
            }
            await loadInstructorUsersForMessages();
            if (target !== 'all' && !targetValue) {
                showAppToast('Informe o público', 'Preencha o filtro para turma, status, curso ou aluno.', 'warning');
                return;
            }
            const { recipients, label } = resolveInstructorRecipients(target, targetValue);
            if (!recipients.length) {
                showAppToast('Nenhum aluno encontrado', 'Confira o filtro escolhido antes de enviar.', 'warning');
                return;
            }
            const item = {
                id: `msg_${Date.now()}`,
                title,
                message,
                target,
                targetValue,
                targetLabel: label,
                expire: '',
                readBy: {},
                createdAtLocal: new Date().toISOString(),
                createdBy: getCurrentUserData()?.uid || null,
                createdByName: getCurrentUserData()?.name || 'Instrutor Medeiros'
            };
            const db = window.__fbDB || window.fbDB;
            try {
                if (db && window.firebase) {
                    for (let i = 0; i < recipients.length; i += 450) {
                        const batch = db.batch();
                        recipients.slice(i, i + 450).forEach(user => {
                            batch.update(db.collection('users').doc(user.uid), {
                                inboxMessages: firebase.firestore.FieldValue.arrayUnion(item),
                                lastInstructorMessageAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        });
                        await batch.commit();
                    }
                    try {
                        await db.collection('announcements').add({
                            ...item,
                            recipientCount: recipients.length,
                            recipientUids: recipients.map(user => user.uid).slice(0, 450),
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (historyError) {
                        console.warn('Mensagem entregue, mas histórico geral não foi salvo:', historyError);
                    }
                } else {
                    const local = JSON.parse(localStorage.getItem('tool_announcements_v1') || '[]');
                    local.unshift(item);
                    localStorage.setItem('tool_announcements_v1', JSON.stringify(local));
                }
                document.getElementById('instructor-ann-title').value = '';
                document.getElementById('instructor-ann-message').value = '';
                document.getElementById('instructor-ann-target-value').value = '';
                window.updateInstructorAnnouncementTarget?.();
                window.ToolsApp?.refreshAnnouncements?.();
                showAppToast('Mensagem enviada', `${recipients.length} aluno${recipients.length === 1 ? '' : 's'} recebeu${recipients.length === 1 ? '' : 'ram'} no app.`, 'success');
            } catch (error) {
                console.error(error);
                showAppToast('Erro ao enviar', 'Não consegui entregar a mensagem agora. Confira suas permissões e tente novamente.', 'error');
            }
        };

        return {
            updateInstructorAnnouncementTarget: window.updateInstructorAnnouncementTarget,
            previewInstructorAnnouncementAudience: window.previewInstructorAnnouncementAudience,
            publishInstructorAnnouncement: window.publishInstructorAnnouncement
        };
    };
})(window);
