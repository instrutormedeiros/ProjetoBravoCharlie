(function(window) {
    'use strict';

    window.PBC_CREATE_ACADEMIC_IMPORT_MANAGER = function(deps = {}) {
        const ACADEMIC_GRADE_SUBJECTS = deps.ACADEMIC_GRADE_SUBJECTS || [];
        const calculateAcademicAverage = deps.calculateAcademicAverage || (() => '');
        const normalizeAcademicCompany = deps.normalizeAcademicCompany || (value => String(value || '').trim().toUpperCase());
        const normalizeAcademicName = deps.normalizeAcademicName || (value => String(value || '').trim().toUpperCase());
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase());
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const showAppToast = deps.showAppToast || (() => {});
        const setAcademicImportReport = deps.setAcademicImportReport || (() => {});
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const findMatchingUserForAcademicRecord = deps.findMatchingUserForAcademicRecord || (() => null);
        const fetchAcademicRecordsFromSheet = deps.fetchAcademicRecordsFromSheet || (async () => []);
        const readAcademicRecordsFromFile = deps.readAcademicRecordsFromFile || (async () => []);
        const inferAcademicCompanyFromFileName = deps.inferAcademicCompanyFromFileName || (() => '');
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const getCurrentUser = deps.getCurrentUser || (() => window.currentUser || null);
        const refreshInstructorUsers = deps.refreshInstructorUsers || (async () => {});
        const refreshCertificateFilters = deps.refreshCertificateFilters || (() => {});
        const refreshManualGradeFilters = deps.refreshManualGradeFilters || (() => {});

        const ACADEMIC_IMPORT_HISTORY_KEY = 'pbc_academic_import_history_v2';
        const ACADEMIC_IMPORT_HISTORY_LIMIT = 30;
        let pendingAcademicImport = null;
        
        function getUnresolvedAcademicAmbiguities(preview = pendingAcademicImport) {
            return (preview?.ambiguousMatches || []).filter(item => !item.resolvedUid && !item.keepUnchanged);
        }
        
        function getAcademicAmbiguityStats(preview = pendingAcademicImport) {
            const items = preview?.ambiguousMatches || [];
            const resolved = items.filter(item => item.resolvedUid).length;
            const kept = items.filter(item => item.keepUnchanged || (!item.resolvedUid && item.keepUnchanged !== false)).length;
            const pending = items.length - resolved - kept;
            return { total: items.length, resolved, kept, pending };
        }
        
        function hasAcademicValue(value) {
            return String(value ?? '').trim() !== '';
        }
        
        function getAcademicIdentityKey(record = {}) {
            const company = normalizeAcademicCompany(record.company);
            const cpf = onlyDigits(record.cpf);
            const email = normalizeSearchText(record.email);
            const phone = onlyDigits(record.phone).slice(-9);
            const name = normalizeAcademicName(record.name);
            if (cpf) return `${company}|cpf:${cpf}`;
            if (email) return `${company}|email:${email}`;
            if (phone) return `${company}|phone:${phone}`;
            return `${company}|name:${name}`;
        }
        
        function deriveAcademicSituation(average, fallback = 'Em análise') {
            const numericText = String(average ?? '').replace(',', '.').replace(/[^\d.]/g, '');
            const numeric = numericText ? Number(numericText) : Number.NaN;
            if (!Number.isFinite(numeric) || !hasAcademicValue(average)) return fallback || 'Em análise';
            return numeric >= 7 ? 'Aprovado' : 'Recuperação';
        }
        
        function mergeAcademicRecord(existing = {}, incoming = {}) {
            const existingSubjects = existing.subjects || {};
            const incomingSubjects = incoming.subjects || {};
            const subjects = {};
            ACADEMIC_GRADE_SUBJECTS.forEach(subject => {
                subjects[subject.id] = hasAcademicValue(incomingSubjects[subject.id])
                    ? incomingSubjects[subject.id]
                    : (existingSubjects[subject.id] ?? '');
            });
        
            const choose = key => hasAcademicValue(incoming[key]) ? incoming[key] : (existing[key] ?? '');
            const calculatedAverage = calculateAcademicAverage(subjects);
            const average = hasAcademicValue(incoming.average)
                ? incoming.average
                : (calculatedAverage || existing.average || '');
            const situation = hasAcademicValue(average)
                ? deriveAcademicSituation(average, incoming.situation || existing.situation || 'Em análise')
                : (incoming.situation || existing.situation || 'Em análise');
        
            return {
                ...existing,
                name: choose('name'),
                phone: choose('phone'),
                cpf: choose('cpf'),
                rg: choose('rg'),
                email: choose('email'),
                motherName: choose('motherName'),
                fatherName: choose('fatherName'),
                company: choose('company'),
                subjects,
                average,
                situation,
                source: incoming.source || existing.source || 'Planilha oficial de notas',
                sourceFile: incoming.sourceFile || existing.sourceFile || ''
            };
        }
        
        function getLocalAcademicImportHistory() {
            try {
                const history = JSON.parse(localStorage.getItem(ACADEMIC_IMPORT_HISTORY_KEY) || '[]');
                return Array.isArray(history) ? history : [];
            } catch (_) {
                return [];
            }
        }
        
        function setLocalAcademicImportHistory(history) {
            localStorage.setItem(ACADEMIC_IMPORT_HISTORY_KEY, JSON.stringify((history || []).slice(0, ACADEMIC_IMPORT_HISTORY_LIMIT)));
        }
        
        function getAcademicImportHistory() {
            const cloudHistory = Array.isArray(getCurrentUserData()?.academicImportHistory) ? getCurrentUserData().academicImportHistory : [];
            const localHistory = getLocalAcademicImportHistory();
            const byId = new Map();
            [...cloudHistory, ...localHistory].forEach(entry => {
                if (entry?.id && !byId.has(entry.id)) byId.set(entry.id, entry);
            });
            return Array.from(byId.values())
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, ACADEMIC_IMPORT_HISTORY_LIMIT);
        }
        
        async function persistAcademicImportHistory(entry) {
            const current = getAcademicImportHistory().filter(item => item.id !== entry.id);
            const updatedHistory = [entry, ...current].slice(0, ACADEMIC_IMPORT_HISTORY_LIMIT);
            setLocalAcademicImportHistory(updatedHistory);
            if (getCurrentUserData()) getCurrentUserData().academicImportHistory = updatedHistory;
        
            const db = window.__fbDB || window.fbDB;
            const adminUid = getCurrentUserData()?.uid || getCurrentUser()?.uid;
            if (db && adminUid) {
                try {
                    await db.collection('users').doc(adminUid).set({ academicImportHistory: updatedHistory }, { merge: true });
                } catch (error) {
                    console.warn('Histórico salvo somente neste dispositivo:', error);
                }
            }
            renderAcademicImportHistory();
        }
        
        function formatAcademicImportDate(value) {
            const date = new Date(value || '');
            return Number.isNaN(date.getTime()) ? 'Data não registrada' : date.toLocaleString('pt-BR');
        }
        
        function renderAcademicImportHistory() {
            const container = document.getElementById('academic-import-history');
            if (!container) return;
            const history = getAcademicImportHistory();
            if (!history.length) {
                container.innerHTML = '<div class="academic-history-empty"><i class="fas fa-clock-rotate-left"></i><span>Nenhuma importação registrada ainda.</span></div>';
                return;
            }
            container.innerHTML = history.slice(0, 8).map((entry, index) => `
                <article class="academic-history-item ${entry.undone ? 'undone' : ''}">
                    <div>
                        <strong>${escapeHtml(entry.files?.join(', ') || entry.source || 'Importação de notas')}</strong>
                        <span>${formatAcademicImportDate(entry.createdAt)} • ${escapeHtml((entry.companies || []).join(', ') || 'Turma não identificada')}</span>
                    </div>
                    <div class="academic-history-meta">
                        <em>${entry.undone ? 'Desfeita' : `${entry.updated || 0} atualizados`}</em>
                        ${index === 0 && !entry.undone ? `<button type="button" onclick="requestAcademicImportUndo('${escapeJsString(entry.id)}')"><i class="fas fa-rotate-left"></i> Desfazer</button>` : ''}
                    </div>
                </article>
            `).join('');
        }
        window.renderAcademicImportHistory = renderAcademicImportHistory;
        
        async function importAcademicRecords(records, sourceLabel = 'planilha', options = {}) {
            if (!isInstructorAdmin(getCurrentUserData())) {
                showAppToast('Acesso restrito', 'A importação de notas é apenas para o administrador.', 'warning');
                return;
            }
        
            const button = document.getElementById('academic-import-grades-btn') || document.getElementById('admin-import-grades-btn');
            const previousHtml = button?.innerHTML;
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
            }
            setAcademicImportReport('info', 'Importação em andamento', [
                `Origem: ${sourceLabel}`,
                `${records?.length || 0} registros detectados na planilha.`
            ]);
        
            const db = window.__fbDB || window.fbDB;
            if (!db) {
                showAppToast('Banco indisponível', 'Não consegui acessar o banco de dados agora.', 'error');
                if (button) {
                    button.disabled = false;
                    button.innerHTML = previousHtml;
                }
                return;
            }
        
            try {
                if (!Array.isArray(records) || !records.length) {
                    throw new Error('Nenhum aluno foi encontrado na planilha.');
                }
                const importId = options.importId || `academic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                let withAverage = 0;
                const snapshot = await db.collection('users').get();
                const users = [];
                snapshot.forEach(doc => users.push({ uid: doc.id, data: doc.data() || {} }));
        
                let updated = 0;
                let keptUnchanged = 0;
                const matchedByStats = {};
                const unmatched = [];
                const updatedUsers = [];
                let batch = db.batch();
                let batchCount = 0;
        
                for (const record of records) {
                    if (record._keepUnchanged) {
                        keptUnchanged++;
                        continue;
                    }
                    const manualMatch = record._resolvedUid
                        ? users.find(user => user.uid === record._resolvedUid)
                        : null;
                    const match = manualMatch
                        ? { ...manualMatch, matchedBy: 'Decisão manual' }
                        : findMatchingUserForAcademicRecord(record, users);
                    if (!match || match.ambiguous) {
                        unmatched.push(record.name || record.cpf || record.email || 'Sem identificação');
                        continue;
                    }
        
                    const existingRecord = match.data?.academicRecord || {};
                    const payload = {
                        ...mergeAcademicRecord(existingRecord, record),
                        source: sourceLabel,
                        matchedBy: record.company ? `${match.matchedBy} + Turma` : match.matchedBy,
                        importedAt: new Date().toISOString()
                    };
                    if (hasAcademicValue(payload.average)) withAverage++;
                    const matchLabel = record.company ? `${match.matchedBy} + Turma` : match.matchedBy;
                    matchedByStats[matchLabel] = (matchedByStats[matchLabel] || 0) + 1;
                    batch.update(db.collection('users').doc(match.uid), {
                        academicRecord: payload,
                        academicRecordPrevious: Object.keys(existingRecord).length ? existingRecord : null,
                        academicRecordPreviousImportId: match.data?.academicRecordImportId || '',
                        academicRecordImportId: importId,
                        academicRecordUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    updatedUsers.push({ uid: match.uid, name: match.data?.name || record.name || '', company: match.data?.company || record.company || '' });
                    updated++;
                    batchCount++;
        
                    if (batchCount >= 450) {
                        await batch.commit();
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
        
                if (batchCount > 0) await batch.commit();
        
                const statsText = Object.entries(matchedByStats)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' | ');
                const importEntry = {
                    id: importId,
                    createdAt: new Date().toISOString(),
                    source: sourceLabel,
                    files: Array.from(new Set(records.map(record => record.sourceFile).filter(Boolean))),
                    companies: Array.from(new Set(records.map(record => record.company).filter(Boolean))),
                    detected: records.length,
                    updated,
                    keptUnchanged,
                    unmatched: unmatched.length,
                    matchedBy: matchedByStats,
                    undone: false
                };
                await persistAcademicImportHistory(importEntry);
                showAppToast(
                    'Notas importadas',
                    `${updated}/${records.length} aluno${updated === 1 ? '' : 's'} atualizado${updated === 1 ? '' : 's'}.${statsText ? ` ${statsText}.` : ''}${keptUnchanged ? ` ${keptUnchanged} mantido${keptUnchanged === 1 ? '' : 's'} sem alteração.` : ''}${unmatched.length ? ` ${unmatched.length} sem vínculo.` : ''}`,
                    unmatched.length ? 'warning' : 'success'
                );
                setAcademicImportReport(unmatched.length ? 'warning' : 'success', 'Relatório da importação', [
                    `Arquivo/origem: ${sourceLabel}`,
                    `Alunos detectados na planilha: ${records.length}`,
                    `Cadastros atualizados: ${updated}`,
                    keptUnchanged ? `Mantidos sem alteração: ${keptUnchanged}` : '',
                    `Com média final: ${withAverage}`,
                    `Conferência usada: ${statsText || 'nenhuma correspondência'}`,
                    unmatched.length
                        ? `Sem vínculo: ${unmatched.slice(0, 12).join(', ')}${unmatched.length > 12 ? '...' : ''}`
                        : (keptUnchanged ? 'Os demais registros encontrados foram vinculados.' : 'Todos os registros encontrados foram vinculados.')
                ].filter(Boolean));
                if (unmatched.length) {
                    console.warn('Alunos da planilha sem vínculo no cadastro:', unmatched);
                    setTimeout(() => {
                        alert(`Notas importadas de: ${sourceLabel}\n\nAtualizados: ${updated}/${records.length} alunos.\n\nSem vínculo no cadastro:\n${unmatched.slice(0, 20).join('\n')}${unmatched.length > 20 ? '\n...' : ''}`);
                    }, 350);
                } else {
                    setTimeout(() => {
                        alert(`Notas importadas de: ${sourceLabel}\n\nSucesso: ${updated}/${records.length} alunos.${keptUnchanged ? `\nMantidos sem alteração: ${keptUnchanged}.` : ''}\n\nConferência usada:\n${statsText || 'CPF'}`);
                    }, 350);
                }
                await refreshInstructorUsers();
                refreshCertificateFilters();
                refreshManualGradeFilters();
                pendingAcademicImport = null;
                return { ...importEntry, updatedUsers, unmatchedNames: unmatched };
            } catch (error) {
                console.error(error);
                setAcademicImportReport('error', 'A importação não foi concluída', [
                    error?.message || 'Erro desconhecido.',
                    'Confira se escolheu o arquivo certo e tente novamente.'
                ]);
                setTimeout(() => {
                    alert(`A importação não foi concluída.\n\nMotivo: ${error?.message || 'erro desconhecido'}\n\nSe possível, selecione a planilha .xlsx ou .csv novamente.`);
                }, 200);
                showAppToast(
                    'Erro ao importar notas',
                    error?.message || 'Confira o arquivo da planilha e tente novamente.',
                    'error'
                );
            } finally {
                if (button) {
                    button.disabled = false;
                    button.innerHTML = previousHtml;
                }
            }
        }
        
        window.importAcademicGradesFromSheet = async function() {
            const records = await fetchAcademicRecordsFromSheet();
            await importAcademicRecords(records, 'Planilha oficial do Google Drive');
        };
        
        function renderAcademicImportPreview(preview) {
            const report = document.getElementById('academic-import-grades-report') || document.getElementById('admin-import-grades-report');
            if (!report) return;
            const ambiguityStats = getAcademicAmbiguityStats(preview);
            const effectiveMatched = preview.matched + ambiguityStats.resolved;
            const blocked = preview.missingCompany.length || preview.duplicates.length || preview.fileErrors.length || effectiveMatched === 0;
            report.className = `admin-import-grades-report academic-import-preview ${blocked ? 'warning' : 'success'}`;
            report.innerHTML = `
                <div class="academic-preview-head">
                    <div>
                        <span><i class="fas fa-table-list"></i> Conferência antes de importar</span>
                        <strong>${preview.records.length} aluno${preview.records.length === 1 ? '' : 's'} em ${preview.files.length} arquivo${preview.files.length === 1 ? '' : 's'}</strong>
                    </div>
                    <em>${blocked ? 'Ajustes necessários' : 'Pronto para gravar'}</em>
                </div>
                <div class="academic-preview-stats">
                    <div><span>Encontrados</span><strong>${effectiveMatched}</strong></div>
                    <div><span>Sem vínculo</span><strong>${preview.unmatched.length}</strong></div>
                    <div><span>Turmas</span><strong>${preview.companies.length}</strong></div>
                    <div><span>Turma + nome</span><strong>${preview.nameOnly.length}</strong></div>
                </div>
                <div class="academic-preview-files">
                    ${preview.fileSummaries.map(file => `
                        <article class="${file.company && !file.error ? '' : 'warning'}">
                            <i class="fas ${file.company && !file.error ? 'fa-file-excel' : 'fa-triangle-exclamation'}"></i>
                            <div><strong>${escapeHtml(file.name)}</strong><span>${file.error ? escapeHtml(file.error) : `${file.count} alunos • ${escapeHtml(file.company || 'Turma não identificada')}`}</span></div>
                        </article>
                    `).join('')}
                </div>
                ${preview.nameOnly.length ? `<p class="academic-preview-warning"><i class="fas fa-user-check"></i> ${preview.nameOnly.length} registro${preview.nameOnly.length === 1 ? '' : 's'} sem CPF, telefone ou e-mail ${preview.nameOnly.length === 1 ? 'será conferido' : 'serão conferidos'} por turma + nome compatível. Ex.: o sistema consegue vincular “Samara Lima” com “Samara Lima Crispim da Silva” quando não houver outro aluno possível.</p>` : ''}
                ${ambiguityStats.total ? `<p class="academic-preview-warning"><i class="fas fa-user-group"></i> ${ambiguityStats.total} nome${ambiguityStats.total === 1 ? '' : 's'} com possível dúvida. Você pode revisar, escolher o cadastro correto ou manter sem alterar esse registro.</p>` : ''}
                ${ambiguityStats.resolved ? `<p class="academic-preview-warning"><i class="fas fa-circle-check"></i> ${ambiguityStats.resolved} decisão${ambiguityStats.resolved === 1 ? '' : 'ões'} manual${ambiguityStats.resolved === 1 ? '' : 'is'} pronta${ambiguityStats.resolved === 1 ? '' : 's'} para importação.</p>` : ''}
                ${ambiguityStats.kept ? `<p class="academic-preview-warning"><i class="fas fa-circle-minus"></i> ${ambiguityStats.kept} registro${ambiguityStats.kept === 1 ? '' : 's'} com dúvida ${ambiguityStats.kept === 1 ? 'ficará' : 'ficarão'} sem alteração se você confirmar agora.</p>` : ''}
                ${preview.companyMismatches.length ? `<p class="academic-preview-warning"><i class="fas fa-users-slash"></i> CPF/contato encontrado em outra turma: ${escapeHtml(preview.companyMismatches.slice(0, 8).join(', '))}${preview.companyMismatches.length > 8 ? '...' : ''}</p>` : ''}
                ${preview.unmatched.length ? `<p class="academic-preview-warning"><i class="fas fa-user-xmark"></i> Sem cadastro correspondente: ${escapeHtml(preview.unmatched.slice(0, 8).join(', '))}${preview.unmatched.length > 8 ? '...' : ''}</p>` : ''}
                ${preview.missingCompany.length ? `<p class="academic-preview-danger"><i class="fas fa-triangle-exclamation"></i> Identifique a turma no nome do arquivo (ex.: B07.xlsx) ou adicione a coluna “Turma”.</p>` : ''}
                ${preview.fileErrors.length ? `<p class="academic-preview-danger"><i class="fas fa-file-circle-xmark"></i> Arquivos que precisam de correção: ${escapeHtml(preview.fileErrors.map(file => file.name).join(', '))}.</p>` : ''}
                ${preview.duplicates.length ? `<p class="academic-preview-danger"><i class="fas fa-clone"></i> Existem alunos repetidos nos arquivos selecionados: ${escapeHtml(preview.duplicates.slice(0, 8).join(', '))}${preview.duplicates.length > 8 ? '...' : ''}</p>` : ''}
                ${preview.matched === 0 ? `<p class="academic-preview-danger"><i class="fas fa-user-slash"></i> Nenhum aluno foi encontrado no cadastro. Confira CPF, turma e nome antes de importar.</p>` : ''}
                <div class="academic-preview-actions">
                    <button type="button" class="secondary" onclick="cancelAcademicGradesImport()"><i class="fas fa-xmark"></i> Cancelar</button>
                    ${preview.ambiguousMatches.length ? `<button type="button" class="secondary" onclick="openAcademicNameDecisionModal()"><i class="fas fa-user-check"></i> Revisar nomes</button>` : ''}
                    <button type="button" onclick="confirmAcademicGradesImport()" ${blocked ? 'disabled' : ''}><i class="fas fa-cloud-arrow-up"></i> Confirmar importação</button>
                </div>
            `;
        }
        
        function getAcademicDecisionModal() {
            let modal = document.getElementById('academic-name-decision-modal');
            if (modal) return modal;
        
            modal = document.createElement('div');
            modal.id = 'academic-name-decision-modal';
            modal.className = 'academic-decision-modal hidden';
            modal.innerHTML = `
                <section class="academic-decision-panel" role="dialog" aria-modal="true" aria-label="Resolver nomes da importação">
                    <header class="academic-decision-header">
                        <div>
                            <span><i class="fas fa-user-check"></i> Conferência manual</span>
                            <h3>Resolver alunos com nome parecido</h3>
                            <p>Escolha o cadastro correto quando precisar. Se não tiver certeza, mantenha sem alterar.</p>
                        </div>
                        <button type="button" onclick="closeAcademicNameDecisionModal()" aria-label="Fechar"><i class="fas fa-xmark"></i></button>
                    </header>
                    <div id="academic-name-decision-list" class="academic-decision-list"></div>
                    <footer class="academic-decision-footer">
                        <button type="button" class="secondary" onclick="closeAcademicNameDecisionModal()">Voltar</button>
                        <button type="button" onclick="saveAcademicNameDecisions()"><i class="fas fa-circle-check"></i> Salvar decisões</button>
                    </footer>
                </section>
            `;
            document.body.appendChild(modal);
            return modal;
        }
        
        window.openAcademicNameDecisionModal = function() {
            if (!pendingAcademicImport || !pendingAcademicImport.ambiguousMatches?.length) {
                showAppToast('Nada para decidir', 'Não há nomes ambíguos nesta importação.', 'info');
                return;
            }
        
            const modal = getAcademicDecisionModal();
            const list = modal.querySelector('#academic-name-decision-list');
            const items = pendingAcademicImport.ambiguousMatches || [];
        
            list.innerHTML = items.map((item, index) => {
                const record = pendingAcademicImport.records?.[item.recordIndex] || {};
                const candidateOptions = (item.candidates || []).map(candidate => {
                    const checked = item.resolvedUid === candidate.uid ? 'checked' : '';
                    const cpf = onlyDigits(candidate.cpf) ? `CPF ${escapeHtml(candidate.cpf)}` : 'CPF não informado';
                    const email = candidate.email ? escapeHtml(candidate.email) : 'E-mail não informado';
                    const company = candidate.company || 'Turma não informada';
                    return `
                        <label class="academic-decision-option">
                            <input type="radio" name="academic-decision-${index}" value="${escapeHtml(candidate.uid)}" ${checked}>
                            <span>
                                <strong>${escapeHtml(candidate.name || 'Sem nome')}</strong>
                                <small>${escapeHtml(company)} • ${cpf} • ${email}</small>
                            </span>
                        </label>
                    `;
                }).join('');
        
                return `
                    <article class="academic-decision-card" data-decision-index="${index}">
                        <div class="academic-decision-record">
                            <span>Nome na planilha</span>
                            <strong>${escapeHtml(item.recordName || record.name || 'Sem nome')}</strong>
                            <small>${escapeHtml(item.recordCompany || record.company || 'Turma não informada')} ${item.sourceFile ? `• ${escapeHtml(item.sourceFile)}` : ''}</small>
                        </div>
                        <div class="academic-decision-grades">
                            ${ACADEMIC_GRADE_SUBJECTS.map(subject => {
                                const grade = record.subjects?.[subject.id];
                                return hasAcademicValue(grade) ? `<span>${escapeHtml(subject.title)}: <strong>${escapeHtml(grade)}</strong></span>` : '';
                            }).join('')}
                            ${hasAcademicValue(record.average) ? `<span>Média: <strong>${escapeHtml(record.average)}</strong></span>` : ''}
                        </div>
                        <div class="academic-decision-options">
                            <label class="academic-decision-option keep-unchanged">
                                <input type="radio" name="academic-decision-${index}" value="__keep__" ${!item.resolvedUid ? 'checked' : ''}>
                                <span>
                                    <strong>Manter sem alterar este registro</strong>
                                    <small>Use quando não precisar corrigir agora ou quando quiser evitar lançar nota no aluno errado.</small>
                                </span>
                            </label>
                            ${candidateOptions || '<p class="academic-decision-empty">Nenhum candidato disponível.</p>'}
                        </div>
                    </article>
                `;
            }).join('');
        
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
        };
        
        window.closeAcademicNameDecisionModal = function() {
            document.getElementById('academic-name-decision-modal')?.classList.add('hidden');
            document.body.classList.remove('modal-open');
        };
        
        window.saveAcademicNameDecisions = function() {
            if (!pendingAcademicImport) return;
            const modal = getAcademicDecisionModal();
            const unresolved = [];
        
            (pendingAcademicImport.ambiguousMatches || []).forEach((item, index) => {
                const selected = modal.querySelector(`input[name="academic-decision-${index}"]:checked`);
                if (!selected?.value || selected.value === '__keep__') {
                    item.resolvedUid = '';
                    item.keepUnchanged = true;
                    if (pendingAcademicImport.records?.[item.recordIndex]) {
                        delete pendingAcademicImport.records[item.recordIndex]._resolvedUid;
                    }
                    return;
                }
        
                item.resolvedUid = selected.value;
                item.keepUnchanged = false;
                if (pendingAcademicImport.records?.[item.recordIndex]) {
                    pendingAcademicImport.records[item.recordIndex]._resolvedUid = selected.value;
                    delete pendingAcademicImport.records[item.recordIndex]._keepUnchanged;
                }
            });
        
            if (unresolved.length) {
                showAppToast('Ainda falta decidir', `Selecione o aluno correto para: ${unresolved.slice(0, 3).join(', ')}${unresolved.length > 3 ? '...' : ''}`, 'warning');
                return;
            }
        
            closeAcademicNameDecisionModal();
            renderAcademicImportPreview(pendingAcademicImport);
            showAppToast('Revisão salva', 'Você pode confirmar a importação. Registros mantidos sem alteração não serão lançados.', 'success');
        };
        
        async function prepareAcademicImportPreview(records, fileSummaries) {
            const db = window.__fbDB || window.fbDB;
            if (!db) throw new Error('Não consegui acessar o banco de dados para conferir os alunos.');
        
            const snapshot = await db.collection('users').get();
            const users = [];
            snapshot.forEach(doc => users.push({ uid: doc.id, data: doc.data() || {} }));
        
            const identityMap = new Map();
            const duplicates = [];
            records.forEach(record => {
                const key = getAcademicIdentityKey(record);
                if (!key || key.endsWith('|name:')) return;
                if (identityMap.has(key)) duplicates.push(record.name || record.cpf || record.email || key);
                else identityMap.set(key, record);
            });
        
            let matched = 0;
            const unmatched = [];
            const ambiguousMatches = [];
            const companyMismatches = [];
            records.forEach((record, recordIndex) => {
                const match = findMatchingUserForAcademicRecord(record, users);
                if (match) {
                    if (match.ambiguous) {
                        ambiguousMatches.push({
                            recordIndex,
                            recordName: record.name || 'Sem nome',
                            recordCompany: record.company || '',
                            sourceFile: record.sourceFile || '',
                            candidates: match.candidates || [],
                            resolvedUid: '',
                            keepUnchanged: true
                        });
                        record._keepUnchanged = true;
                        return;
                    }
                    matched++;
                    return;
                }
                const matchIgnoringCompany = record.company
                    ? findMatchingUserForAcademicRecord({ ...record, company: '' }, users)
                    : null;
                const label = record.name || record.cpf || record.email || 'Sem identificação';
                if (matchIgnoringCompany?.ambiguous) {
                    ambiguousMatches.push({
                        recordIndex,
                        recordName: label,
                        recordCompany: record.company || '',
                        sourceFile: record.sourceFile || '',
                        candidates: matchIgnoringCompany.candidates || [],
                        resolvedUid: '',
                        keepUnchanged: true
                    });
                    record._keepUnchanged = true;
                }
                else if (matchIgnoringCompany) companyMismatches.push(`${label} (${record.company} ≠ ${matchIgnoringCompany.data?.company || 'sem turma'})`);
                else unmatched.push(label);
            });
        
            const preview = {
                records,
                files: fileSummaries.map(file => file.name),
                fileSummaries,
                companies: Array.from(new Set(records.map(record => record.company).filter(Boolean))),
                missingCompany: records.filter(record => !record.company).map(record => record.name || record.sourceFile || 'Registro sem turma'),
                nameOnly: records.filter(record => !onlyDigits(record.cpf) && !onlyDigits(record.phone) && !normalizeSearchText(record.email)),
                fileErrors: fileSummaries.filter(file => file.error),
                duplicates: Array.from(new Set(duplicates)),
                matched,
                unmatched,
                ambiguousMatches,
                companyMismatches
            };
            pendingAcademicImport = preview;
            renderAcademicImportPreview(preview);
        }
        
        window.confirmAcademicGradesImport = async function() {
            if (!pendingAcademicImport) {
                showAppToast('Nenhuma prévia disponível', 'Selecione as planilhas novamente.', 'warning');
                return;
            }
            const preview = pendingAcademicImport;
            const ambiguityStats = getAcademicAmbiguityStats(preview);
            const effectiveMatched = preview.matched + ambiguityStats.resolved;
            if (preview.missingCompany.length || preview.duplicates.length || preview.fileErrors.length || effectiveMatched === 0) {
                showAppToast('Importação bloqueada', 'Corrija turmas, duplicidades ou selecione uma planilha com alunos encontrados.', 'warning');
                return;
            }
            const importId = `academic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            await importAcademicRecords(preview.records, preview.files.join(', '), { importId });
        };
        
        window.cancelAcademicGradesImport = function() {
            pendingAcademicImport = null;
            setAcademicImportReport('info', 'Importação cancelada', ['Nenhuma nota foi alterada.']);
        };
        
        window.importAcademicGradesFromFile = async function(input) {
            const files = Array.from(input?.files || []);
            if (!files.length) return;
            try {
                setAcademicImportReport('info', 'Arquivo selecionado', [
                    `${files.length} planilha${files.length === 1 ? '' : 's'} selecionada${files.length === 1 ? '' : 's'}.`,
                    'Lendo e conferindo as turmas no seu navegador...'
                ]);
                const combinedRecords = [];
                const fileSummaries = [];
                for (const file of files) {
                    try {
                        const records = await readAcademicRecordsFromFile(file);
                        combinedRecords.push(...records);
                        fileSummaries.push({
                            name: file.name,
                            count: records.length,
                            company: records.inferredCompany || records.find(record => record.company)?.company || '',
                            sheets: records.sheetName || '',
                            error: ''
                        });
                    } catch (fileError) {
                        fileSummaries.push({
                            name: file.name,
                            count: 0,
                            company: inferAcademicCompanyFromFileName(file.name),
                            sheets: '',
                            error: fileError?.message || 'Não foi possível ler este arquivo.'
                        });
                    }
                }
                if (!combinedRecords.length) throw new Error(fileSummaries.map(file => `${file.name}: ${file.error}`).join(' | ') || 'Nenhum aluno foi encontrado.');
                await prepareAcademicImportPreview(combinedRecords, fileSummaries);
            } catch (error) {
                console.error(error);
                setAcademicImportReport('error', 'Não consegui ler a planilha', [
                    files.map(file => file.name).join(', '),
                    error?.message || 'Erro desconhecido.'
                ]);
                showAppToast('Não consegui ler as planilhas', error?.message || 'Confira os arquivos selecionados.', 'error');
            } finally {
                if (input) input.value = '';
            }
        };
        
        window.requestAcademicImportUndo = function(importId) {
            const entry = getAcademicImportHistory().find(item => item.id === importId);
            if (!entry || entry.undone) return;
            const report = document.getElementById('academic-import-grades-report');
            if (!report) return;
            report.className = 'admin-import-grades-report academic-import-preview warning';
            report.innerHTML = `
                <div class="academic-preview-head"><div><span><i class="fas fa-rotate-left"></i> Desfazer importação</span><strong>${escapeHtml(entry.files?.join(', ') || entry.source || 'Importação')}</strong></div><em>Ação protegida</em></div>
                <p class="academic-preview-warning">As notas dos ${entry.updated || 0} cadastros voltarão ao estado anterior desta importação. Alterações posteriores em um aluno serão preservadas.</p>
                <div class="academic-preview-actions">
                    <button type="button" class="secondary" onclick="cancelAcademicImportUndo()"><i class="fas fa-xmark"></i> Cancelar</button>
                    <button type="button" class="danger" onclick="undoLastAcademicImport('${escapeJsString(importId)}')"><i class="fas fa-rotate-left"></i> Confirmar e desfazer</button>
                </div>
            `;
        };
        
        window.cancelAcademicImportUndo = function() {
            setAcademicImportReport('info', 'Desfazer cancelado', ['Nenhuma nota foi alterada.']);
            renderAcademicImportHistory();
        };
        
        window.undoLastAcademicImport = async function(importId) {
            if (!isInstructorAdmin(getCurrentUserData())) {
                showAppToast('Acesso restrito', 'Apenas o administrador pode desfazer notas.', 'warning');
                return;
            }
            const history = getAcademicImportHistory();
            const entry = history.find(item => item.id === importId);
            if (!entry || entry.undone) return;
            const db = window.__fbDB || window.fbDB;
            if (!db) return showAppToast('Banco indisponível', 'Tente novamente em instantes.', 'error');
        
            setAcademicImportReport('info', 'Desfazendo importação', ['Restaurando o estado anterior das notas...']);
            try {
                const snapshot = await db.collection('users').get();
                const affected = [];
                snapshot.forEach(doc => {
                    const data = doc.data() || {};
                    if (data.academicRecordImportId === importId) affected.push({ ref: doc.ref, data });
                });
        
                let batch = db.batch();
                let count = 0;
                let reverted = 0;
                for (const item of affected) {
                    const previous = item.data.academicRecordPrevious;
                    const previousImportId = item.data.academicRecordPreviousImportId;
                    batch.update(item.ref, {
                        academicRecord: previous || window.firebase.firestore.FieldValue.delete(),
                        academicRecordImportId: previousImportId || window.firebase.firestore.FieldValue.delete(),
                        academicRecordPrevious: window.firebase.firestore.FieldValue.delete(),
                        academicRecordPreviousImportId: window.firebase.firestore.FieldValue.delete(),
                        academicRecordUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    reverted++;
                    count++;
                    if (count >= 450) {
                        await batch.commit();
                        batch = db.batch();
                        count = 0;
                    }
                }
                if (count) await batch.commit();
        
                await persistAcademicImportHistory({ ...entry, undone: true, undoneAt: new Date().toISOString(), reverted });
                setAcademicImportReport('success', 'Importação desfeita', [`${reverted} cadastro${reverted === 1 ? '' : 's'} restaurado${reverted === 1 ? '' : 's'}.`]);
                showAppToast('Notas restauradas', `${reverted} aluno${reverted === 1 ? '' : 's'} voltou ao estado anterior.`, 'success');
            } catch (error) {
                console.error(error);
                setAcademicImportReport('error', 'Não consegui desfazer', [error?.message || 'Erro desconhecido.']);
                showAppToast('Erro ao desfazer', error?.message || 'Tente novamente.', 'error');
            }
        };

        return {
            hasAcademicValue,
            deriveAcademicSituation,
            mergeAcademicRecord,
            persistAcademicImportHistory,
            renderAcademicImportHistory,
            importAcademicRecords,
            getAcademicImportHistory
        };
    };
})(window);
