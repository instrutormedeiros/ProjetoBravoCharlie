(function(window) {
    'use strict';

    window.PBC_CREATE_MANUAL_GRADES_MANAGER = function(deps = {}) {
        const getInstructorMessageUsers = deps.getInstructorMessageUsers || (() => []);
        const normalizeAcademicCompany = deps.normalizeAcademicCompany || (value => String(value || '').trim().toUpperCase());
        const normalizeAcademicName = deps.normalizeAcademicName || (value => String(value || '').trim().toUpperCase());
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase());
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const showAppToast = deps.showAppToast || (() => {});
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const calculateAcademicAverage = deps.calculateAcademicAverage || (() => '');
        const hasAcademicValue = (...args) => deps.hasAcademicValue?.(...args);
        const deriveAcademicSituation = (...args) => deps.deriveAcademicSituation?.(...args);
        const mergeAcademicRecord = (...args) => deps.mergeAcademicRecord?.(...args);
        const persistAcademicImportHistory = (...args) => deps.persistAcademicImportHistory?.(...args);
        const getCurrentUserData = deps.getCurrentUserData || (() => null);

        const MANUAL_GRADE_INPUTS = {
            rh: 'manual-grade-rh',
            legislacao: 'manual-grade-legislacao',
            salvamento: 'manual-grade-salvamento',
            pci: 'manual-grade-pci',
            aph: 'manual-grade-aph'
        };
        
        function getManualGradeUsers() {
            const company = normalizeAcademicCompany(document.getElementById('manual-grade-company')?.value || '');
            return getInstructorMessageUsers()
                .filter(user => !company || normalizeAcademicCompany(user.company || 'Particular') === company)
                .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
        }
        
        function getManualGradeStudentOption(user) {
            return [
                user?.name || 'Sem nome',
                user?.cpf ? `CPF ${user.cpf}` : '',
                user?.email || '',
                user?.company || ''
            ].filter(Boolean).join(' | ');
        }
        
        function populateManualGradeCompanies() {
            const select = document.getElementById('manual-grade-company');
            if (!select) return;
            const selected = normalizeAcademicCompany(select.value);
            const companies = new Map();
            getInstructorMessageUsers().forEach(user => {
                const raw = String(user.company || 'Particular').trim() || 'Particular';
                const key = normalizeAcademicCompany(raw);
                if (!companies.has(key)) companies.set(key, raw.toUpperCase());
            });
            select.innerHTML = '<option value="">Todas as turmas</option>' + [...companies.values()]
                .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .map(company => `<option value="${escapeHtml(company)}">${escapeHtml(company)}</option>`)
                .join('');
            const option = [...select.options].find(item => normalizeAcademicCompany(item.value) === selected);
            if (option) select.value = option.value;
        }
        
        function clearManualGradeFields() {
            Object.values(MANUAL_GRADE_INPUTS).forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });
            updateManualAcademicSummary();
        }
        
        function populateManualGradeStudents(clearSelection = false) {
            const datalist = document.getElementById('manual-grade-students');
            if (!datalist) return;
            const users = getManualGradeUsers();
            datalist.innerHTML = users.map(user => `<option value="${escapeHtml(getManualGradeStudentOption(user))}"></option>`).join('');
            if (clearSelection) {
                const input = document.getElementById('manual-grade-student');
                if (input) input.value = '';
                clearManualGradeFields();
            }
            const result = document.getElementById('manual-grade-result');
            if (result && clearSelection) {
                result.className = 'manual-grade-result';
                result.innerHTML = `<i class="fas fa-users"></i> ${users.length} aluno${users.length === 1 ? '' : 's'} encontrado${users.length === 1 ? '' : 's'} nesta turma.`;
            }
        }
        window.populateManualGradeStudents = populateManualGradeStudents;
        
        function findManualGradeStudent(rawValue = document.getElementById('manual-grade-student')?.value) {
            const value = String(rawValue || '').trim();
            if (!value) return null;
            const text = normalizeSearchText(value);
            const digits = onlyDigits(value);
            return getManualGradeUsers().find(user => {
                const option = normalizeSearchText(getManualGradeStudentOption(user));
                const identityDigits = onlyDigits(`${user.cpf || ''} ${user.phone || ''}`);
                const normalizedName = normalizeAcademicName(user.name || '');
                return user.uid === value
                    || option === text
                    || (digits && identityDigits.includes(digits))
                    || (normalizedName && text.includes(normalizedName));
            }) || null;
        }
        
        function getManualGradeSubjects() {
            return Object.entries(MANUAL_GRADE_INPUTS).reduce((subjects, [subjectId, inputId]) => {
                const value = document.getElementById(inputId)?.value;
                subjects[subjectId] = String(value ?? '').trim();
                return subjects;
            }, {});
        }
        
        window.updateManualAcademicSummary = function() {
            const summary = document.getElementById('manual-grade-summary');
            if (!summary) return;
            const subjects = getManualGradeSubjects();
            const average = calculateAcademicAverage(subjects);
            const filled = Object.values(subjects).filter(hasAcademicValue).length;
            const situation = average ? deriveAcademicSituation(average) : `${filled}/5 notas`;
            summary.innerHTML = `<span>Média final</span><strong>${escapeHtml(average || 'Em análise')}</strong><em>${escapeHtml(situation)}</em>`;
            summary.classList.toggle('recovery', Boolean(average) && deriveAcademicSituation(average) === 'Recuperação');
        };
        
        window.loadManualStudentGrades = function() {
            const student = findManualGradeStudent();
            const result = document.getElementById('manual-grade-result');
            if (!student) {
                clearManualGradeFields();
                if (result) {
                    result.className = 'manual-grade-result warning';
                    result.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Selecione um aluno válido da lista.';
                }
                return;
            }
            const subjects = student.academicRecord?.subjects || {};
            Object.entries(MANUAL_GRADE_INPUTS).forEach(([subjectId, inputId]) => {
                const input = document.getElementById(inputId);
                if (input) input.value = subjects[subjectId] ?? '';
            });
            window.updateManualAcademicSummary();
            if (result) {
                result.className = 'manual-grade-result success';
                result.innerHTML = `<i class="fas fa-user-check"></i> Lançamento aberto para <strong>${escapeHtml(student.name || 'aluno')}</strong>.`;
            }
        };
        
        window.saveManualStudentGrades = async function() {
            if (!isInstructorAdmin(getCurrentUserData())) {
                showAppToast('Acesso restrito', 'Apenas o administrador pode lançar notas.', 'warning');
                return;
            }
            const student = findManualGradeStudent();
            if (!student) {
                showAppToast('Aluno não encontrado', 'Selecione um aluno válido antes de salvar.', 'warning');
                return;
            }
            const subjects = getManualGradeSubjects();
            const filledEntries = Object.entries(subjects).filter(([, value]) => hasAcademicValue(value));
            if (!filledEntries.length) {
                showAppToast('Informe uma nota', 'Preencha pelo menos uma matéria para atualizar.', 'warning');
                return;
            }
            const invalid = filledEntries.find(([, value]) => {
                const numeric = Number(String(value).replace(',', '.'));
                return !Number.isFinite(numeric) || numeric < 0 || numeric > 10;
            });
            if (invalid) {
                showAppToast('Nota inválida', 'Todas as notas devem estar entre 0 e 10.', 'warning');
                return;
            }
            const normalizedSubjects = Object.fromEntries(Object.entries(subjects).map(([key, value]) => {
                if (!hasAcademicValue(value)) return [key, ''];
                return [key, Number(String(value).replace(',', '.')).toLocaleString('pt-BR', { maximumFractionDigits: 1 })];
            }));
            const existing = student.academicRecord || {};
            const incoming = {
                name: student.name || '',
                cpf: student.cpf || '',
                phone: student.phone || '',
                email: student.email || '',
                company: student.company || '',
                subjects: normalizedSubjects,
                average: '',
                situation: '',
                source: 'Lançamento manual',
                sourceFile: 'Painel do Instrutor'
            };
            const payload = {
                ...mergeAcademicRecord(existing, incoming),
                matchedBy: 'Aluno selecionado pelo administrador',
                importedAt: new Date().toISOString()
            };
            const db = window.__fbDB || window.fbDB;
            if (!db) {
                showAppToast('Banco indisponível', 'Não consegui acessar os dados agora.', 'error');
                return;
            }
            const button = document.getElementById('manual-grade-save-btn');
            const previousHtml = button?.innerHTML;
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando notas...';
            }
            try {
                const importId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                await db.collection('users').doc(student.uid).update({
                    academicRecord: payload,
                    academicRecordPrevious: Object.keys(existing).length ? existing : null,
                    academicRecordPreviousImportId: student.academicRecordImportId || '',
                    academicRecordImportId: importId,
                    academicRecordUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                student.academicRecord = payload;
                student.academicRecordImportId = importId;
                await persistAcademicImportHistory({
                    id: importId,
                    createdAt: new Date().toISOString(),
                    source: 'Lançamento manual',
                    files: [`Nota manual: ${student.name || 'Aluno'}`],
                    companies: [student.company || 'Sem turma'],
                    detected: 1,
                    updated: 1,
                    unmatched: 0,
                    matchedBy: { 'Seleção manual': 1 },
                    undone: false
                });
                window.loadManualStudentGrades();
                const result = document.getElementById('manual-grade-result');
                if (result) {
                    result.className = 'manual-grade-result success';
                    result.innerHTML = `<i class="fas fa-circle-check"></i> Notas de <strong>${escapeHtml(student.name || 'aluno')}</strong> salvas. Média: <strong>${escapeHtml(payload.average || 'aguardando 5 notas')}</strong> • ${escapeHtml(payload.situation)}.`;
                }
                showAppToast('Notas salvas', `O perfil de ${student.name || 'aluno'} foi atualizado.`, 'success');
            } catch (error) {
                console.error(error);
                const result = document.getElementById('manual-grade-result');
                if (result) {
                    result.className = 'manual-grade-result error';
                    result.innerHTML = '<i class="fas fa-circle-xmark"></i> Não consegui salvar. Confira sua conexão e tente novamente.';
                }
                showAppToast('Erro ao salvar notas', 'Não foi possível atualizar o aluno agora.', 'error');
            } finally {
                if (button) {
                    button.disabled = false;
                    button.innerHTML = previousHtml;
                }
            }
        };
        

        return {
            populateManualGradeCompanies,
            populateManualGradeStudents,
            updateManualAcademicSummary: window.updateManualAcademicSummary,
            loadManualStudentGrades: window.loadManualStudentGrades,
            saveManualStudentGrades: window.saveManualStudentGrades
        };
    };
})(window);
