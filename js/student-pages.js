(function(window) {
    'use strict';

    window.PBC_CREATE_STUDENT_PAGES = function(deps = {}) {
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase().trim());
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const getCompletedModules = deps.getCompletedModules || (() => []);
        const setCurrentModuleId = deps.setCurrentModuleId || (() => {});
        const getContentArea = deps.getContentArea || (() => document.getElementById('content-area'));
        const loadModuleContent = deps.loadModuleContent || (() => {});
        const updateBreadcrumbs = deps.updateBreadcrumbs || (() => {});
        const getVisibleModuleIds = deps.getVisibleModuleIds || (() => []);
        const getLearningStats = deps.getLearningStats || (() => ({ percent: 0, doneCount: 0, total: 0 }));
        const getAccessStatus = deps.getAccessStatus || (() => ({ label: 'Acesso não informado', tone: 'neutral', detail: '' }));
        const getJourneyStepHtml = deps.getJourneyStepHtml || (() => '');
        const getStudentMissionsHtml = deps.getStudentMissionsHtml || (() => '');
        const getImportantNoticeHtml = deps.getImportantNoticeHtml || (() => '');
        const getOperationalLevelHtml = deps.getOperationalLevelHtml || (() => '');
        const getStudentGamificationProfileHtml = deps.getStudentGamificationProfileHtml || (() => '');
        const getStudentCompetencyAchievementsHtml = deps.getStudentCompetencyAchievementsHtml || (() => '');
        const getStudentSmartDashboardHtml = deps.getStudentSmartDashboardHtml || (() => '');
        const getStudentNpsHtml = deps.getStudentNpsHtml || (() => '');
        const getFavoriteCardsHtml = deps.getFavoriteCardsHtml || (() => '');
        const getFavoriteModules = deps.getFavoriteModules || (() => []);
        const getHistoryHtml = deps.getHistoryHtml || (() => '');
        const getLibraryItems = deps.getLibraryItems || (() => []);
        const getVisibleHandbooks = deps.getVisibleHandbooks || (() => []);
        const premiumLibraryCategories = deps.premiumLibraryCategories || [];
        const operationalGlossaryItems = deps.operationalGlossaryItems || [];
        const moduleContent = deps.moduleContent || window.moduleContent || {};
        const renderStudentAcademicHtml = deps.renderStudentAcademicHtml || (() => '');
        const deriveAcademicSituation = deps.deriveAcademicSituation || ((average, situation) => situation || 'Em análise');
        const calculateAcademicAverage = deps.calculateAcademicAverage || (() => '');
        const renderStudentCertificatePanel = deps.renderStudentCertificatePanel || (() => '');
        const closeSidebar = deps.closeSidebar || (() => {});
        const openSidebar = deps.openSidebar || (() => {});
        const startOnboardingTour = deps.startOnboardingTour || (() => {});
        const openPaymentModal = deps.openPaymentModal || (() => {});

        function setPageHtml(html) {
            const area = getContentArea();
            if (area) area.innerHTML = html;
        }

function bindStudentHomeActions() {
    const startBtn = document.getElementById('start-course');
    if (startBtn) {
        const newBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newBtn, startBtn);
        newBtn.addEventListener('click', () => loadModuleContent('module1'));
    }

    const continueBtn = document.getElementById('continue-course');
    continueBtn?.addEventListener('click', () => loadModuleContent(continueBtn.dataset.module || 'module1'));

    document.querySelectorAll('[data-open-module]').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            loadModuleContent(button.dataset.openModule || 'module1');
        });
    });

    document.querySelector('[data-quick-action="modules"]')?.addEventListener('click', () => {
        if (window.innerWidth < 1024) openSidebar();
        else document.querySelector('.sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    ['student-open-payment', 'student-open-payment-compact', 'student-smart-payment'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', openPaymentModal);
    });

    document.getElementById('restart-tour-inline')?.addEventListener('click', () => startOnboardingTour(true));
}

