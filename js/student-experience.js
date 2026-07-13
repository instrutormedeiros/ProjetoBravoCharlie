(function(window) {
    'use strict';

    window.PBC_CREATE_STUDENT_EXPERIENCE = function(deps = {}) {
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase().trim());
        const onlyDigits = deps.onlyDigits || (value => String(value || '').replace(/\D/g, ''));
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const toDateFromFirestore = deps.toDateFromFirestore || (value => value ? new Date(value) : null);
        const showAppToast = deps.showAppToast || (() => {});
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const goToHomePage = deps.goToHomePage || (() => {});
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const getCompletedModules = deps.getCompletedModules || (() => []);
        const getNotifiedAchievements = deps.getNotifiedAchievements || (() => []);
        const getCurrentModuleId = deps.getCurrentModuleId || (() => null);
        const getTotalModules = deps.getTotalModules || (() => 0);
        const moduleCategories = deps.moduleCategories || window.moduleCategories || {};
        const moduleContent = deps.moduleContent || window.moduleContent || {};
        const moduleMediaAssets = deps.moduleMediaAssets || window.PBC_MODULE_MEDIA_ASSETS || {};
        const operationalGlossaryItems = deps.operationalGlossaryItems || window.PBC_OPERATIONAL_GLOSSARY_ITEMS || [];
        const premiumLibraryCategories = deps.premiumLibraryCategories || window.PBC_PREMIUM_LIBRARY_CATEGORIES || [];
        const courseHandbookDownloads = deps.courseHandbookDownloads || window.PBC_COURSE_HANDBOOK_DOWNLOADS || [];
        const libraryManager = deps.libraryManager || window.PBC_CREATE_LIBRARY_MANAGER?.({
            moduleContent,
            moduleMediaAssets,
            getCurrentUserData,
            isInstructorAdmin,
            premiumLibraryCategories,
            courseHandbookDownloads
        });
        const feedbackManager = deps.feedbackManager || window.PBC_CREATE_FEEDBACK_MANAGER?.({
            escapeHtml,
            showAppToast,
            getCurrentUserData
        });

const OPTIONAL_PROGRESS_CATEGORIES = ['simulados', 'bonus'];

function getVisibleModuleIds(userDataOverride = getCurrentUserData(), options = {}) {
    const ids = [];
    const includeOptional = options.includeOptional === true;
    const userType = userDataOverride ? (userDataOverride.courseType || 'BC') : 'BC';
    const isManager = userDataOverride ? (userDataOverride.isAdmin || userDataOverride.courseType === 'GESTOR') : false;

    for (const key in moduleCategories) {
        if (!includeOptional && OPTIONAL_PROGRESS_CATEGORIES.includes(key)) continue;
        const cat = moduleCategories[key];
        const prefix = cat.isSP ? 'sp_module' : 'module';
        for (let i = cat.range[0]; i <= cat.range[1]; i++) {
            const id = `${prefix}${i}`;
            const module = moduleContent[id];
            if (!module) continue;
            const isSpContent = id.startsWith('sp_');
            if (!isManager) {
                if (userType === 'BC' && isSpContent) continue;
                if (userType === 'SP' && !isSpContent) continue;
            }
            if (!ids.includes(id)) ids.push(id);
        }
    }
    return ids;
}

function getLearningStats(userDataOverride = getCurrentUserData(), completedOverride = getCompletedModules()) {
    const safeCompleted = Array.isArray(completedOverride) ? completedOverride : [];
    const visibleIds = getVisibleModuleIds(userDataOverride);
    const allVisibleIds = getVisibleModuleIds(userDataOverride, { includeOptional: true });
    const doneCount = visibleIds.filter(id => safeCompleted.includes(id)).length;
    const total = visibleIds.length || getTotalModules() || 1;
    const percent = Math.min(100, Math.round((doneCount / total) * 100));
    const lastModuleId = localStorage.getItem('gateBombeiroLastModule');
    const nextModuleId = visibleIds.find(id => !safeCompleted.includes(id)) || visibleIds[0] || 'module1';
    const lastModule = lastModuleId && moduleContent[lastModuleId] ? moduleContent[lastModuleId] : null;
    const nextModule = nextModuleId && moduleContent[nextModuleId] ? moduleContent[nextModuleId] : null;

    return {
        visibleIds,
        allVisibleIds,
        doneCount,
        total,
        percent,
        lastModuleId,
        nextModuleId,
        lastModule,
        nextModule,
        remaining: Math.max(total - doneCount, 0),
        achievementCount: getNotifiedAchievements().length
    };
}

function getStoredJson(key, fallback) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        return parsed ?? fallback;
    } catch (error) {
        return fallback;
    }
}

function setStoredJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

const GAMIFICATION_STORAGE_KEY = 'pbc_gamification_v1';
const GAMIFICATION_ACTION_XP = {
    module_open: 10,
    module_complete: 120,
    favorite: 12,
    handbook_download: 25,
    library_open: 15,
    nps: 30,
    simulado_finish: 80
};

const COMPETENCY_META = {
    rh: {
        title: 'Comunicação e postura',
        badge: 'Excelente Comunicador',
        icon: 'fas fa-comments',
        color: '#f97316',
        description: 'Relacionamento, percepção social, comunicação e postura profissional.'
    },
    legislacao: {
        title: 'Normas e legislação',
        badge: 'Mestre em Leis',
        icon: 'fas fa-scale-balanced',
        color: '#d97706',
        description: 'Leitura de normas, responsabilidades da brigada e fundamentos legais.'
    },
    salvamento: {
        title: 'Resgate e salvamento',
        badge: 'Operador de Resgate',
        icon: 'fas fa-life-ring',
        color: '#0284c7',
        description: 'Busca, reconhecimento, evacuação, rádio e tomada de decisão em salvamento.'
    },
    pci: {
        title: 'Prevenção e combate',
        badge: 'Dominador do PCI',
        icon: 'fas fa-fire-extinguisher',
        color: '#dc2626',
        description: 'Classes de incêndio, extintores, hidrantes, abandono e prevenção operacional.'
    },
    aph_novo: {
        title: 'Atendimento à vítima',
        badge: 'Herói do Atendimento',
        icon: 'fas fa-kit-medical',
        color: '#16a34a',
        description: 'Avaliação da vítima, protocolos, emergências clínicas e trauma.'
    },
    nr33: {
        title: 'Espaço confinado',
        badge: 'Especialista em NR 33',
        icon: 'fas fa-person-booth',
        color: '#0d9488',
        description: 'Reconhecimento de riscos, segurança e procedimentos em espaço confinado.'
    },
    nr35: {
        title: 'Trabalho em altura',
        badge: 'Especialista em NR 35',
        icon: 'fas fa-helmet-safety',
        color: '#4f46e5',
        description: 'Ancoragem, fases táticas, riscos e fundamentos do trabalho em altura.'
    },
    simulados: {
        title: 'Provas e simulados',
        badge: 'Mestre dos Testes',
        icon: 'fas fa-clipboard-check',
        color: '#7c3aed',
        description: 'Prática por matéria, revisão e preparação para avaliações.'
    },
    seguranca_patrimonial: {
        title: 'Segurança patrimonial',
        badge: 'Guardião da Segurança',
        icon: 'fas fa-shield-halved',
        color: '#0f766e',
        description: 'Controle de acesso, postura, vigilância e proteção de ativos.'
    }
};

function getTodayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function getMonthKey(date = new Date()) {
    return date.toISOString().slice(0, 7);
}

function getStudentGamificationProfile() {
    const profile = getStoredJson(GAMIFICATION_STORAGE_KEY, {});
    return {
        bonusXp: Number(profile.bonusXp || 0),
        bestStreak: Number(profile.bestStreak || 0),
        streak: Number(profile.streak || 0),
        lastActiveDay: profile.lastActiveDay || '',
        actions: profile.actions && typeof profile.actions === 'object' ? profile.actions : {},
        dailyXp: profile.dailyXp && typeof profile.dailyXp === 'object' ? profile.dailyXp : {},
        monthlyXp: profile.monthlyXp && typeof profile.monthlyXp === 'object' ? profile.monthlyXp : {}
    };
}

