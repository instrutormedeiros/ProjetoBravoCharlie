(function(window) {
    'use strict';

    window.PBC_CREATE_STUDENT_PROFILE_RENDERERS = function(deps = {}) {
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase());
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const ACADEMIC_GRADE_SUBJECTS = deps.ACADEMIC_GRADE_SUBJECTS || [];
        const calculateAcademicAverage = deps.calculateAcademicAverage || (() => '');
        const hasAcademicValue = (...args) => deps.hasAcademicValue?.(...args);
        const deriveAcademicSituation = (...args) => deps.deriveAcademicSituation?.(...args);

        function academicGradeTone(value, situation = '') {
            if (!hasAcademicValue(value)) return 'pending';
            const normalizedSituation = normalizeSearchText(situation);
            const numericText = String(value || '').replace(',', '.').replace(/[^\d.]/g, '');
            const numeric = numericText ? Number(numericText) : Number.NaN;
            if (normalizedSituation.includes('recuper') || normalizedSituation.includes('reprov') || (!Number.isNaN(numeric) && numeric < 7)) return 'progress';
            if (normalizedSituation.includes('aprov') || (!Number.isNaN(numeric) && numeric >= 7)) return 'done';
            return value ? 'done' : 'pending';
        }

        function renderStudentAcademicHtml(record) {
            if (!record) {
                const emptyRows = ACADEMIC_GRADE_SUBJECTS.map(subject => `
                    <article class="academic-status-row pending">
                        <div class="academic-status-icon"><i class="${subject.icon}"></i></div>
                        <div class="academic-status-main">
                            <strong>${escapeHtml(subject.title)}</strong>
                            <span>Nota será exibida aqui após o lançamento oficial.</span>
                        </div>
                        <div class="academic-status-meta"><span>Nota</span><strong>Em breve</strong></div>
                        <div class="academic-status-meta"><span>Situação</span><strong>Aguardando</strong></div>
                        <div class="academic-status-pill">Pendente</div>
                    </article>
                `).join('');
                return `
                    <div class="academic-status-empty">
                        <strong><i class="fas fa-hourglass-half"></i> Aguardando lançamento das notas.</strong>
                        <span>Assim que o administrador importar a planilha, sua situação acadêmica aparecerá aqui com segurança.</span>
                    </div>
                    ${emptyRows}
                `;
            }

            const averageDisplay = record.average || calculateAcademicAverage(record.subjects) || 'Em breve';
            const finalSituation = deriveAcademicSituation(averageDisplay, record.situation || 'Em análise');
            const subjectRows = ACADEMIC_GRADE_SUBJECTS.map(subject => {
                const rawNote = record.subjects?.[subject.id];
                const note = hasAcademicValue(rawNote) ? rawNote : 'Em breve';
                const subjectSituation = note && note !== 'Em breve' ? deriveAcademicSituation(note, 'Em análise') : 'Aguardando';
                const tone = academicGradeTone(note, subjectSituation);
                const status = note && note !== 'Em breve' ? 'Lançada' : 'Pendente';
                return `
                    <article class="academic-status-row ${tone}">
                        <div class="academic-status-icon"><i class="${subject.icon}"></i></div>
                        <div class="academic-status-main">
                            <strong>${escapeHtml(subject.title)}</strong>
                            <span>Nota vinculada ao CPF cadastrado neste perfil.</span>
                        </div>
                        <div class="academic-status-meta"><span>Nota</span><strong>${escapeHtml(note)}</strong></div>
                        <div class="academic-status-meta"><span>Situação</span><strong>${escapeHtml(subjectSituation)}</strong></div>
                        <div class="academic-status-pill">${escapeHtml(status)}</div>
                    </article>
                `;
            }).join('');

            const academicFields = [
                ['Nome', record.name],
                ['Telefone', record.phone],
                ['CPF', record.cpf],
                ['RG', record.rg],
                ['E-mail', record.email],
                ['Nome da mãe', record.motherName],
                ['Nome do pai', record.fatherName]
            ].map(([label, value]) => `
                <article>
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value || 'Não informado')}</strong>
                </article>
            `).join('');

            return `
                <div class="academic-summary-strip">
                    <article><span>Média final</span><strong>${escapeHtml(averageDisplay)}</strong></article>
                    <article><span>Situação</span><strong>${escapeHtml(finalSituation)}</strong></article>
                </div>
                <div class="academic-family-grid">${academicFields}</div>
                ${subjectRows}
            `;
        }

        return {
            academicGradeTone,
            renderStudentAcademicHtml
        };
    };
})(window);