function getWelcomeContent() {
    const stats = getLearningStats();
    const currentUserData = getCurrentUserData();
    const userName = (currentUserData?.name || 'Aluno').split(' ')[0];
    const continueId = stats.lastModuleId && moduleContent[stats.lastModuleId] ? stats.lastModuleId : stats.nextModuleId;
    const continueTitle = stats.lastModule?.title || stats.nextModule?.title || 'Primeiro módulo';
    const nextTitle = stats.nextModule?.title || 'Curso concluído';
    const courseLabel = currentUserData?.courseType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil e Brigadista';
    const access = getAccessStatus();
    const isFinished = stats.percent >= 100;

    return `
        <section class="student-home">
            <div class="student-home-hero">
                <div>
                    <span class="student-eyebrow"><i class="fas fa-shield-alt"></i> ${courseLabel}</span>
                    <h2>Olá, ${userName}. Vamos continuar sua evolução?</h2>
                    <p>Seu painel está pronto com o próximo passo, desempenho e atalhos para estudar sem perder tempo.</p>
                    <div class="student-hero-actions">
                        <button id="continue-course" data-module="${continueId}" class="action-button">
                            <i class="fas fa-play-circle mr-2"></i> Continuar de onde parei
                        </button>
                        <button id="start-course" class="secondary-action-button">
                            <i class="fas fa-list-ul mr-2"></i> Ver primeiro módulo
                        </button>
                    </div>
                </div>
                <div class="student-progress-ring" style="--progress:${stats.percent * 3.6}deg">
                    <span>${stats.percent}%</span>
                    <small>concluído</small>
                </div>
            </div>

            ${getStudentSmartDashboardHtml(stats, access, continueId, continueTitle, nextTitle)}

            ${getJourneyStepHtml(stats)}

            <div class="student-home-focus-row">
                <div class="student-dashboard-grid">
                    <article class="student-stat-card">
                        <i class="fas fa-check-circle text-green-500"></i>
                        <span>Módulos concluídos</span>
                        <strong>${stats.doneCount}/${stats.total}</strong>
                    </article>
                    <article class="student-stat-card">
                        <i class="fas fa-route text-orange-500"></i>
                        <span>Restantes</span>
                        <strong>${stats.remaining}</strong>
                    </article>
                    <article class="student-stat-card">
                        <i class="fas fa-medal text-yellow-500"></i>
                        <span>Conquistas</span>
                        <strong>${stats.achievementCount}</strong>
                    </article>
                </div>
                ${getImportantNoticeHtml()}
            </div>

            ${getOperationalLevelHtml(stats)}

            ${getStudentMissionsHtml(stats)}

            ${isFinished ? `
            <div class="student-post-course-panel">
                <span><i class="fas fa-rocket"></i> Pós-curso ativo</span>
                <h3>Agora o aplicativo vira sua central profissional</h3>
                <p>Use a IAM, ferramentas de carreira, documentos, protocolos rápidos e revisão para continuar evoluindo mesmo após finalizar o curso.</p>
                <div>
                    <button data-open-module="module59"><i class="fas fa-toolbox"></i> Ferramentas</button>
                    <button type="button" onclick="window.renderStudentLibraryPage?.()"><i class="fas fa-folder-open"></i> Biblioteca</button>
                    <button type="button" onclick="window.ToolsApp?.openIamAssistant?.()"><i class="fas fa-shield-halved"></i> IAM</button>
                </div>
            </div>
            ` : ''}

            <div class="student-priority-grid">
                <article>
                    <span><i class="fas fa-compass"></i> Rota de estudo</span>
                    <strong>${continueTitle}</strong>
                    <p>Continue exatamente de onde parou e mantenha o ritmo sem procurar aula por aula.</p>
                </article>
                <article>
                    <span><i class="fas fa-layer-group"></i> Materiais de apoio</span>
                    <strong>Vídeos, podcasts e slides</strong>
                    <p>Use os materiais complementares para revisar antes dos exercícios e simulados.</p>
                </article>
                <article>
                    <span><i class="fas fa-shield-halved"></i> IAM no estudo</span>
                    <strong>Dúvidas e resumos rápidos</strong>
                    <p>Peça explicações objetivas, revise conteúdos e organize seu próximo passo.</p>
                </article>
                <article>
                    <span><i class="fas fa-cloud-arrow-up"></i> Progresso seguro</span>
                    <strong>Salve seu avanço</strong>
                    <p>Ao terminar uma etapa, use o botão Salvar Progresso no rodapé para manter tudo registrado.</p>
                </article>
            </div>

            ${getStudentNpsHtml()}

            <div class="student-hub-grid">
                <article class="student-hub-panel">
                    <div class="student-hub-title">
                        <span><i class="fas fa-star"></i> Favoritos</span>
                        <button type="button" onclick="window.openGlobalSearch?.()">Buscar</button>
                    </div>
                    <div class="student-favorites-list">${getFavoriteCardsHtml()}</div>
                </article>
                <article class="student-hub-panel">
                    <div class="student-hub-title">
                        <span><i class="fas fa-clock-rotate-left"></i> Histórico</span>
                        <button type="button" onclick="window.renderStudentProfilePage?.()">Perfil</button>
                    </div>
                    <ul class="student-history-list">${getHistoryHtml()}</ul>
                </article>
            </div>

            <div class="student-quick-actions">
                <button data-quick-action="modules"><i class="fas fa-layer-group"></i><span>Módulos</span></button>
                <button data-open-module="${stats.nextModuleId}"><i class="fas fa-pencil-alt"></i><span>Exercícios</span></button>
                <button data-open-module="module59"><i class="fas fa-toolbox"></i><span>Ferramentas</span></button>
                <button id="student-open-payment"><i class="fas fa-crown"></i><span>Planos</span></button>
                <button type="button" onclick="window.openGlobalSearch?.()"><i class="fas fa-search"></i><span>Busca</span></button>
                <button type="button" onclick="window.renderCourseHandbooksPage?.()"><i class="fas fa-file-arrow-down"></i><span>Apostilas</span></button>
                <button type="button" onclick="window.renderStudentLibraryPage?.()"><i class="fas fa-folder-open"></i><span>Biblioteca</span></button>
                <button type="button" onclick="window.renderOperationalGlossaryPage?.()"><i class="fas fa-book-medical"></i><span>Glossário</span></button>
                <button type="button" onclick="window.renderStudentProfilePage?.()"><i class="fas fa-user"></i><span>Perfil</span></button>
                <button id="restart-tour-inline"><i class="fas fa-circle-question"></i><span>Tutorial</span></button>
            </div>
        </section>
    `;
}