function saveStudentGamificationProfile(profile) {
    setStoredJson(GAMIFICATION_STORAGE_KEY, profile);
}

function updateStudyStreak(profile, now = new Date()) {
    const today = getTodayKey(now);
    if (profile.lastActiveDay === today) return profile;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    profile.streak = profile.lastActiveDay === getTodayKey(yesterday) ? Number(profile.streak || 0) + 1 : 1;
    profile.bestStreak = Math.max(Number(profile.bestStreak || 0), profile.streak);
    profile.lastActiveDay = today;
    return profile;
}

function recordGamificationAction(type, label, moduleId = '') {
    const xpValue = GAMIFICATION_ACTION_XP[type] || 0;
    if (!xpValue) return null;

    const profile = updateStudyStreak(getStudentGamificationProfile());
    const today = getTodayKey();
    const month = getMonthKey();
    const actionKey = `${today}:${type}:${moduleId || normalizeSearchText(label) || 'geral'}`;
    if (profile.actions[actionKey]) {
        saveStudentGamificationProfile(profile);
        return { awarded: false, xp: 0, streak: profile.streak };
    }

    profile.actions[actionKey] = true;
    profile.bonusXp += xpValue;
    profile.dailyXp[today] = Number(profile.dailyXp[today] || 0) + xpValue;
    profile.monthlyXp[month] = Number(profile.monthlyXp[month] || 0) + xpValue;
    saveStudentGamificationProfile(profile);
    return { awarded: true, xp: xpValue, streak: profile.streak };
}

function getFavoriteModules() {
    return getStoredJson('pbc_favorite_modules_v1', []);
}

function isFavoriteModule(id) {
    return getFavoriteModules().includes(id);
}

window.toggleFavoriteModule = function(id) {
    if (!id || !moduleContent[id]) return;
    let favorites = getFavoriteModules();
    const isFav = favorites.includes(id);
    favorites = isFav ? favorites.filter(item => item !== id) : [...favorites, id];
    setStoredJson('pbc_favorite_modules_v1', favorites);
    const btn = document.querySelector(`[data-favorite-module="${id}"]`);
    if (btn) {
        btn.classList.toggle('active', !isFav);
        btn.innerHTML = `<i class="${!isFav ? 'fas' : 'far'} fa-star"></i> ${!isFav ? 'Favorito' : 'Favoritar'}`;
    }
    showAppToast(!isFav ? 'Adicionado aos favoritos' : 'Removido dos favoritos', moduleContent[id].title, 'success');
    if (!isFav) recordGamificationAction('favorite', moduleContent[id].title, id);
    if (!getCurrentModuleId()) goToHomePage();
};

function recordStudyEvent(type, label, moduleId = getCurrentModuleId()) {
    const history = getStoredJson('pbc_study_history_v1', []);
    const event = {
        type,
        label,
        moduleId,
        at: new Date().toISOString()
    };
    setStoredJson('pbc_study_history_v1', [event, ...history.filter(item => item.label !== label || item.type !== type)].slice(0, 20));
    recordGamificationAction(type, label, moduleId);
}

function getStudyHistory() {
    return getStoredJson('pbc_study_history_v1', []);
}

