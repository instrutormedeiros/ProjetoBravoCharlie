(function(window) {
    'use strict';

    window.PBC_CREATE_FEEDBACK_MANAGER = function(deps = {}) {
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const showAppToast = deps.showAppToast || (() => {});
        const getCurrentUserData = deps.getCurrentUserData || (() => null);

        function getNpsClass(score) {
            if (score >= 9) return 'Promotor';
            if (score >= 7) return 'Neutro';
            return 'Detrator';
        }

        function getNpsLocalKey() {
            const userData = getCurrentUserData();
            const uid = userData?.uid || userData?.email || 'anonimo';
            return `pbc_nps_feedback_v1_${uid}`;
        }

        function getStudentNpsRecord() {
            try {
                const raw = localStorage.getItem(getNpsLocalKey());
                return raw ? JSON.parse(raw) : null;
            } catch (_) {
                return null;
            }
        }

        function getStudentNpsHtml() {
            const record = getStudentNpsRecord();
            const score = record?.score ?? null;
            const submittedAt = record?.submittedAt ? new Date(record.submittedAt) : null;
            const submittedLabel = submittedAt && !Number.isNaN(submittedAt.getTime())
                ? submittedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : 'agora';
            return `
                <article class="student-nps-card ${score !== null ? 'submitted' : ''}" id="student-nps-card">
                    <div class="student-nps-head">
                        <span><i class="fas ${score !== null ? 'fa-circle-check' : 'fa-comment-dots'}"></i> Voz do aluno</span>
                        <strong>${score !== null ? 'Feedback enviado com sucesso' : 'Sua opinião melhora a plataforma'}</strong>
                        <p>${score !== null ? `Sua nota ${score}/10 foi registrada em ${submittedLabel}. Você pode atualizar quando quiser.` : 'De 0 a 10, quanto você indicaria a Bravo Charlie para outro aluno?'}</p>
                    </div>
                    ${score !== null ? `
                        <div class="student-nps-success">
                            <i class="fas fa-check"></i>
                            <div>
                                <strong>Obrigado por ajudar a melhorar a plataforma.</strong>
                                <span>Sua resposta alimenta a Voz do Aluno no painel do instrutor.</span>
                            </div>
                        </div>
                    ` : ''}
                    <div class="student-nps-scale" role="group" aria-label="Nota de indicação">
                        ${Array.from({ length: 11 }, (_, index) => `
                            <button type="button" class="${score === index ? 'active' : ''}" onclick="submitStudentNps(${index})">${index}</button>
                        `).join('')}
                    </div>
                    <div class="student-nps-comment">
                        <textarea id="student-nps-comment" maxlength="500" placeholder="Opcional: o que você mais gostou ou o que podemos melhorar?">${escapeHtml(record?.comment || '')}</textarea>
                        <button type="button" onclick="submitStudentNps(${score !== null ? score : 10})">
                            <i class="fas fa-paper-plane"></i> Enviar feedback
                        </button>
                    </div>
                </article>
            `;
        }

        async function submitStudentNps(score) {
            const numericScore = Number(score);
            if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10) {
                showAppToast('Nota inválida', 'Escolha uma nota de 0 a 10.', 'warning');
                return;
            }

            const userData = getCurrentUserData();
            const comment = document.getElementById('student-nps-comment')?.value?.trim() || '';
            const payload = {
                uid: userData?.uid || '',
                name: userData?.name || 'Aluno',
                email: userData?.email || '',
                company: userData?.company || '',
                courseType: userData?.courseType || 'BC',
                score: numericScore,
                comment,
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            localStorage.setItem(getNpsLocalKey(), JSON.stringify(payload));

            const db = window.__fbDB || window.fbDB;
            if (db && userData?.uid) {
                try {
                    await db.collection('platformFeedback').doc(userData.uid).set(payload, { merge: true });
                } catch (error) {
                    console.warn('NPS salvo apenas localmente:', error);
                    showAppToast('Feedback salvo neste dispositivo', 'Não consegui sincronizar agora, mas sua nota ficou registrada localmente.', 'warning');
                }
            }

            const card = document.getElementById('student-nps-card');
            if (card) card.outerHTML = getStudentNpsHtml();
            showAppToast('Feedback recebido', 'Obrigado por ajudar a melhorar a Bravo Charlie.', 'success');
        }

        async function loadInstructorVoicePanel() {
            const panel = document.getElementById('instructor-voice-content');
            if (!panel) return;
            const db = window.__fbDB || window.fbDB;
            if (!db) {
                panel.innerHTML = '<div class="admin-voice-empty">Banco de dados indisponível agora.</div>';
                return;
            }
            panel.innerHTML = '<div class="admin-voice-empty"><i class="fas fa-spinner fa-spin"></i> Carregando feedbacks...</div>';
            try {
                const snapshot = await db.collection('platformFeedback').get();
                const feedbacks = [];
                snapshot.forEach(doc => feedbacks.push({ id: doc.id, ...(doc.data() || {}) }));
                feedbacks.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
                if (!feedbacks.length) {
                    panel.innerHTML = '<div class="admin-voice-empty">Ainda não há respostas. O card já aparece para os alunos na tela inicial.</div>';
                    return;
                }
                const total = feedbacks.length;
                const average = feedbacks.reduce((sum, item) => sum + Number(item.score || 0), 0) / total;
                const promoters = feedbacks.filter(item => Number(item.score) >= 9).length;
                const neutrals = feedbacks.filter(item => Number(item.score) >= 7 && Number(item.score) <= 8).length;
                const detractors = feedbacks.filter(item => Number(item.score) <= 6).length;
                const comments = feedbacks.filter(item => String(item.comment || '').trim()).slice(0, 5);
                panel.innerHTML = `
                    <div class="admin-voice-metrics">
                        <article><span>NPS médio</span><strong>${average.toFixed(1)}</strong><small>${total} resposta${total === 1 ? '' : 's'}</small></article>
                        <article class="good"><span>Promotores</span><strong>${promoters}</strong><small>Notas 9 e 10</small></article>
                        <article class="neutral"><span>Neutros</span><strong>${neutrals}</strong><small>Notas 7 e 8</small></article>
                        <article class="risk"><span>Detratores</span><strong>${detractors}</strong><small>Notas 0 a 6</small></article>
                    </div>
                    <div class="admin-voice-comments">
                        <span><i class="fas fa-message"></i> Comentários recentes</span>
                        ${comments.length ? comments.map(item => `
                            <article>
                                <strong>${escapeHtml(item.name || item.email || 'Aluno')}</strong>
                                <em>${Number(item.score || 0)}/10 · ${getNpsClass(Number(item.score || 0))}</em>
                                <p>${escapeHtml(item.comment || '')}</p>
                            </article>
                        `).join('') : '<p>Nenhum comentário escrito ainda.</p>'}
                    </div>
                `;
            } catch (error) {
                console.warn('Erro ao carregar Voz do Aluno:', error);
                panel.innerHTML = '<div class="admin-voice-empty">Não consegui ler os feedbacks agora. Confira as permissões do Firestore para a coleção platformFeedback.</div>';
            }
        }

        window.submitStudentNps = submitStudentNps;
        window.loadInstructorVoicePanel = loadInstructorVoicePanel;

        return {
            getStudentNpsHtml,
            submitStudentNps,
            loadInstructorVoicePanel,
            getNpsClass
        };
    };
})(window);