function goToStudentHome() {
    localStorage.removeItem('gateBombeiroLastModule');
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
    setPageHtml(getWelcomeContent());
    document.getElementById('module-nav')?.classList.add('hidden');
    document.querySelectorAll('.module-list-item.active').forEach(item => item.classList.remove('active'));
    setCurrentModuleId(null);
    closeSidebar();
    bindStudentHomeActions();
    updateBreadcrumbs();
}

window.goToStudentHome = goToStudentHome;

function getSearchItems() {
    const moduleItems = getVisibleModuleIds(getCurrentUserData(), { includeOptional: true }).map(id => ({
        type: 'Aula',
        icon: moduleContent[id]?.iconClass || 'fas fa-book',
        title: moduleContent[id]?.title || id,
        description: 'Módulo do curso',
        moduleId: id
    }));
    const toolItems = [
        ['Ferramentas', 'Central de ferramentas profissionais', 'module59', 'fas fa-toolbox'],
        ['Modo Sobrevivência', 'Treino rápido de perguntas e respostas', 'module60', 'fas fa-heart-pulse'],
        ['Simulador de Ocorrências', 'Cenários práticos de decisão', 'module61', 'fas fa-headset']
    ].map(([title, description, id, icon]) => ({ type: 'Atalho', icon, title, description, moduleId: id }));
    const libraryItems = getLibraryItems().map(item => ({
        type: item.type,
        icon: `fas ${item.icon}`,
        title: `${item.type} - ${item.title}`,
        description: 'Material complementar da aula',
        moduleId: item.moduleId
    }));
    return [...moduleItems, ...toolItems, ...libraryItems];
}