function formatShortDate(value) {
    const date = toDateFromFirestore(value);
    if (!date) return 'Não informado';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getAccessStatus(userDataOverride = getCurrentUserData()) {
    const date = toDateFromFirestore(userDataOverride?.acesso_ate);
    if (!date) return { label: 'Acesso não informado', tone: 'neutral', detail: 'Confirme seu status com a coordenação.' };
    const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (userDataOverride?.status === 'premium') {
        return { label: `Premium até ${formatShortDate(date)}`, tone: 'ok', detail: 'Seu acesso está liberado.' };
    }
    if (diffDays < 0) return { label: 'Acesso vencido', tone: 'danger', detail: 'Regularize para continuar estudando.' };
    if (diffDays <= 5) return { label: `${diffDays} dia${diffDays === 1 ? '' : 's'} restantes`, tone: 'warn', detail: 'Seu período termina em breve.' };
    return { label: `${diffDays} dias de acesso`, tone: 'info', detail: `Válido até ${formatShortDate(date)}.` };
}

function getImportantNoticeHtml() {
    const messages = Array.isArray(getCurrentUserData()?.inboxMessages) ? getCurrentUserData().inboxMessages : [];
    const readMap = getCurrentUserData()?.readMessages || {};
    const unreadCount = messages.filter(item => item?.id && !readMap[item.id]).length;
    return `
        <button type="button" class="student-notice-card" onclick="window.openStudentNotices?.()">
            <span><i class="fas fa-bell"></i> Avisos importantes ${unreadCount ? `<b>${unreadCount}</b>` : ''}</span>
            <strong>${unreadCount ? `${unreadCount} mensagem${unreadCount === 1 ? '' : 's'} nova${unreadCount === 1 ? '' : 's'}` : 'Fique atento às oportunidades e comunicados'}</strong>
            <small>Vagas, recados e orientações da coordenação aparecem diretamente aqui.</small>
        </button>
    `;
}

window.openStudentNotices = function() {
    const oldModal = document.getElementById('student-notices-modal');
    if (oldModal) oldModal.remove();

    const messages = (Array.isArray(getCurrentUserData()?.inboxMessages) ? getCurrentUserData().inboxMessages : [])
        .filter(item => item && item.title && item.message)
        .sort((a, b) => new Date(b.createdAtLocal || 0) - new Date(a.createdAtLocal || 0));
    const readMap = getCurrentUserData()?.readMessages || {};
    const listHtml = messages.length
        ? messages.map(item => {
            const read = !!readMap[item.id];
            return `
                <article class="student-message-card ${read ? 'read' : 'unread'}">
                    <div class="student-message-top">
                        <span><i class="fas ${read ? 'fa-envelope-open' : 'fa-envelope'}"></i> ${read ? 'Lido' : 'Novo aviso'}</span>
                        <small>${formatShortDate(item.createdAtLocal)}</small>
                    </div>
                    <h4>${escapeHtml(item.title)}</h4>
                    <p>${escapeHtml(item.message).replace(/\n/g, '<br>')}</p>
                    <div class="student-message-meta">
                        <span><i class="fas fa-user-tie"></i> ${escapeHtml(item.createdByName || 'Instrutor Medeiros')}</span>
                        ${!read ? `<button onclick="markStudentMessageRead('${escapeJsString(item.id)}')"><i class="fas fa-check"></i> Marcar como lida</button>` : ''}
                    </div>
                </article>
            `;
        }).join('')
        : `
            <div class="student-message-empty">
                <i class="fas fa-bell-slash"></i>
                <strong>Nenhum aviso por enquanto</strong>
                <p>Quando a coordenação enviar vagas, oportunidades ou recados, eles aparecerão aqui.</p>
            </div>
        `;

    const modal = document.createElement('div');
    modal.id = 'student-notices-modal';
    modal.className = 'student-notices-modal';
    modal.innerHTML = `
        <div class="student-notices-backdrop" data-close-student-notices="true"></div>
        <section class="student-notices-panel" role="dialog" aria-modal="true" aria-label="Avisos importantes">
            <header>
                <div>
                    <span><i class="fas fa-bullhorn"></i> Central de avisos</span>
                    <h3>Mensagens da coordenação</h3>
                </div>
                <button type="button" data-close-student-notices="true" aria-label="Fechar avisos"><i class="fas fa-times"></i></button>
            </header>
            <div class="student-notices-list">${listHtml}</div>
        </section>
    `;
    modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-close-student-notices="true"]')) modal.remove();
    });
    document.body.appendChild(modal);
};

