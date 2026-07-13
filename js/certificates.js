(function(window) {
    'use strict';

    window.PBC_CREATE_CERTIFICATE_MANAGER = function(deps = {}) {
        const getInstructorCertificateBaseUsers = deps.getInstructorCertificateBaseUsers || (() => []);
        const loadInstructorUsersForMessages = deps.loadInstructorUsersForMessages || (async () => []);
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase());
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const showAppToast = deps.showAppToast || (() => {});
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const getCurrentUser = deps.getCurrentUser || (() => window.currentUser || null);
        const driveOpenUrl = deps.driveOpenUrl || (url => url || '');
        const driveDownloadUrl = deps.driveDownloadUrl || (url => url || '');

        function getInstructorCertificateUsers() {
            const companyFilter = normalizeSearchText(document.getElementById('instructor-certificate-company')?.value || '');
            return getInstructorCertificateBaseUsers()
                .filter(user => !companyFilter || normalizeSearchText(user.company || 'Particular') === companyFilter)
                .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
        }
        
        function getInstructorCertificateOption(user) {
            const cpf = user?.cpf ? `CPF ${user.cpf}` : '';
            const email = user?.email || '';
            const phone = user?.phone ? `Tel ${user.phone}` : '';
            return [user?.name || 'Sem nome', cpf, email, phone].filter(Boolean).join(' | ');
        }
        
        function populateInstructorCertificateCompanies() {
            const select = document.getElementById('instructor-certificate-company');
            if (!select) return;
            const currentValue = select.value || '';
            const companyMap = new Map();
            getInstructorCertificateBaseUsers().forEach(user => {
                const rawCompany = String(user.company || 'Particular').trim() || 'Particular';
                const key = normalizeSearchText(rawCompany).replace(/\s+/g, ' ');
                if (!companyMap.has(key)) companyMap.set(key, rawCompany.toUpperCase());
            });
            const companies = [...companyMap.values()].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
            select.innerHTML = '<option value="">Todas as turmas</option>' + companies
                .map(company => `<option value="${escapeHtml(company)}">${escapeHtml(company)}</option>`)
                .join('');
            const currentKey = normalizeSearchText(currentValue).replace(/\s+/g, ' ');
            const matchingOption = [...select.options].find(option => normalizeSearchText(option.value).replace(/\s+/g, ' ') === currentKey);
            if (matchingOption) {
                select.value = matchingOption.value;
            }
        }
        
        function populateInstructorCertificateStudents(shouldClearStudent = false) {
            const datalist = document.getElementById('instructor-certificate-students');
            if (!datalist) return;
            if (shouldClearStudent) {
                const input = document.getElementById('instructor-certificate-student');
                if (input) input.value = '';
            }
            const users = getInstructorCertificateUsers();
            datalist.innerHTML = users
                .slice(0, 500)
                .map(user => `<option value="${escapeHtml(getInstructorCertificateOption(user))}"></option>`)
                .join('');
            const result = document.getElementById('instructor-certificate-result');
            if (result && shouldClearStudent) {
                result.innerHTML = `<i class="fas fa-users"></i> ${users.length} aluno${users.length === 1 ? '' : 's'} encontrado${users.length === 1 ? '' : 's'} nessa turma. Selecione um aluno e o PDF.`;
            }
        }
        
        window.populateInstructorCertificateStudents = populateInstructorCertificateStudents;
        
        
        function findInstructorCertificateStudent(rawValue) {
            const value = String(rawValue || '').trim();
            if (!value) return null;
            const text = normalizeSearchText(value);
            const digits = onlyDigits(value);
            const users = getInstructorCertificateUsers();
        
            return users.find(user => {
                const userText = normalizeSearchText(`${user.name || ''} ${user.email || ''} ${user.company || ''}`);
                const userDigits = onlyDigits(`${user.cpf || ''} ${user.phone || ''}`);
                return user.uid === value
                    || (digits && userDigits.includes(digits))
                    || userText.includes(text)
                    || text.includes(normalizeSearchText(user.name || ''));
            }) || null;
        }
        
        function setInstructorCertificateResult(type, message) {
            const result = document.getElementById('instructor-certificate-result');
            if (!result) return;
            result.className = `instructor-message-preview certificate-result ${type || 'info'}`;
            result.innerHTML = message;
        }
        
        function getSelectedInstructorCertificateStudent() {
            const studentInput = document.getElementById('instructor-certificate-student');
            return findInstructorCertificateStudent(studentInput?.value);
        }
        
        function getSafeCertificateFileName(fileName) {
            return String(fileName || 'certificado.pdf')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9._-]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 120) || 'certificado.pdf';
        }
        
        function uploadPdfWithProgress(ref, file, onProgress) {
            return new Promise((resolve, reject) => {
                let finished = false;
                let lastProgressAt = Date.now();
                const timeout = setTimeout(() => {
                    if (finished) return;
                    finished = true;
                    reject(new Error('O envio não avançou. Para muitos certificados, use o campo de link do PDF, que salva instantaneamente.'));
                }, 65000);
        
                const stallCheck = setInterval(() => {
                    if (finished) return;
                    if (Date.now() - lastProgressAt > 25000) {
                        finished = true;
                        clearTimeout(timeout);
                        clearInterval(stallCheck);
                        reject(new Error('O upload ficou parado. Use o link do PDF para salvar mais rápido ou tente um arquivo menor.'));
                    }
                }, 5000);
        
                try {
                    const task = ref.put(file, { contentType: 'application/pdf' });
                    task.on('state_changed', snapshot => {
                        const total = snapshot.totalBytes || file.size || 1;
                        const percent = Math.max(1, Math.round((snapshot.bytesTransferred / total) * 100));
                        if (percent > 1 || snapshot.bytesTransferred > 0) lastProgressAt = Date.now();
                        onProgress?.(percent);
                    }, error => {
                        if (finished) return;
                        finished = true;
                        clearTimeout(timeout);
                        clearInterval(stallCheck);
                        reject(error);
                    }, async () => {
                        if (finished) return;
                        finished = true;
                        clearTimeout(timeout);
                        clearInterval(stallCheck);
                        try {
                            const url = await task.snapshot.ref.getDownloadURL();
                            resolve({ snapshot: task.snapshot, url });
                        } catch (error) {
                            reject(error);
                        }
                    });
                } catch (error) {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    clearInterval(stallCheck);
                    reject(error);
                }
            });
        }
        
        async function saveCertificateToStudent(student, payload) {
            const db = window.__fbDB || window.fbDB;
            if (!db || !student?.uid) {
                throw new Error('Banco de dados ou aluno não encontrado.');
            }
            await db.collection('users').doc(student.uid).update({
                ...payload,
                certificateUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                certificateUploadedBy: getCurrentUserData()?.uid || null
            });
            const currentUid = getCurrentUserData()?.uid || getCurrentUser()?.uid;
            if (student.uid === currentUid && getCurrentUserData()) {
                Object.assign(getCurrentUserData(), payload, {
                    certificateUploadedBy: getCurrentUserData()?.uid || null
                });
            }
        }

        function renderStudentCertificatePanel(profileData = {}, stats = {}) {
            const certificateUrl = String(profileData?.certificateUrl || '').trim();
            const certificateOpenUrl = certificateUrl ? driveOpenUrl(certificateUrl) : '';
            const certificateDownloadUrl = certificateUrl ? driveDownloadUrl(certificateUrl) : '';
            const isFinished = Number(stats?.percent || 0) >= 100;

            return `
                <div class="student-certificate-panel">
                    <div>
                        <span><i class="fas fa-award"></i> Certificados e validades</span>
                        <h3>${certificateUrl ? 'Certificado disponível' : (isFinished ? 'Curso principal concluído' : 'Continue avançando para liberar sua finalização')}</h3>
                        <p>${certificateUrl ? 'Seu certificado foi vinculado pela coordenação e já pode ser acessado por aqui.' : 'Use esta área como referência para status, validade de acesso e materiais que sustentam sua carreira profissional.'}</p>
                    </div>
                    ${certificateUrl ? `
                        <div class="student-certificate-actions">
                            <button type="button" class="student-certificate-open-btn" onclick="window.open('${escapeJsString(certificateOpenUrl)}', '_blank', 'noopener')">
                                <i class="fas fa-certificate"></i>
                                <span>Abrir certificado</span>
                            </button>
                            <button type="button" class="student-certificate-download-btn" onclick="window.open('${escapeJsString(certificateDownloadUrl)}', '_blank', 'noopener')">
                                <i class="fas fa-download"></i>
                                <span>Baixar PDF</span>
                            </button>
                        </div>
                    ` : `
                        <button type="button" onclick="window.renderStudentLibraryPage?.()"><i class="fas fa-folder-open"></i> Ver biblioteca</button>
                    `}
                </div>
            `;
        }
        
        window.saveInstructorCertificateLink = async function() {
            if (!isInstructorAdmin()) {
                showAppToast('Acesso restrito', 'Apenas o instrutor/administrador pode vincular certificado.', 'warning');
                return;
            }
            await loadInstructorUsersForMessages();
            populateInstructorCertificateCompanies();
            populateInstructorCertificateStudents();
        
            const student = getSelectedInstructorCertificateStudent();
            const urlInput = document.getElementById('instructor-certificate-url');
            const button = document.getElementById('instructor-certificate-link-btn');
            const url = String(urlInput?.value || '').trim();
        
            if (!student) {
                setInstructorCertificateResult('warning', '<i class="fas fa-triangle-exclamation"></i> Selecione o aluno pelo nome, CPF ou e-mail antes de salvar.');
                return;
            }
            if (!/^https?:\/\/.+/i.test(url)) {
                setInstructorCertificateResult('warning', '<i class="fas fa-link-slash"></i> Cole um link válido começando com http ou https.');
                return;
            }
        
            const previousHtml = button?.innerHTML;
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            }
        
            try {
                await saveCertificateToStudent(student, {
                    certificateUrl: url,
                    certificateFileName: 'Certificado em PDF',
                    certificateStoragePath: '',
                    certificateSource: 'link'
                });
                setInstructorCertificateResult('success', `
                    <i class="fas fa-circle-check"></i>
                    <span>Link do certificado vinculado ao perfil de <strong>${escapeHtml(student.name || student.email || 'aluno')}</strong>.</span>
                    <button type="button" onclick="window.open('${escapeJsString(url)}', '_blank', 'noopener')">Abrir PDF</button>
                `);
                if (urlInput) urlInput.value = '';
                showAppToast('Certificado vinculado', 'O link já aparece no perfil do aluno.', 'success');
            } catch (error) {
                console.error(error);
                setInstructorCertificateResult('error', `<i class="fas fa-circle-exclamation"></i> Não consegui salvar o link. ${escapeHtml(error?.message || 'Tente novamente.')}`);
                showAppToast('Erro ao salvar', error?.message || 'Tente novamente.', 'error');
            } finally {
                if (button) {
                    button.disabled = false;
                    button.innerHTML = previousHtml;
                }
            }
        };
        
        window.uploadInstructorCertificate = async function() {
            if (!isInstructorAdmin()) {
                showAppToast('Acesso restrito', 'Apenas o instrutor/administrador pode enviar certificado.', 'warning');
                return;
            }
        
            await loadInstructorUsersForMessages();
            populateInstructorCertificateCompanies();
            populateInstructorCertificateStudents();
        
            const fileInput = document.getElementById('instructor-certificate-file');
            const button = document.getElementById('instructor-certificate-upload-btn');
            const file = fileInput?.files?.[0];
            const student = getSelectedInstructorCertificateStudent();
        
            if (!student) {
                setInstructorCertificateResult('warning', '<i class="fas fa-triangle-exclamation"></i> Selecione o aluno pelo nome, CPF ou e-mail antes de enviar.');
                showAppToast('Aluno não encontrado', 'Confira o aluno selecionado para vincular o certificado.', 'warning');
                return;
            }
            if (!file) {
                setInstructorCertificateResult('warning', '<i class="fas fa-file-pdf"></i> Escolha o PDF do certificado antes de enviar.');
                showAppToast('PDF não selecionado', 'Escolha o arquivo do certificado.', 'warning');
                return;
            }
            if (file.type && file.type !== 'application/pdf') {
                setInstructorCertificateResult('warning', '<i class="fas fa-file-circle-xmark"></i> Envie apenas arquivo em PDF.');
                showAppToast('Formato inválido', 'O certificado precisa estar em PDF.', 'warning');
                return;
            }
        
            const db = window.__fbDB || window.fbDB;
            const storage = window.__fbStorage || window.fbStorage;
            if (!db || !storage) {
                setInstructorCertificateResult('error', '<i class="fas fa-circle-exclamation"></i> Firebase Storage não está disponível. Confira se o serviço Storage está ativado no Firebase.');
                showAppToast('Storage indisponível', 'Não consegui acessar o armazenamento de PDFs agora.', 'error');
                return;
            }
        
            const previousHtml = button?.innerHTML;
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando PDF...';
            }
            setInstructorCertificateResult('info', `<i class="fas fa-spinner fa-spin"></i> Preparando envio do certificado de ${escapeHtml(student.name || 'aluno')}...`);
        
            try {
                const safeName = getSafeCertificateFileName(file.name);
                const path = `certificates/${student.uid}/${Date.now()}_${safeName}`;
                const ref = storage.ref().child(path);
                const { url } = await uploadPdfWithProgress(ref, file, percent => {
                    if (button) button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando ${percent}%`;
                    setInstructorCertificateResult('info', `<i class="fas fa-spinner fa-spin"></i> Enviando certificado de ${escapeHtml(student.name || 'aluno')}: ${percent}% concluído.`);
                });
        
                const certificatePayload = {
                    certificateUrl: url,
                    certificateFileName: file.name || safeName,
                    certificateStoragePath: path,
                    certificateUploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    certificateUploadedBy: getCurrentUserData()?.uid || null
                };
                await db.collection('users').doc(student.uid).update(certificatePayload);
                const currentUid = getCurrentUserData()?.uid || getCurrentUser()?.uid;
                if (student.uid === currentUid && getCurrentUserData()) {
                    Object.assign(getCurrentUserData(), {
                        certificateUrl: url,
                        certificateFileName: file.name || safeName,
                        certificateStoragePath: path,
                        certificateUploadedBy: getCurrentUserData()?.uid || null
                    });
                }
        
                if (fileInput) fileInput.value = '';
                setInstructorCertificateResult('success', `
                    <i class="fas fa-circle-check"></i>
                    <span>Certificado vinculado ao perfil de <strong>${escapeHtml(student.name || student.email || 'aluno')}</strong>.</span>
                    <button type="button" onclick="window.open('${escapeJsString(url)}', '_blank', 'noopener')">Abrir PDF</button>
                `);
                showAppToast('Certificado enviado', 'O PDF já aparece no perfil do aluno.', 'success');
            } catch (error) {
                console.error(error);
                const message = error?.code === 'storage/unauthorized'
                    ? 'Sem permissão para enviar PDF no Firebase Storage. Ajuste as regras do Storage para o administrador.'
                    : (error?.message || 'Confira as permissões do Firebase Storage.');
                setInstructorCertificateResult('error', `<i class="fas fa-circle-exclamation"></i> Não consegui enviar o certificado. ${escapeHtml(message)}`);
                showAppToast('Erro no envio', message, 'error');
            } finally {
                if (button) {
                    button.disabled = false;
                    button.innerHTML = previousHtml;
                }
            }
        };

        window.populateInstructorCertificateCompanies = populateInstructorCertificateCompanies;
        window.populateInstructorCertificateStudents = populateInstructorCertificateStudents;

        return {
            populateInstructorCertificateCompanies,
            populateInstructorCertificateStudents,
            saveCertificateToStudent,
            renderStudentCertificatePanel
        };
    };
})(window);