window.renderStudentLibraryPage = function() {
    const items = getLibraryItems();
    setCurrentModuleId(null);
    document.getElementById('module-nav')?.classList.add('hidden');
    setPageHtml(`
        <section class="student-page-shell">
            <div class="student-page-hero">
                <span><i class="fas fa-folder-open"></i> Biblioteca organizada</span>
                <h2>Materiais, slides, podcasts e infográficos</h2>
                <p>Um espaço único para revisar os materiais extras que já foram adicionados à plataforma.</p>
                <div class="student-page-hero-actions">
                    <button type="button" onclick="window.renderOperationalGlossaryPage?.()"><i class="fas fa-book-medical"></i> Abrir glossário operacional</button>
                    <button type="button" onclick="window.openGlobalSearch?.()"><i class="fas fa-search"></i> Buscar material</button>
                </div>
            </div>
            <div class="library-premium-categories">
                ${premiumLibraryCategories.map(category => `
                    <article>
                        <i class="fas ${category.icon}"></i>
                        <div>
                            <span>${category.status}</span>
                            <strong>${category.title}</strong>
                            <p>${category.description}</p>
                        </div>
                    </article>
                `).join('')}
            </div>
            <div class="student-library-grid">
                ${items.length ? items.map(item => `
                    <article class="student-library-card">
                        <i class="fas ${item.icon}"></i>
                        <div>
                            <span>${item.type}</span>
                            <strong>${escapeHtml(item.title)}</strong>
                            <button type="button" data-open-module="${item.moduleId}">Abrir aula</button>
                        </div>
                    </article>
                `).join('') : `
                    <div class="student-empty-state">
                        <i class="fas fa-folder"></i>
                        <strong>Biblioteca em construção</strong>
                        <p>Conforme novos materiais forem cadastrados, eles aparecerão aqui.</p>
                    </div>
                `}
            </div>
        </section>
    `);
    document.querySelectorAll('[data-open-module]').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            loadModuleContent(button.dataset.openModule || 'module1');
        });
    });
    updateBreadcrumbs('Biblioteca');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.renderCourseHandbooksPage = function() {
    const items = getVisibleHandbooks();
    setCurrentModuleId(null);
    document.getElementById('module-nav')?.classList.add('hidden');
    setPageHtml(`
        <section class="student-page-shell">
            <div class="student-page-hero handbook-hero">
                <span><i class="fas fa-file-arrow-down"></i> Apostilas liberadas</span>
                <h2>PDFs de apoio para estudar dentro e fora da plataforma</h2>
                <p>Esta área é aberta para todos os alunos, inclusive em período trial. Baixe a apostila oficial para revisar conteúdos, acompanhar aulas e estudar antes das avaliações.</p>
                <div class="student-page-hero-actions">
                    <button type="button" onclick="window.goToStudentHome?.()"><i class="fas fa-home"></i> Voltar ao início</button>
                    <button type="button" onclick="window.renderStudentLibraryPage?.()"><i class="fas fa-folder-open"></i> Ver biblioteca</button>
                </div>
            </div>
            <div class="handbook-download-grid">
                ${items.map(item => {
                    const hasUrl = Boolean(item.url);
                    const safeUrl = escapeJsString(item.url || '');
                    return `
                        <article class="${hasUrl ? 'ready' : 'pending'}">
                            <div class="handbook-download-icon"><i class="fas ${item.icon}"></i></div>
                            <div>
                                <span>${hasUrl ? 'Download liberado' : 'Aguardando arquivo'}</span>
                                <strong>${escapeHtml(item.title)}</strong>
                                <p>${escapeHtml(item.description)}</p>
                                <small><i class="fas fa-unlock"></i> Liberado para trial e premium · ${escapeHtml(item.version)}</small>
                            </div>
                            ${hasUrl ? `
                                <button type="button" onclick="window.open('${safeUrl}', '_blank', 'noopener')">
                                    <i class="fas fa-download"></i> Baixar apostila
                                </button>
                            ` : `
                                <button type="button" disabled>
                                    <i class="fas fa-clock"></i> PDF oficial em preparação
                                </button>
                            `}
                        </article>
                    `;
                }).join('')}
            </div>
            <div class="handbook-guidance-card">
                <i class="fas fa-circle-info"></i>
                <div>
                    <strong>Acesso liberado para todos</strong>
                    <p>A apostila fica disponível para alunos em trial e premium. Se o download não iniciar, abra novamente em uma conexão estável.</p>
                </div>
            </div>
        </section>
    `);
    updateBreadcrumbs('Apostilas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.renderOperationalGlossaryPage = function() {
    setCurrentModuleId(null);
    document.getElementById('module-nav')?.classList.add('hidden');
    setPageHtml(`
        <section class="student-page-shell">
            <div class="student-page-hero glossary-hero">
                <span><i class="fas fa-book-medical"></i> Glossário operacional</span>
                <h2>Termos técnicos explicados de forma simples</h2>
                <p>Consulte rapidamente siglas, procedimentos e conceitos usados nas aulas, simulados e na prática profissional.</p>
                <div class="student-page-hero-actions">
                    <button type="button" onclick="window.renderStudentLibraryPage?.()"><i class="fas fa-folder-open"></i> Ver biblioteca</button>
                    <button type="button" onclick="window.goToStudentHome?.()"><i class="fas fa-home"></i> Início</button>
                </div>
            </div>
            <div class="student-glossary-grid">
                ${operationalGlossaryItems.map(item => `
                    <article class="student-glossary-card">
                        <div class="student-glossary-icon"><i class="fas ${item.icon}"></i></div>
                        <div>
                            <span>${escapeHtml(item.tag)}</span>
                            <strong>${escapeHtml(item.term)}</strong>
                            <p>${escapeHtml(item.description)}</p>
                            <small>${escapeHtml(item.example)}</small>
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `);
    updateBreadcrumbs('Glossário');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.renderStudentProfilePage = function(profileUserData = getCurrentUserData()) {
    const profileData = profileUserData || getCurrentUserData();
    const isAdminPreview = profileData?.__adminPreview === true && isInstructorAdmin(getCurrentUserData());
    const stats = getLearningStats(profileData, profileData?.completedModules || getCompletedModules());
    const access = getAccessStatus(profileData);
    const userName = profileData?.name || 'Aluno';
    const userInitial = escapeHtml(userName).slice(0, 1).toUpperCase();
    const courseLabel = profileData?.courseType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil e Brigadista';
    const favorites = getFavoriteModules().filter(id => moduleContent[id]);
    const savedPhoto = isAdminPreview ? '' : (localStorage.getItem('user_profile_pic') || '');
    const academicRecord = profileData?.academicRecord || null;
    const academicStatusLabel = academicRecord
        ? deriveAcademicSituation(academicRecord.average || calculateAcademicAverage(academicRecord.subjects), academicRecord.situation || 'Em análise')
        : 'Aguardando lançamento';
    const academicHtml = renderStudentAcademicHtml(academicRecord);
    const formatCpf = (value) => {
        const digits = onlyDigits(value);
        return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : (value || 'Não informado');
    };
    const formatPhone = (value) => {
        const digits = onlyDigits(value);
        if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        return value || 'Não informado';
    };
    const photoButtonAttrs = isAdminPreview
        ? 'disabled title="A foto local só aparece no dispositivo do aluno"'
        : 'onclick="document.getElementById(\'student-profile-photo-input\')?.click()" title="Alterar foto do perfil"';
    const photoActionAttrs = isAdminPreview
        ? 'disabled title="A foto local só pode ser alterada pelo aluno no dispositivo dele"'
        : 'onclick="document.getElementById(\'student-profile-photo-input\')?.click()"';
    setCurrentModuleId(null);
    document.getElementById('module-nav')?.classList.add('hidden');
    setPageHtml(`
        <section class="student-page-shell">
            ${isAdminPreview ? `
                <div class="admin-student-preview-banner">
                    <div>
                        <span><i class="fas fa-eye"></i> Visão do aluno</span>
                        <strong>Você está conferindo o perfil de ${escapeHtml(userName)}</strong>
                        <p>Essa visualização não troca seu login de administrador.</p>
                    </div>
                    <button type="button" onclick="window.openAdminPanel?.()"><i class="fas fa-arrow-left"></i> Voltar ao painel</button>
                </div>
            ` : ''}
            <div class="student-profile-header">
                <div class="student-profile-photo-wrap">
                    <button type="button" class="student-profile-photo" ${photoButtonAttrs}>
                        <img id="student-profile-photo-img" src="${escapeHtml(savedPhoto)}" alt="Foto do aluno" class="${savedPhoto ? '' : 'hidden'}">
                        <span id="student-profile-photo-initial" class="${savedPhoto ? 'hidden' : ''}">${userInitial}</span>
                        <i class="fas fa-camera"></i>
                    </button>
                    <input type="file" id="student-profile-photo-input" class="hidden" accept="image/*" onchange="window.updateProfilePic(this)">
                </div>
                <div class="student-profile-heading">
                    <span>Perfil do aluno</span>
                    <h2>${escapeHtml(userName)}</h2>
                    <p>${escapeHtml(courseLabel)} • ${escapeHtml(profileData?.company || 'Turma não informada')}</p>
                    <button type="button" class="student-profile-photo-action" ${photoActionAttrs}>
                        <i class="fas fa-image"></i> Alterar foto
                    </button>
                    <small><i class="fas fa-lock"></i> A foto fica salva apenas neste dispositivo.</small>
                </div>
            </div>
            <div class="student-profile-details-grid">
                <article><i class="fas fa-user"></i><span>Nome completo</span><strong>${escapeHtml(userName)}</strong></article>
                <article><i class="fas fa-envelope"></i><span>E-mail cadastrado</span><strong>${escapeHtml(profileData?.email || 'Não informado')}</strong></article>
                <article><i class="fas fa-id-card"></i><span>CPF</span><strong>${escapeHtml(formatCpf(profileData?.cpf))}</strong></article>
                <article><i class="fas fa-phone"></i><span>Telefone</span><strong>${escapeHtml(formatPhone(profileData?.phone))}</strong></article>
            </div>
            <div class="student-profile-grid">
                <article><span>Status</span><strong>${escapeHtml(profileData?.status || 'trial').toUpperCase()}</strong><small>${access.label}</small></article>
                <article><span>Progresso</span><strong>${stats.percent}%</strong><small>${stats.doneCount}/${stats.total} módulos</small></article>
                <article><span>Conquistas</span><strong>${stats.achievementCount}</strong><small>áreas desbloqueadas</small></article>
                <article><span>Favoritos</span><strong>${favorites.length}</strong><small>itens salvos</small></article>
            </div>
            ${getStudentGamificationProfileHtml(stats)}
            ${getStudentCompetencyAchievementsHtml(stats)}
            <div class="academic-status-panel">
                <div class="academic-status-head">
                    <div>
                        <span><i class="fas fa-graduation-cap"></i> Situação acadêmica</span>
                        <h3>Notas de prova por matéria</h3>
                        <p>Dados oficiais importados da planilha e exibidos apenas para o aluno vinculado por CPF.</p>
                    </div>
                    <strong><i class="fas fa-check-circle"></i> ${escapeHtml(academicStatusLabel)}</strong>
                </div>
                <div class="academic-status-list">
                    ${academicHtml}
                </div>
            </div>
            ${renderStudentCertificatePanel(profileData, stats)}
            <div class="student-hub-panel">
                <div class="student-hub-title">
                    <span><i class="fas fa-clock-rotate-left"></i> Histórico recente</span>
                    <button type="button" onclick="window.openGlobalSearch?.()">Buscar</button>
                </div>
                <ul class="student-history-list">${getHistoryHtml()}</ul>
            </div>
        </section>
    `);
    updateBreadcrumbs('Perfil');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.openGlobalSearch = function() {
    const existing = document.getElementById('global-search-modal');
    if (existing) existing.remove();
    const items = getSearchItems();
    const modal = document.createElement('div');
    modal.id = 'global-search-modal';
    modal.className = 'global-search-modal';
    modal.innerHTML = `
        <div class="global-search-backdrop" data-close-search="true"></div>
        <section class="global-search-panel">
            <header>
                <div>
                    <span><i class="fas fa-search"></i> Busca global</span>
                    <h2>Encontre aulas, ferramentas e materiais</h2>
                </div>
                <button type="button" data-close-search="true"><i class="fas fa-times"></i></button>
            </header>
            <div class="global-search-input-shell">
                <i class="fas fa-magnifying-glass"></i>
                <input id="global-search-input" type="search" placeholder="Buscar por aula, simulado, ferramenta, protocolo...">
            </div>
            <div id="global-search-results" class="global-search-results"></div>
        </section>
    `;
    document.body.appendChild(modal);

    const renderResults = (term = '') => {
        const normalized = normalizeSearchText(term);
        const filtered = items.filter(item => {
            const text = normalizeSearchText(`${item.type} ${item.title} ${item.description}`);
            return !normalized || text.includes(normalized);
        }).slice(0, 20);
        const target = modal.querySelector('#global-search-results');
        target.innerHTML = filtered.length ? filtered.map((item, index) => `
            <button type="button" data-result-index="${index}">
                <i class="${item.icon}"></i>
                <div>
                    <span>${item.type}</span>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${escapeHtml(item.description)}</small>
                </div>
            </button>
        `).join('') : '<p class="global-search-empty">Nada encontrado. Tente outro termo.</p>';
        target.querySelectorAll('[data-result-index]').forEach((button, index) => {
            button.addEventListener('click', () => {
                const item = filtered[index];
                modal.remove();
                if (!item) return;
                if (item.moduleId) loadModuleContent(item.moduleId);
            });
        });
    };

    modal.querySelectorAll('[data-close-search]').forEach(btn => btn.addEventListener('click', () => modal.remove()));
    modal.querySelector('#global-search-input')?.addEventListener('input', e => renderResults(e.target.value));
    renderResults('');
    setTimeout(() => modal.querySelector('#global-search-input')?.focus(), 50);
};


        return {
            getSearchItems,
            getWelcomeContent,
            goToStudentHome,
            renderStudentLibraryPage: window.renderStudentLibraryPage,
            renderCourseHandbooksPage: window.renderCourseHandbooksPage,
            renderOperationalGlossaryPage: window.renderOperationalGlossaryPage,
            renderStudentProfilePage: window.renderStudentProfilePage,
            openGlobalSearch: window.openGlobalSearch
        };
    };
})(window);
