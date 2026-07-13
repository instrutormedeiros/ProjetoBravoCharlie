(function(window) {
    'use strict';

    window.PBC_CREATE_INSTRUCTOR_PANEL = function(deps = {}) {
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const showAppToast = deps.showAppToast || (() => {});
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const toDateFromFirestore = deps.toDateFromFirestore || (value => value ? new Date(value) : null);
        const openCommandPanel = deps.openCommandPanel || (() => {});
        const closeCommandPanel = deps.closeCommandPanel || (() => {});
        const renderAcademicImportHistory = deps.renderAcademicImportHistory || (() => {});
        const loadInstructorUsersForMessages = deps.loadInstructorUsersForMessages || (async () => []);
        const clearInstructorUsersCache = deps.clearInstructorUsersCache || (() => {});
        const populateInstructorCertificateCompanies = deps.populateInstructorCertificateCompanies || (() => {});
        const populateInstructorCertificateStudents = deps.populateInstructorCertificateStudents || (() => {});
        const populateManualGradeCompanies = deps.populateManualGradeCompanies || (() => {});
        const populateManualGradeStudents = deps.populateManualGradeStudents || (() => {});
        const setupInstructorCouponDefaults = deps.setupInstructorCouponDefaults || (() => {});
        const refreshInstructorCoupons = deps.refreshInstructorCoupons || (() => {});

        let instructorTimerInterval = null;
        let instructorTimerTotal = 600;
        let instructorTimerLeft = 600;
        let instructorClockInterval = null;

function formatInstructorTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(safe / 60).toString().padStart(2, '0');
    const sec = Math.floor(safe % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

function updateInstructorTimerUi() {
    const display = document.getElementById('instructor-timer-display');
    const bar = document.getElementById('instructor-timer-bar');
    if (display) display.textContent = formatInstructorTime(instructorTimerLeft);
    if (bar) {
        const percent = instructorTimerTotal ? Math.max(0, Math.min(100, (instructorTimerLeft / instructorTimerTotal) * 100)) : 0;
        bar.style.width = `${percent}%`;
    }
}

function renderInstructorAttendance() {
    const list = document.getElementById('instructor-attendance-list');
    if (!list) return;
    const names = JSON.parse(localStorage.getItem('instructor_attendance_v1') || '[]');
    list.innerHTML = names.length
        ? names.map((name, index) => `<span>${escapeHtml(name)} <button onclick="removeInstructorAttendance(${index})" title="Remover"><i class="fas fa-times"></i></button></span>`).join('')
        : '<p>Nenhum aluno registrado ainda.</p>';
}

function updateInstructorClock() {
    const clock = document.getElementById('instructor-clock-time');
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

window.openInstructorPanel = function() {
    if (!isInstructorAdmin()) {
        showAppToast('Acesso restrito', 'Este painel é apenas para administrador.', 'warning');
        return;
    }
    const modal = document.getElementById('instructor-modal');
    const overlay = document.getElementById('admin-modal-overlay');
    if (!modal || !overlay) return;
    setupInstructorCouponDefaults();
    openCommandPanel(modal, overlay);
    updateInstructorTimerUi();
    renderInstructorAttendance();
    updateInstructorClock();
    refreshInstructorCoupons();
    window.loadInstructorVoicePanel?.();
    renderAcademicImportHistory();
    clearInstructorUsersCache();
    window.previewInstructorAnnouncementAudience?.();
    loadInstructorUsersForMessages()
        .then(() => {
            window.updateInstructorAnnouncementTarget?.();
            populateInstructorCertificateCompanies();
            populateInstructorCertificateStudents();
            populateManualGradeCompanies();
            populateManualGradeStudents();
        })
        .catch(error => {
            console.warn('Não foi possível carregar alunos para mensagens:', error);
            const preview = document.getElementById('instructor-ann-preview');
            if (preview) preview.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Não foi possível carregar os alunos agora.';
        });
    clearInterval(instructorClockInterval);
    instructorClockInterval = setInterval(updateInstructorClock, 15000);
};

window.closeInstructorPanel = function() {
    const modal = document.getElementById('instructor-modal');
    const overlay = document.getElementById('admin-modal-overlay');
    closeCommandPanel(modal, overlay);
    clearInterval(instructorClockInterval);
};

window.startInstructorTimer = function() {
    const input = document.getElementById('instructor-timer-min');
    if (!instructorTimerLeft || instructorTimerLeft === instructorTimerTotal) {
        const minutes = Math.max(1, Math.min(180, Number(input?.value) || 10));
        instructorTimerTotal = minutes * 60;
        instructorTimerLeft = instructorTimerTotal;
    }
    clearInterval(instructorTimerInterval);
    instructorTimerInterval = setInterval(() => {
        instructorTimerLeft = Math.max(0, instructorTimerLeft - 1);
        updateInstructorTimerUi();
        if (instructorTimerLeft <= 0) {
            clearInterval(instructorTimerInterval);
            showAppToast('Tempo encerrado', 'O timer do instrutor chegou ao fim.', 'warning');
        }
    }, 1000);
    updateInstructorTimerUi();
};

window.pauseInstructorTimer = function() {
    clearInterval(instructorTimerInterval);
};

window.resetInstructorTimer = function() {
    clearInterval(instructorTimerInterval);
    const input = document.getElementById('instructor-timer-min');
    const minutes = Math.max(1, Math.min(180, Number(input?.value) || 10));
    instructorTimerTotal = minutes * 60;
    instructorTimerLeft = instructorTimerTotal;
    updateInstructorTimerUi();
};

window.sortInstructorStudent = function() {
    const raw = document.getElementById('instructor-student-list')?.value || '';
    const names = raw.split('\n').map(n => n.trim()).filter(Boolean);
    const result = document.getElementById('instructor-student-result');
    if (!names.length) {
        if (result) result.textContent = 'Cole pelo menos um nome para sortear.';
        return;
    }
    const picked = names[Math.floor(Math.random() * names.length)];
    if (result) result.innerHTML = `<strong>${escapeHtml(picked)}</strong><small>Aluno sorteado para participar.</small>`;
};

window.addInstructorAttendance = function() {
    const input = document.getElementById('instructor-attendance-name');
    const value = input?.value.trim();
    if (!value) return;
    const names = JSON.parse(localStorage.getItem('instructor_attendance_v1') || '[]');
    names.push(value);
    localStorage.setItem('instructor_attendance_v1', JSON.stringify(names));
    input.value = '';
    renderInstructorAttendance();
};

window.removeInstructorAttendance = function(index) {
    const names = JSON.parse(localStorage.getItem('instructor_attendance_v1') || '[]');
    names.splice(index, 1);
    localStorage.setItem('instructor_attendance_v1', JSON.stringify(names));
    renderInstructorAttendance();
};

window.copyInstructorAttendance = async function() {
    const names = JSON.parse(localStorage.getItem('instructor_attendance_v1') || '[]');
    const text = `Chamada - ${new Date().toLocaleDateString('pt-BR')}\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
    try {
        await navigator.clipboard.writeText(text);
        showAppToast('Chamada copiada', 'A lista foi copiada para a área de transferência.', 'success');
    } catch (e) {
        showAppToast('Não foi possível copiar', 'Selecione e copie manualmente se necessário.', 'warning');
    }
};

window.saveInstructorPlan = function() {
    const value = document.getElementById('instructor-class-plan')?.value || '';
    localStorage.setItem('instructor_class_plan_v1', value);
    showAppToast('Roteiro salvo', 'Este roteiro ficou salvo neste dispositivo.', 'success');
};

window.copyInstructorPlan = async function() {
    const value = document.getElementById('instructor-class-plan')?.value || '';
    try {
        await navigator.clipboard.writeText(value);
        showAppToast('Roteiro copiado', 'O plano da aula foi copiado.', 'success');
    } catch (e) {
        showAppToast('Não foi possível copiar', 'Tente copiar manualmente.', 'warning');
    }
};

window.generateInstructorQuestion = function() {
    const questions = [
        'Qual foi o ponto mais importante da aula até agora?',
        'Que atitude profissional você tomaria nesse cenário?',
        'Qual erro operacional precisamos evitar nessa situação?',
        'Explique esse conceito como se estivesse orientando um colega novo.',
        'Qual procedimento vem primeiro e por quê?',
        'O que você registraria no relatório depois dessa ocorrência?'
    ];
    const box = document.getElementById('instructor-question-result');
    if (box) box.innerHTML = `<strong>${questions[Math.floor(Math.random() * questions.length)]}</strong><small>Use como pergunta rápida para a turma.</small>`;
};

    };
})(window);