window.markStudentMessageRead = async function(messageId) {
    if (!messageId || !getCurrentUserData()?.uid) return;
    getCurrentUserData().readMessages = { ...(getCurrentUserData().readMessages || {}), [messageId]: new Date().toISOString() };
    try {
        const db = window.__fbDB || window.fbDB;
        if (db && window.firebase) {
            await db.collection('users').doc(getCurrentUserData().uid).update({
                [`readMessages.${messageId}`]: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        showAppToast('Aviso marcado como lido', 'A mensagem continua disponível no seu perfil.', 'success');
    } catch (error) {
        console.warn('Não foi possível marcar aviso como lido:', error);
    }
    window.openStudentNotices();
};

function getJourneyStepHtml(stats) {
    const steps = [
        { key: 'start', label: 'Início', icon: 'fa-flag-checkered', done: stats.doneCount > 0 },
        { key: 'content', label: 'Conteúdo', icon: 'fa-book-open', done: stats.percent >= 35 },
        { key: 'exercise', label: 'Exercícios', icon: 'fa-pencil-alt', done: stats.percent >= 60 },
        { key: 'simulado', label: 'Simulados', icon: 'fa-clipboard-check', done: stats.percent >= 85 },
        { key: 'finish', label: 'Finalização', icon: 'fa-award', done: stats.percent >= 100 }
    ];
    return `
        <div class="student-journey-line">
            ${steps.map(step => `
                <div class="${step.done ? 'done' : ''}">
                    <i class="fas ${step.icon}"></i>
                    <span>${step.label}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function getFavoriteCardsHtml() {
    const favorites = getFavoriteModules().filter(id => moduleContent[id]);
    if (!favorites.length) {
        return `
            <div class="student-empty-favorites">
                <i class="far fa-star"></i>
                <span>Você ainda não salvou favoritos. Abra uma aula e toque em Favoritar.</span>
            </div>
        `;
    }
    return favorites.slice(0, 4).map(id => `
        <button type="button" data-open-module="${id}">
            <i class="${moduleContent[id].iconClass}"></i>
            <span>${moduleContent[id].title}</span>
        </button>
    `).join('');
}

function getHistoryHtml() {
    const history = getStudyHistory();
    if (!history.length) return '<p class="student-history-empty">Seu histórico aparece aqui conforme você estuda.</p>';
    return history.slice(0, 4).map(item => {
        const date = new Date(item.at);
        const when = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return `<li><i class="fas fa-clock-rotate-left"></i><span>${escapeHtml(item.label)}</span><small>${when}</small></li>`;
    }).join('');
}

function getLibraryItems() {
    return libraryManager?.getLibraryItems?.() || [];
}

function getVisibleHandbooks() {
    return libraryManager?.getVisibleHandbooks?.(getCurrentUserData()) || [];
}

function getStudentNpsHtml() {
    return feedbackManager?.getStudentNpsHtml?.() || '';
}

function getStudentMissionsHtml(stats) {
    const game = getStudentGamificationStats(stats);
    const missions = [
        {
            icon: 'fa-play-circle',
            title: 'Continuar a próxima aula',
            description: 'Mantenha o ritmo e avance no conteúdo principal.',
            action: 'Abrir aula',
            xp: '+10 XP',
            moduleId: stats.nextModuleId,
            done: stats.percent >= 100
        },
        {
            icon: 'fa-pencil-alt',
            title: 'Praticar exercícios',
            description: 'Fixe a matéria logo depois da leitura.',
            action: 'Praticar agora',
            xp: '+80 XP',
            moduleId: stats.nextModuleId,
            done: false
        },
        {
            icon: 'fa-folder-open',
            title: 'Revisar material premium',
            description: 'Use vídeos, podcasts, slides e infográficos para reforçar.',
            action: 'Abrir biblioteca',
            xp: '+15 XP',
            library: true,
            done: false
        }
    ];

    return `
        <section class="student-missions-panel">
            <div class="student-missions-head">
                <span><i class="fas fa-bullseye"></i> Missões do dia</span>
                <strong>${game.dailyXp.toLocaleString('pt-BR')} XP conquistados hoje</strong>
            </div>
            <div class="student-missions-grid">
                ${missions.map(mission => `
                    <article class="${mission.done ? 'done' : ''}">
                        <i class="fas ${mission.done ? 'fa-check-circle' : mission.icon}"></i>
                        <div>
                            <strong>${mission.done ? 'Jornada principal concluída' : mission.title}</strong>
                            <p>${mission.done ? 'Use a plataforma para carreira, revisão e oportunidades.' : mission.description}</p>
                            <small class="student-mission-xp">${mission.done ? 'Bônus concluído' : mission.xp}</small>
                        </div>
                        <button type="button" ${mission.library ? 'onclick="window.renderStudentLibraryPage?.()"' : `data-open-module="${mission.moduleId || 'module1'}"`}>
                            ${mission.done ? 'Ver ferramentas' : mission.action}
                        </button>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

function getOperationalRank(level) {
    if (level >= 10) return 'Comandante Operacional';
    if (level >= 8) return 'Líder de Brigada';
    if (level >= 6) return 'Especialista Operacional';
    if (level >= 4) return 'Brigadista Avançado';
    if (level >= 2) return 'Operacional em Treinamento';
    return 'Aluno em Evolução';
}

function getMonthlyRankingLabel(monthlyXp) {
    if (monthlyXp >= 1500) return 'Top 5% da turma';
    if (monthlyXp >= 900) return 'Top 15% da turma';
    if (monthlyXp >= 450) return 'Subindo no ranking';
    if (monthlyXp > 0) return 'Primeiros pontos';
    return 'Comece hoje';
}

function getStudentGamificationStats(stats) {
    const moduleXp = stats.doneCount * 120;
    const achievementXp = stats.achievementCount * 80;
    const completionBonus = stats.percent >= 100 ? 750 : 0;
    const profile = updateStudyStreak(getStudentGamificationProfile());
    saveStudentGamificationProfile(profile);
    const today = getTodayKey();
    const month = getMonthKey();
    const bonusXp = Number(profile.bonusXp || 0);
    const dailyXp = Number(profile.dailyXp[today] || 0);
    const monthlyXp = Number(profile.monthlyXp[month] || 0);
    const xp = moduleXp + achievementXp + completionBonus + bonusXp;
    const level = Math.max(1, Math.floor(xp / 500) + 1);
    const currentLevelBase = (level - 1) * 500;
    const nextLevelBase = level * 500;
    const levelProgress = Math.min(100, Math.round(((xp - currentLevelBase) / 500) * 100));
    return {
        xp,
        moduleXp,
        achievementXp,
        bonusXp,
        dailyXp,
        monthlyXp,
        streak: Number(profile.streak || 0),
        bestStreak: Number(profile.bestStreak || 0),
        level,
        rank: getOperationalRank(level),
        monthlyRank: getMonthlyRankingLabel(monthlyXp),
        nextXp: nextLevelBase,
        remainingXp: Math.max(nextLevelBase - xp, 0),
        levelProgress
    };
}

function getOperationalLevelHtml(stats) {
    const game = getStudentGamificationStats(stats);
    return `
        <section class="student-level-panel">
            <div class="student-level-badge">
                <i class="fas fa-ranking-star"></i>
                <span>Nível ${game.level}</span>
            </div>
            <div class="student-level-main">
                <span><i class="fas fa-bolt"></i> Evolução operacional</span>
                <h3>${game.rank}</h3>
                <p>${game.xp.toLocaleString('pt-BR')} XP acumulados. Faltam ${game.remainingXp.toLocaleString('pt-BR')} XP para o próximo nível.</p>
                <div class="student-level-progress" style="--level-progress:${game.levelProgress}%">
                    <strong>${game.levelProgress}%</strong>
                </div>
            </div>
            <div class="student-level-rewards">
                <article><i class="fas fa-fire-flame-curved"></i><strong>${game.streak}</strong><span>Sequência</span></article>
                <article><i class="fas fa-bolt"></i><strong>${game.dailyXp}</strong><span>XP hoje</span></article>
                <article><i class="fas fa-ranking-star"></i><strong>${game.monthlyRank}</strong><span>Ranking mensal</span></article>
                <article><i class="fas fa-medal"></i><strong>${stats.achievementCount}</strong><span>Conquistas</span></article>
            </div>
        </section>
    `;
}

function getStudentGamificationProfileHtml(stats) {
    const game = getStudentGamificationStats(stats);
    return `
        <section class="student-gamification-profile">
            <div class="student-gamification-copy">
                <span><i class="fas fa-trophy"></i> Jornada gamificada</span>
                <h3>Nível ${game.level} • ${game.rank}</h3>
                <p>Ganhe XP estudando, concluindo aulas, usando materiais e mantendo sequência. Seu progresso vira conquistas reais dentro da plataforma.</p>
                <div class="student-level-progress" style="--level-progress:${game.levelProgress}%">
                    <strong>${game.levelProgress}%</strong>
                </div>
            </div>
            <div class="student-gamification-grid">
                <article><i class="fas fa-bolt"></i><strong>${game.xp.toLocaleString('pt-BR')}</strong><span>XP total</span></article>
                <article><i class="fas fa-calendar-day"></i><strong>${game.dailyXp.toLocaleString('pt-BR')}</strong><span>XP hoje</span></article>
                <article><i class="fas fa-fire"></i><strong>${game.streak}</strong><span>Dias em sequência</span></article>
                <article><i class="fas fa-ranking-star"></i><strong>${game.monthlyRank}</strong><span>Ranking mensal</span></article>
            </div>
        </section>
    `;
}

function getCompetencyLevel(percent) {
    if (percent >= 100) return { label: 'Dominada', tone: 'mastered', icon: 'fa-trophy' };
    if (percent >= 70) return { label: 'Avançada', tone: 'advanced', icon: 'fa-medal' };
    if (percent >= 35) return { label: 'Em evolução', tone: 'progress', icon: 'fa-arrow-trend-up' };
    return { label: 'Iniciante', tone: 'starter', icon: 'fa-seedling' };
}

function shouldShowCompetency(category, userData = getCurrentUserData()) {
    const userType = userData ? (userData.courseType || 'BC') : 'BC';
    const isManager = userData ? (userData.isAdmin || userData.courseType === 'GESTOR') : false;
    if (isManager) return true;
    if (userType === 'BC' && category.isSP) return false;
    if (userType === 'SP' && !category.isSP) return false;
    return true;
}

function getStudentCompetencies(userData = getCurrentUserData(), completed = getCompletedModules()) {
    const safeCompleted = Array.isArray(completed) ? completed : [];
    return Object.entries(moduleCategories)
        .filter(([key, category]) => shouldShowCompetency(category, userData) && key !== 'bonus')
        .map(([key, category]) => {
            const prefix = category.isSP ? 'sp_module' : 'module';
            const ids = [];
            for (let i = category.range[0]; i <= category.range[1]; i++) {
                const id = `${prefix}${i}`;
                if (moduleContent[id]) ids.push(id);
            }
            const done = ids.filter(id => safeCompleted.includes(id)).length;
            const total = ids.length;
            const percent = total ? Math.round((done / total) * 100) : 0;
            const meta = COMPETENCY_META[key] || {
                title: category.title,
                badge: category.achievementTitle,
                icon: category.icon,
                color: '#0b63ce',
                description: 'Competência vinculada à sua jornada de formação.'
            };
            return {
                key,
                ...meta,
                categoryTitle: category.title,
                done,
                total,
                percent,
                level: getCompetencyLevel(percent)
            };
        })
        .filter(item => item.total > 0)
        .sort((a, b) => b.percent - a.percent || a.title.localeCompare(b.title));
}

function getStudentCompetencyAchievementsHtml(stats) {
    const competencies = getStudentCompetencies();
    const mastered = competencies.filter(item => item.percent >= 100).length;
    const inProgress = competencies.filter(item => item.percent > 0 && item.percent < 100).length;
    const highlighted = competencies.slice(0, 8);
    return `
        <section class="student-competency-panel">
            <div class="student-competency-head">
                <div>
                    <span><i class="fas fa-award"></i> Conquistas por competência</span>
                    <h3>Seu mapa de domínio operacional</h3>
                    <p>As medalhas agora mostram competência real por área, não apenas aulas concluídas.</p>
                </div>
                <div class="student-competency-summary">
                    <strong>${mastered}</strong>
                    <span>dominada${mastered === 1 ? '' : 's'}</span>
                    <small>${inProgress} em evolução</small>
                </div>
            </div>
            <div class="student-competency-grid">
                ${highlighted.map(item => `
                    <article class="${item.level.tone}" style="--competency-color:${item.color}; --competency-progress:${item.percent}%">
                        <div class="student-competency-icon"><i class="${item.icon}"></i></div>
                        <div class="student-competency-main">
                            <span>${item.categoryTitle}</span>
                            <strong>${item.badge}</strong>
                            <p>${item.description}</p>
                            <div class="student-competency-progress"><i></i></div>
                        </div>
                        <div class="student-competency-status">
                            <i class="fas ${item.level.icon}"></i>
                            <strong>${item.percent}%</strong>
                            <span>${item.level.label}</span>
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

function getStudentSmartDashboardHtml(stats, access, continueId, continueTitle, nextTitle) {
    const handbook = getVisibleHandbooks()[0];
    const handbookReady = Boolean(handbook?.url);
    return `
        <section class="student-smart-dashboard">
            <article class="primary">
                <span><i class="fas fa-compass"></i> Painel de comando</span>
                <h3>${continueTitle}</h3>
                <p>Seu caminho está pronto: continue a aula, pratique e baixe os materiais de apoio sem perder tempo.</p>
                <div>
                    <button type="button" data-open-module="${continueId}"><i class="fas fa-play"></i> Continuar agora</button>
                    <button type="button" data-open-module="${stats.nextModuleId}"><i class="fas fa-pen"></i> Próximo exercício</button>
                </div>
            </article>
            <article>
                <i class="fas fa-book-open-reader"></i>
                <span>Apostila liberada</span>
                <strong>${handbookReady ? 'Download disponível' : 'Aguardando PDF'}</strong>
                <p>Disponível para alunos trial e premium.</p>
                <button type="button" onclick="window.renderCourseHandbooksPage?.()">Abrir apostilas</button>
            </article>
            <article>
                <i class="fas fa-location-arrow"></i>
                <span>Próximo passo</span>
                <strong>${nextTitle}</strong>
                <p>Finalize a leitura e pratique logo em seguida.</p>
                <button type="button" data-open-module="${stats.nextModuleId}">Abrir próximo</button>
            </article>
            <article class="${access.tone}">
                <i class="fas fa-id-badge"></i>
                <span>Status de acesso</span>
                <strong>${access.label}</strong>
                <p>${access.detail}</p>
                <button type="button" id="student-smart-payment">Ver planos</button>
            </article>
        </section>
    `;
}


        return {
            OPTIONAL_PROGRESS_CATEGORIES,
            getVisibleModuleIds,
            getLearningStats,
            getStoredJson,
            setStoredJson,
            getFavoriteModules,
            isFavoriteModule,
            recordStudyEvent,
            getStudyHistory,
            formatShortDate,
            getAccessStatus,
            getImportantNoticeHtml,
            getJourneyStepHtml,
            getFavoriteCardsHtml,
            getHistoryHtml,
            getLibraryItems,
            operationalGlossaryItems,
            premiumLibraryCategories,
            courseHandbookDownloads,
            getVisibleHandbooks,
            getStudentNpsHtml,
            getStudentMissionsHtml,
            getStudentGamificationStats,
            getOperationalLevelHtml,
            getStudentGamificationProfileHtml,
            getStudentCompetencies,
            getStudentCompetencyAchievementsHtml,
            getStudentSmartDashboardHtml
        };
    };
})(window);
