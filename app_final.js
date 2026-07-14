/* === ARQUIVO app_final.js (VERSÃO FINAL V10.1 - CORREÇÃO TOTAL MODULES) === */

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('auth-restoring');
    document.body.setAttribute('data-auth-restoring', 'true');
    window.setTimeout(() => {
        if (document.body.classList.contains('auth-restoring')) {
            document.body.classList.remove('auth-restoring');
            document.body.removeAttribute('data-auth-restoring');
        }
    }, 2800);
    // ============================================================
// SISTEMA TÁTICO DE BUSCA EM TEMPO REAL (BLINDADO)
// ============================================================
const {
    normalizeSearchText,
    onlyDigits,
    escapeHtml,
    escapeJsString,
    toDateFromFirestore,
    formatAdminDateTime,
    getAdminCreatedDateInfo,
    userMatchesSearch
} = window.PBC_APP_UTILS;

const {
    ACADEMIC_GRADES_SHEET_ID,
    ACADEMIC_GRADES_CSV_URL,
    ACADEMIC_GRADE_SUBJECTS,
    normalizeAcademicHeader,
    normalizeAcademicName,
    normalizeAcademicCompany,
    inferAcademicCompanyFromFileName,
    getAcademicRowLabel,
    parseTransposedAcademicRows,
    parseVerticalAcademicRows,
    parseAcademicGridRows,
    parseAcademicCsv,
    getAcademicCell,
    parseAcademicGradeValue,
    calculateAcademicAverage,
    buildAcademicRecordFromRow,
    getAcademicRecordSignature,
    getNameTokens,
    namesLikelyMatch,
    getAcademicNameCandidates,
    findMatchingUserForAcademicRecord,
    fetchAcademicRecordsFromSheet,
    readAcademicRecordsFromFile
} = window.PBC_CREATE_ACADEMIC_CORE({ normalizeSearchText, onlyDigits });
function setAcademicImportReport(type, title, lines = []) {
    const report = document.getElementById('academic-import-grades-report') || document.getElementById('admin-import-grades-report');
    if (!report) return;
    report.className = `admin-import-grades-report ${type || 'info'}`;
    report.innerHTML = `
        <strong>${escapeHtml(title)}</strong>
        ${lines.length ? `<ul>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}
    `;
}

const {
    academicGradeTone,
    renderStudentAcademicHtml
} = window.PBC_CREATE_STUDENT_PROFILE_RENDERERS({
    normalizeSearchText,
    escapeHtml,
    ACADEMIC_GRADE_SUBJECTS,
    calculateAcademicAverage,
    hasAcademicValue: (...args) => hasAcademicValue(...args),
    deriveAcademicSituation: (...args) => deriveAcademicSituation(...args)
});

window.filterManagerTable = function() {
    const input = document.getElementById('manager-search-input');
    const select = document.getElementById('mgr-filter-turma');
    const selectedTurma = select ? select.value : 'TODOS';
    
    if (!window.managerCachedUsers) return;

    let filteredList = window.managerCachedUsers;

    // Filtra por Turma do Select
    if (selectedTurma !== 'TODOS') {
        filteredList = window.managerCachedUsers.filter(u => u.company === selectedTurma);
    }

    // Filtra por Texto do Input (Nome, Email ou CPF)
    if (input && input.value) {
        filteredList = filteredList.filter(u => userMatchesSearch(u, input.value));
    }

    // Chama o renderizador da sua tabela passando os dados filtrados
    if (typeof renderManagerTable === 'function') {
        window.renderManagerTable(filteredList);
    }
};

// Deixa o documento inteiro escutando a digitação (Evita perder o ouvinte)
document.body.addEventListener('input', (e) => {
    if (e.target.id === 'admin-search-input') {
        window.filterAdminTable();
    }
    if (e.target.id === 'manager-search-input') {
        window.filterManagerTable();
    }
});

    // --- VARIÁVEIS GLOBAIS DO APP ---
    const contentArea = document.getElementById('content-area');
   
    // Adicione isso junto com as variáveis globais no topo do app_final.js
    // CORREÇÃO AQUI: Definindo a variável globalmente
    let totalModules = 0; 
    
    let completedModules = JSON.parse(localStorage.getItem('gateBombeiroCompletedModules_v3')) || [];
    let notifiedAchievements = JSON.parse(localStorage.getItem('gateBombeiroNotifiedAchievements_v3')) || [];
    let currentModuleId = null;
    let loadModuleContent;
    let cachedQuestionBanks = {}; 
    let currentUserData = null; 
    window.__getCurrentUserData = () => currentUserData;


    // --- SELETORES DO DOM ---
    const toastContainer = document.getElementById('toast-container');
    const sidebar = document.getElementById('off-canvas-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const printWatermark = document.getElementById('print-watermark');
    const achievementModal = document.getElementById('achievement-modal');
    const achievementOverlay = document.getElementById('achievement-modal-overlay');
    const closeAchButton = document.getElementById('close-ach-modal');
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const adminBtn = document.getElementById('admin-panel-btn');
    const mobileAdminBtn = document.getElementById('mobile-admin-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminOverlay = document.getElementById('admin-modal-overlay');
    const closeAdminBtn = document.getElementById('close-admin-modal');

    function showAppToast(title, message = '', type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast app-toast app-toast-${type}`;
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <div>
                <p class="font-bold">${title}</p>
                ${message ? `<p class="text-sm">${message}</p>` : ''}
            </div>
        `;
        if (toastContainer) toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    function isInstructorAdmin(userData = currentUserData) {
        const email = (userData?.email || '').toLowerCase();
        return !!userData && (userData.isAdmin === true || userData.role === 'admin' || email === 'coordenadormedeiros@gmail.com');
    }
    window.isInstructorAdmin = isInstructorAdmin;

    const libraryManager = window.PBC_CREATE_LIBRARY_MANAGER({
        moduleContent,
        moduleMediaAssets: window.PBC_MODULE_MEDIA_ASSETS || {},
        getCurrentUserData: () => currentUserData,
        isInstructorAdmin,
        premiumLibraryCategories: window.PBC_PREMIUM_LIBRARY_CATEGORIES || [],
        courseHandbookDownloads: window.PBC_COURSE_HANDBOOK_DOWNLOADS || []
    });
    const feedbackManager = window.PBC_CREATE_FEEDBACK_MANAGER({
        escapeHtml,
        showAppToast,
        getCurrentUserData: () => currentUserData
    });

    const {
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
    getStudentCompetencyAchievementsHtml,
    getStudentSmartDashboardHtml
} = window.PBC_CREATE_STUDENT_EXPERIENCE({
        normalizeSearchText,
        onlyDigits,
        escapeHtml,
        escapeJsString,
        toDateFromFirestore,
        showAppToast,
        isInstructorAdmin,
        goToHomePage: (...args) => goToHomePage(...args),
        getCurrentUserData: () => currentUserData,
        getCompletedModules: () => completedModules,
        getNotifiedAchievements: () => notifiedAchievements,
        getCurrentModuleId: () => currentModuleId,
        getTotalModules: () => totalModules,
        moduleCategories,
        moduleContent,
        moduleMediaAssets: window.PBC_MODULE_MEDIA_ASSETS || {},
        operationalGlossaryItems: window.PBC_OPERATIONAL_GLOSSARY_ITEMS || [],
        premiumLibraryCategories: window.PBC_PREMIUM_LIBRARY_CATEGORIES || [],
        courseHandbookDownloads: window.PBC_COURSE_HANDBOOK_DOWNLOADS || [],
        libraryManager,
        feedbackManager
    });

    // --- ACESSIBILIDADE ---
    const fab = document.getElementById('accessibility-fab');
    const menu = document.getElementById('accessibility-menu');
    let fontSizeScale = 1;

    fab?.addEventListener('click', () => menu.classList.toggle('show'));
    
    document.getElementById('acc-font-plus')?.addEventListener('click', () => {
        fontSizeScale += 0.1;
        document.documentElement.style.fontSize = (16 * fontSizeScale) + 'px';
    });
    document.getElementById('acc-font-minus')?.addEventListener('click', () => {
        if(fontSizeScale > 0.8) fontSizeScale -= 0.1;
        document.documentElement.style.fontSize = (16 * fontSizeScale) + 'px';
    });
    document.getElementById('acc-reset')?.addEventListener('click', () => {
        fontSizeScale = 1;
        document.documentElement.style.fontSize = '';
        document.body.classList.remove('dyslexic-font', 'high-spacing');
    });
    document.getElementById('acc-dyslexic')?.addEventListener('click', () => {
        document.body.classList.toggle('dyslexic-font');
    });
    document.getElementById('acc-spacing')?.addEventListener('click', () => {
        document.body.classList.toggle('high-spacing');
    });

    const moduleMediaAssets = window.PBC_MODULE_MEDIA_ASSETS || {};
    const moduleNarratedAudioAssets = window.PBC_MODULE_NARRATED_AUDIO_ASSETS || {};

    function assetUrl(path) {
        return encodeURI(path);
    }

    function getDriveFileId(url) {
        if (!url || typeof url !== 'string') return null;
        const fileMatch = url.match(/\/file\/d\/([^/]+)/);
        if (fileMatch) return fileMatch[1];
        const idMatch = url.match(/[?&]id=([^&]+)/);
        return idMatch ? idMatch[1] : null;
    }

    function isDriveFile(url) {
        return Boolean(getDriveFileId(url));
    }

    function drivePreviewUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/file/d/${id}/preview` : assetUrl(url);
    }

    function driveOpenUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/file/d/${id}/view` : assetUrl(url);
    }

    function driveDownloadUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/uc?export=download&id=${id}` : assetUrl(url);
    }

    function shouldPreloadNarratedAudioViaFetch(url) {
        return Boolean(getDriveFileId(url));
    }

    function driveThumbnailUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1600` : assetUrl(url);
    }

    function driveDirectUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0` : assetUrl(url);
    }

    function driveLegacyDirectUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/uc?export=download&id=${id}` : assetUrl(url);
    }

    function getYouTubeVideoId(url) {
        if (!url || typeof url !== 'string') return null;
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes('youtu.be')) {
                return parsed.pathname.replace('/', '').split('?')[0] || null;
            }
            if (parsed.hostname.includes('youtube.com')) {
                if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || null;
                if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || null;
                return parsed.searchParams.get('v');
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    function isYouTubeUrl(url) {
        return Boolean(getYouTubeVideoId(url));
    }

    function youtubeEmbedUrl(url) {
        const id = getYouTubeVideoId(url);
        if (!id) return assetUrl(url);
        const params = new URLSearchParams({
            rel: '0',
            modestbranding: '1',
            playsinline: '1'
        });
        if (window.location.origin && window.location.origin !== 'null') {
            params.set('origin', window.location.origin);
        }
        return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }

    function hasIamPremiumAccess() {
        return currentUserData?.status === 'premium' || currentUserData?.isAdmin === true || currentUserData?.isManager === true || currentUserData?.role === 'admin' || currentUserData?.courseType === 'GESTOR' || isInstructorAdmin(currentUserData);
    }

    window.openIamPremiumGate = function() {
        const existing = document.getElementById('iam-premium-gate');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'iam-premium-gate';
        modal.className = 'iam-premium-gate';
        modal.innerHTML = `
            <div class="iam-premium-backdrop" data-close-iam-gate="true"></div>
            <section class="iam-premium-card" role="dialog" aria-modal="true" aria-label="IAM exclusivo para assinantes">
                <button type="button" class="iam-premium-close" data-close-iam-gate="true" aria-label="Fechar"><i class="fas fa-times"></i></button>
                <div class="iam-premium-icon">
                    <i class="fas fa-shield-alt"></i>
                    <i class="fas fa-bolt"></i>
                </div>
                <span>IAM premium</span>
                <h2>Inteligência Artificial exclusiva para assinantes</h2>
                <p>A IAM ajuda a tirar dúvidas, criar resumos, revisar conteúdos e acelerar sua preparação dentro da plataforma.</p>
                <div class="iam-premium-stats">
                    <article><strong>+80%</strong><small>mais aprovação entre assinantes</small></article>
                    <article><strong>+60%</strong><small>mais chance de notas máximas</small></article>
                    <article><strong>+35%</strong><small>mais chance em entrevistas</small></article>
                </div>
                <button type="button" class="iam-premium-subscribe" onclick="document.getElementById('iam-premium-gate')?.remove(); openSubscriptionModalFromPremium();">
                    <i class="fas fa-gem"></i> Assinar e liberar IAM
                </button>
            </section>
        `;
        modal.addEventListener('click', (event) => {
            if (event.target.closest('[data-close-iam-gate="true"]')) modal.remove();
        });
        document.body.appendChild(modal);
    };

    const moduleMediaRenderer = window.PBC_CREATE_MODULE_MEDIA_RENDERER({
        moduleMediaAssets,
        assetUrl,
        isDriveFile,
        drivePreviewUrl,
        driveOpenUrl,
        driveThumbnailUrl,
        isYouTubeUrl,
        youtubeEmbedUrl,
        getCurrentUserData: () => currentUserData
    });

    const {
        getModuleMediaAssets,
        getModuleMediaHtml
    } = moduleMediaRenderer;

    function getBestPortugueseVoice() {
        const synth = window.speechSynthesis;
        const voices = synth?.getVoices?.() || [];
        if (!voices.length) return null;
        const preferredTerms = ['neural', 'natural', 'premium', 'online', 'google', 'microsoft', 'luciana', 'francisca', 'heloisa', 'maria', 'female'];
        return voices
            .filter(voice => /^pt[-_]/i.test(voice.lang || '') || /portugu/i.test(voice.name || ''))
            .sort((a, b) => {
                const score = voice => {
                    const text = `${voice.name || ''} ${voice.voiceURI || ''} ${voice.lang || ''}`.toLowerCase();
                    let value = /pt[-_]br/i.test(voice.lang || '') ? 100 : 40;
                    preferredTerms.forEach((term, index) => {
                        if (text.includes(term)) value += 20 - index;
                    });
                    if (voice.localService === false) value += 8;
                    return value;
                };
                return score(b) - score(a);
            })[0] || null;
    }

    function resetLessonAudioPlayer() {
        const btnIcon = document.getElementById('audio-btn-icon');
        const btnText = document.getElementById('audio-btn-text');
        const mainBtn = document.getElementById('audio-main-btn');
        const stopBtn = document.getElementById('audio-stop-btn');
        if (btnIcon) btnIcon.className = 'fas fa-headphones';
        if (btnText) btnText.textContent = 'Ouvir Aula';
        if (mainBtn) mainBtn.classList.remove('playing');
        if (stopBtn) stopBtn.remove();
        window.__pbcLessonUtterance = null;
        window.__pbcLessonAudioStarting = false;
    }

    const narratedAudio = window.PBC_CREATE_NARRATED_AUDIO({
        moduleNarratedAudioAssets,
        escapeHtml,
        driveDownloadUrl,
        shouldPreloadNarratedAudioViaFetch,
        resetLessonAudioPlayer
    });

    const {
        getNarratedLessonAudioElement,
        renderNarratedLessonAudioHtml
    } = narratedAudio;

    // --- AUDIOBOOK (COM PAUSE, RESUME E STOP) ---
    window.speakContent = function() {
        if (!currentModuleId || !moduleContent[currentModuleId]) return;
        
        const speedSelect = document.getElementById('audio-speed');
        const rate = speedSelect ? parseFloat(speedSelect.value) : 1.0;
        const btnIcon = document.getElementById('audio-btn-icon');
        const btnText = document.getElementById('audio-btn-text');
        const mainBtn = document.getElementById('audio-main-btn');
        const synth = window.speechSynthesis;

        if (!synth) {
            showAppToast('Áudio indisponível', 'Este navegador não liberou a leitura em voz alta.', 'warning');
            return;
        }

        // Cenario 1: Está falando -> PAUSAR
        if (synth.speaking && !synth.paused) {
            synth.pause();
            if(btnIcon) { btnIcon.className = 'fas fa-play'; } // Ícone muda para Play
            if(btnText) btnText.textContent = 'Continuar';
            return;
        }

        // Cenario 2: Está pausado -> RETOMAR
        if (synth.paused) {
            synth.resume();
            if(btnIcon) { btnIcon.className = 'fas fa-pause'; } // Ícone muda para Pause
            if(btnText) btnText.textContent = 'Pausar';
            return;
        }

        if (window.__pbcLessonAudioStarting) return;
        window.__pbcLessonAudioStarting = true;

        // Cenario 3: Não está falando -> INICIAR (Ou reiniciar se houver lixo na memória)
        synth.cancel(); 

        const div = document.createElement('div');
        div.innerHTML = moduleContent[currentModuleId].content;
        const cleanText = div.textContent || div.innerText || "";

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.rate = rate;
        utterance.pitch = 1.03;
        utterance.volume = 1;
        const selectedVoice = getBestPortugueseVoice();
        if (selectedVoice) utterance.voice = selectedVoice;
        window.__pbcLessonUtterance = utterance;

        utterance.onstart = () => {
            window.__pbcLessonAudioStarting = false;
            if(btnIcon) btnIcon.className = 'fas fa-pause';
            if(btnText) btnText.textContent = 'Pausar';
            if(mainBtn) mainBtn.classList.add('playing');
            
            // Cria o botão de STOP (Quadrado Vermelho) dinamicamente se não existir
            if (!document.getElementById('audio-stop-btn')) {
                const stopBtn = document.createElement('button');
                stopBtn.id = 'audio-stop-btn';
                stopBtn.className = 'audio-icon-btn bg-red-600 hover:bg-red-500 text-white ml-2';
                stopBtn.innerHTML = '<i class="fas fa-stop"></i>';
                stopBtn.title = "Parar e Resetar";
                stopBtn.onclick = (e) => {
                    e.stopPropagation(); // Evita clicar no container
                    window.__pbcLessonAudioManualStop = true;
                    synth.cancel();
                    setTimeout(() => synth.cancel(), 30);
                    resetLessonAudioPlayer();
                    setTimeout(() => { window.__pbcLessonAudioManualStop = false; }, 160);
                };
                // Insere o botão de stop ao lado do select de velocidade
                const playerContainer = document.querySelector('.modern-audio-player');
                if(playerContainer) playerContainer.appendChild(stopBtn);
            }
        };

        utterance.onend = () => {
            resetLessonAudioPlayer();
        };

        utterance.onerror = () => {
            resetLessonAudioPlayer();
        };

        setTimeout(() => {
            try {
                if (window.__pbcLessonAudioManualStop || window.__pbcLessonUtterance !== utterance) return;
                synth.speak(utterance);
                setTimeout(() => {
                    if (window.__pbcLessonUtterance === utterance && !synth.speaking && !synth.paused) {
                        resetLessonAudioPlayer();
                    }
                }, 1200);
            } catch (error) {
                console.error('Erro ao iniciar leitura da aula:', error);
                resetLessonAudioPlayer();
                showAppToast('Erro no áudio', 'Não consegui iniciar a leitura desta aula agora.', 'warning');
            }
        }, 90);
    };

    // --- INSTALL PWA ---
    let deferredPrompt;
    const installBtn = document.getElementById('install-app-btn');
    const installBtnMobile = document.getElementById('install-app-btn-mobile');
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIos) {
        if(installBtn) installBtn.classList.remove('hidden'); 
        if(installBtnMobile) installBtnMobile.classList.remove('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if(installBtn) installBtn.classList.remove('hidden'); 
      if(installBtnMobile) installBtnMobile.classList.remove('hidden'); 
    });

    window.addEventListener('appinstalled', () => {
        if(installBtn) installBtn.classList.add('hidden');
        if(installBtnMobile) installBtnMobile.classList.add('hidden');
        deferredPrompt = null;
    });

    async function triggerInstall() {
        if (isIos) {
            const iosModal = document.getElementById('ios-install-modal');
            const iosOverlay = document.getElementById('ios-modal-overlay');
            if (iosModal && iosOverlay) {
                iosModal.classList.add('show');
                iosOverlay.classList.add('show');
                
                document.getElementById('close-ios-modal')?.addEventListener('click', () => {
                    iosModal.classList.remove('show');
                    iosOverlay.classList.remove('show');
                });
                iosOverlay.addEventListener('click', () => {
                    iosModal.classList.remove('show');
                    iosOverlay.classList.remove('show');
                });
            } else {
                alert("Para instalar no iPhone:\nToque em Compartilhar (quadrado com seta).\nToque em 'Adicionar à Tela de Início'.");
            }
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                if(installBtn) installBtn.classList.add('hidden');
                if(installBtnMobile) installBtnMobile.classList.add('hidden');
            }
            deferredPrompt = null;
        } else {
            alert("Para instalar:\nProcure o ícone de instalação na barra de endereço ou menu.");
        }
    }

    if(installBtn) installBtn.addEventListener('click', triggerInstall);
    if(installBtnMobile) installBtnMobile.addEventListener('click', triggerInstall);

    if (typeof moduleContent === 'undefined' || typeof moduleCategories === 'undefined') {
    console.warn("⚠️ Conteúdo do curso ainda não carregado. Mantendo apenas a capa.");
    document.getElementById('main-header')?.classList.add('hidden');
    document.querySelector('footer')?.classList.add('hidden');
    // NÃO dá return aqui, deixa o restante do init continuar
}

function init() {
    // ========================================
    // AGUARDA O FIREBASE CARREGAR
    // ========================================
    if (typeof firebase === 'undefined') {
        console.warn("⚠️ Firebase não carregado ainda. Aguardando...");
        setTimeout(init, 500); // Tenta novamente em 0.5 segundos
        return;
    }
    
    console.log("✅ Firebase carregado! Iniciando sistema...");
    document.body.classList.add('landing-active');
    
    // ---> ADICIONE ISSO AQUI:
    setTimeout(initScrollReveal, 100); // Inicia os observadores de animação
    
        setupProtection();
        setupTheme();
        setupClickBlockerGuard();
        
        const firebaseConfig = {
          apiKey: "AIzaSyDNet1QC72jr79u8JpnFMLBoPI26Re6o3g",
          authDomain: "projeto-bravo-charlie-app.firebaseapp.com",
          projectId: "projeto-bravo-charlie-app",
          storageBucket: "projeto-bravo-charlie-app.firebasestorage.app",
          messagingSenderId: "26745008470",
          appId: "1:26745008470:web:5f25965524c646b3e666f7",
          measurementId: "G-Y7VZFQ0D9F"
        };
        
        if (window.FirebaseCourse) {
           window.FirebaseCourse.init(firebaseConfig);

// garante alias global para não dar undefined
window.fbDB = window.__fbDB || null;
window.fbAuth = window.__fbAuth || null;

            // Aguarda o Firebase estar pronto
setTimeout(() => {
    if (window.fbDB) {
        console.log("✅ Firebase inicializado com sucesso!");
    } else {
        console.warn("⚠️ Firebase ainda não inicializou. Aguardando...");
        setTimeout(() => {
            if (window.fbDB) {
                console.log("✅ Firebase inicializado (2ª tentativa)!");
            }
        }, 3000);
    }
}, 2000);

            setupAuthEventListeners(); 
            
            // LÓGICA DE LOGOUT BLINDADA
            const handleLogout = async () => {
                window.clearLocalUserData(); // <--- A MÁGICA ACONTECE AQUI
                await window.FirebaseCourse.signOutUser();
                window.location.reload(); // Recarrega a página para garantir estado zero
            };

            document.getElementById('logout-button')?.addEventListener('click', handleLogout);
            document.getElementById('logout-expired-button')?.addEventListener('click', handleLogout);
            document.getElementById('logout-button-header')?.addEventListener('click', handleLogout);

            // === CORREÇÃO CRÍTICA: LÓGICA DE LOGIN VS CAPA ===
            
            // 1. Garante que o modal de login comece FECHADO para exibir a capa
            const loginModal = document.getElementById('name-prompt-modal');
            const loginOverlay = document.getElementById('name-modal-overlay');
            const expiredModal = document.getElementById('expired-modal');
            if(loginModal) loginModal.classList.remove('show');
            if(loginOverlay) loginOverlay.classList.remove('show');
            if(expiredModal) expiredModal.classList.remove('show');

            window.PBC_LOGIN_REQUESTED = false;
            activateAuthenticationCheck();

            // A sessão deve continuar ativa ao atualizar/reabrir a plataforma no mesmo dispositivo.
        }
        
        setupHeaderScroll();
        setupRippleEffects();
        setupIamWidget();
    }

    function closeBlockingLoginModals() {
        [
            'name-prompt-modal',
            'name-modal-overlay',
            'admin-modal',
            'admin-modal-overlay',
            'manager-modal',
            'manager-modal-overlay',
            'instructor-modal',
            'instructor-modal-overlay',
            'expired-modal',
            'achievement-modal',
            'achievement-modal-overlay',
            'congratulations-modal',
            'modal-overlay',
            'ios-modal',
            'ios-modal-overlay',
            'reset-modal-overlay',
            'password-reset-modal',
            'password-reset-modal-overlay',
            'course-contact-modal',
            'course-contact-overlay'
        ].forEach(id => document.getElementById(id)?.classList.remove('show', 'opacity-100', 'pointer-events-auto', 'scale-100'));
    }

    function disableIntroBlockingLayer() {
        const introWrapper = document.getElementById('intro-carousel-wrapper');
        const landing = document.getElementById('landing-hero');

        if (introWrapper) {
            introWrapper.style.pointerEvents = 'none';
        }

        if (landing) {
            landing.style.pointerEvents = 'none';
        }
    }

    function hideIntroExperience() {
        const introWrapper = document.getElementById('intro-carousel-wrapper');
        const landing = document.getElementById('landing-hero');

        if (introWrapper) {
            introWrapper.classList.add('slide-out');
            introWrapper.style.pointerEvents = 'none';
            window.setTimeout(() => {
                introWrapper.style.display = 'none';
            }, 360);
        }

        if (landing) {
            landing.classList.add('hidden');
            landing.style.pointerEvents = 'none';
        }

        document.body.classList.remove('landing-active');
        document.body.classList.remove('auth-restoring');
        document.body.removeAttribute('data-auth-restoring');
    }

    function openLoginPromptModal() {
        closeBlockingLoginModals();
        disableIntroBlockingLayer();
        const loginModal = document.getElementById('name-prompt-modal');
        const loginOverlay = document.getElementById('name-modal-overlay');
        loginModal?.classList.add('show');
        loginOverlay?.classList.add('show');
        loginModal?.removeAttribute('aria-hidden');
        requestAnimationFrame(() => {
            const emailInput = document.getElementById('email-input');
            const passwordInput = document.getElementById('password-input');
            [emailInput, passwordInput].forEach(input => {
                input?.removeAttribute('disabled');
                input?.removeAttribute('readonly');
            });
        });
    }

    function onLoginSuccess(user, userData) {
        // Remove capa e libera scroll
        hideIntroExperience();

        if (userData && user) {
            currentUserData = { ...userData, uid: user.uid };
        } else {
            currentUserData = userData;
        }
        if (isInstructorAdmin(currentUserData)) currentUserData.isAdmin = true;

        checkTrialStatus(currentUserData?.acesso_ate);

        if (document.body.getAttribute('data-app-ready') === 'true') return;
        
        closeBlockingLoginModals();
        
        const greetingEl = document.getElementById('welcome-greeting');
        if(greetingEl) greetingEl.textContent = `Olá, ${userData.name.split(' ')[0]}!`;
        
        const printWatermark = document.getElementById('print-watermark');
        if (printWatermark) {
            printWatermark.textContent = `Licenciado para ${userData.name} (CPF: ${userData.cpf || '...'}) - Proibida a Cópia`;
        }

        // Admin e Gestor Buttons
        const adminBtn = document.getElementById('admin-panel-btn');
        const mobileAdminBtn = document.getElementById('mobile-admin-btn');
        const instructorBtn = document.getElementById('instructor-panel-btn');
        const mobileInstructorBtn = document.getElementById('mobile-instructor-btn');
        const managerFab = document.getElementById("manager-fab");
        const iamWidget = document.getElementById('iam-ai-widget');
        const userIsAdmin = isInstructorAdmin(currentUserData);

        if (iamWidget) iamWidget.classList.remove('hidden');

        if (userIsAdmin) {
            if(adminBtn) adminBtn.classList.remove('hidden');
            if(mobileAdminBtn) mobileAdminBtn.classList.remove('hidden');
            if(instructorBtn) instructorBtn.classList.remove('hidden');
            if(mobileInstructorBtn) mobileInstructorBtn.classList.remove('hidden');
        }
        if (userData.isManager === true || userIsAdmin) {
            if (managerFab) managerFab.classList.remove("hidden");
        }

        // --- PROGRESSO SINCRONIZADO (CORRIGIDO) ---
        // Se o usuário tem dados na nuvem, usa a nuvem (Prioridade Máxima)
        if (userData.completedModules && Array.isArray(userData.completedModules)) {
            completedModules = userData.completedModules;
            // Atualiza o localStorage para ficar igual à nuvem
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            console.log("Progresso sincronizado da nuvem:", completedModules.length);
        } 
        // Se a nuvem está vazia, mas temos dados locais E parece ser o mesmo usuário (sessão), envia.
        // Se for um login fresco sem sessão anterior, ignoramos o local para evitar contaminação.
        else if (completedModules.length > 0 && localStorage.getItem('my_session_id') === userData.current_session_id) {
            console.log("Sincronizando progresso local para a nuvem...");
            window.saveProgressToCloud?.();
        } 
        else {
            // Se não tem na nuvem e não é sessão contínua, assume zero.
            completedModules = [];
            localStorage.removeItem('gateBombeiroCompletedModules_v3');
        }

        // Conta apenas os módulos que este usuário realmente pode acessar.
        totalModules = getVisibleModuleIds(currentUserData).length;
        // --------------------------------------------------

        // Atualiza a interface com o número correto
        const totalEl = document.getElementById('total-modules');
        const courseCountEl = document.getElementById('course-modules-count');
        if(totalEl) totalEl.textContent = totalModules;
        if(courseCountEl) courseCountEl.textContent = totalModules;
        
        try {
            populateModuleLists();
            addEventListeners();
            handleInitialLoad();
            updateProgress();
            startOnboardingTour(false);
        } catch (error) {
            console.error('Falha ao montar a área do aluno após login:', error);
            closeBlockingLoginModals();
            if (contentArea && !contentArea.innerHTML.trim()) {
                contentArea.innerHTML = getWelcomeContent();
            }
            showAppToast('Tela recuperada', 'Corrigi a abertura da plataforma. Tente abrir uma aula pelo menu.', 'info');
        }

        localStorage.removeItem("open_manager_after_login");
    // --- TRAVA DE SEGURANÇA (ADICIONE ISTO AQUI) ---
        // Isso impede que os botões sejam duplicados quando o banco atualiza
        document.body.setAttribute('data-app-ready', 'true');

    }

let commandPanelScrollY = 0;

function hasOpenCommandPanel() {
    return ['admin-modal', 'manager-modal', 'instructor-modal'].some(id => document.getElementById(id)?.classList.contains('show'));
}

function lockCommandPanelScroll() {
    if (document.body.classList.contains('command-panel-open')) return;
    commandPanelScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.commandPanelScrollY = String(commandPanelScrollY);
    document.body.style.top = `-${commandPanelScrollY}px`;
    document.body.classList.add('command-panel-open');
}

function unlockCommandPanelScroll() {
    if (hasOpenCommandPanel()) return;
    const savedY = Number(document.body.dataset.commandPanelScrollY || commandPanelScrollY || 0);
    document.body.classList.remove('command-panel-open');
    document.body.style.top = '';
    delete document.body.dataset.commandPanelScrollY;
    window.scrollTo(0, savedY);
}

function openCommandPanel(modal, overlay) {
    lockCommandPanelScroll();
    modal?.classList.add('show');
    overlay?.classList.add('show');
    modal?.scrollTo?.({ top: 0, behavior: 'auto' });
    modal?.querySelector?.('.overflow-y-auto, .instructor-modal-body')?.scrollTo?.({ top: 0, behavior: 'auto' });
}

function closeCommandPanel(modal, overlay) {
    modal?.classList.remove('show');
    if (!hasOpenCommandPanel()) {
        overlay?.classList.remove('show');
        unlockCommandPanelScroll();
    }
}

function forceCloseCommandPanels() {
    ['admin-modal', 'manager-modal', 'instructor-modal'].forEach(id => {
        document.getElementById(id)?.classList.remove('show');
    });
    document.getElementById('admin-modal-overlay')?.classList.remove('show');
    document.body.classList.remove('command-panel-open');
    document.body.style.top = '';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    delete document.body.dataset.commandPanelScrollY;
}

function isModalOpenForOverlay(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;
    if (modal.classList.contains('show')) return true;
    return modal.classList.contains('pointer-events-auto') || modal.classList.contains('opacity-100');
}

function cleanupStaleClickBlockers() {
    const commandOverlay = document.getElementById('admin-modal-overlay');
    if (commandOverlay?.classList.contains('show') && !hasOpenCommandPanel()) {
        commandOverlay.classList.remove('show');
    }

    const overlayPairs = [
        ['name-modal-overlay', ['name-prompt-modal', 'expired-modal']],
        ['ios-modal-overlay', ['ios-instructions-modal']],
        ['reset-modal-overlay', ['reset-modal']],
        ['password-reset-modal-overlay', ['password-reset-modal']],
        ['modal-overlay', ['congratulations-modal']],
        ['achievement-modal-overlay', ['achievement-modal']],
        ['course-contact-overlay', ['course-contact-modal']]
    ];

    overlayPairs.forEach(([overlayId, modalIds]) => {
        const overlay = document.getElementById(overlayId);
        if (!overlay?.classList.contains('show')) return;
        const hasVisibleModal = modalIds.some(isModalOpenForOverlay);
        if (!hasVisibleModal) overlay.classList.remove('show');
    });

    const landing = document.getElementById('landing-hero');
    if (landing && (!document.body.classList.contains('landing-active') || landing.classList.contains('hidden'))) {
        landing.style.pointerEvents = 'none';
    }

    const anyModalOpen = [
        'name-prompt-modal',
        'expired-modal',
        'admin-modal',
        'manager-modal',
        'instructor-modal',
        'ios-instructions-modal',
        'reset-modal',
        'password-reset-modal',
        'congratulations-modal',
        'achievement-modal',
        'course-contact-modal'
    ].some(isModalOpenForOverlay);

    if (!anyModalOpen) document.body.classList.remove('modal-open');
}

function setupClickBlockerGuard() {
    cleanupStaleClickBlockers();

    const watchedIds = [
        'landing-hero',
        'name-modal-overlay',
        'admin-modal-overlay',
        'ios-modal-overlay',
        'reset-modal-overlay',
        'password-reset-modal-overlay',
        'modal-overlay',
        'achievement-modal-overlay',
        'course-contact-overlay',
        'name-prompt-modal',
        'expired-modal',
        'admin-modal',
        'manager-modal',
        'instructor-modal',
        'ios-instructions-modal',
        'reset-modal',
        'password-reset-modal',
        'congratulations-modal',
        'achievement-modal',
        'course-contact-modal'
    ];

    const observer = new MutationObserver(() => cleanupStaleClickBlockers());
    watchedIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    });

    window.addEventListener('pageshow', cleanupStaleClickBlockers);
    window.addEventListener('focus', cleanupStaleClickBlockers);
    document.addEventListener('click', cleanupStaleClickBlockers, true);
}

let instructorUsersCache = [];
let authMonitorStarted = false;
let authMonitorRetryTimer = null;

function activateAuthenticationCheck(retries = 30) {
    if (authMonitorStarted) return;
    if (!window.FirebaseCourse?.checkAuth) {
        if (authMonitorRetryTimer) clearTimeout(authMonitorRetryTimer);
        if (retries > 0) {
            authMonitorRetryTimer = setTimeout(() => activateAuthenticationCheck(retries - 1), 150);
        } else {
            console.warn('FirebaseCourse.checkAuth nao ficou disponivel durante a inicializacao.');
            document.body.classList.remove('auth-restoring');
            document.body.removeAttribute('data-auth-restoring');
        }
        return;
    }
    if (authMonitorRetryTimer) {
        clearTimeout(authMonitorRetryTimer);
        authMonitorRetryTimer = null;
    }
    authMonitorStarted = true;
    window.FirebaseCourse.checkAuth((user, userData) => {
        try {
            onLoginSuccess(user, userData);
        } catch (error) {
            console.error('Falha ao abrir a plataforma apos o login:', error);
            const feedback = document.getElementById('auth-feedback');
            if (feedback) {
                feedback.className = 'text-center text-sm mt-4 text-red-400 font-semibold';
                feedback.textContent = 'Login confirmado, mas a plataforma nao conseguiu abrir. Recarregue a pagina e tente novamente.';
            }
        }
    });
}

async function loadInstructorUsersForMessages() {
    if (!isInstructorAdmin()) return [];
    if (instructorUsersCache.length) return instructorUsersCache;
    const db = window.__fbDB || window.fbDB;
    if (!db) return [];
    const snapshot = await db.collection('users').get();
    instructorUsersCache = [];
    snapshot.forEach(doc => {
        const data = doc.data() || {};
        instructorUsersCache.push({ uid: doc.id, ...data });
    });
    return instructorUsersCache;
}

function getInstructorMessageUsers() {
    return instructorUsersCache.filter(user => user?.uid && !isInstructorAdmin(user));
}

function getInstructorCertificateBaseUsers() {
    const users = [...instructorUsersCache];
    const currentUid = currentUserData?.uid || window.currentUser?.uid;
    if (isInstructorAdmin(currentUserData) && currentUid && !users.some(user => user.uid === currentUid)) {
        users.push({ uid: currentUid, ...currentUserData });
    }
    return users.filter(user => user?.uid);
}

window.PBC_CREATE_INSTRUCTOR_ANNOUNCEMENTS({
    getInstructorMessageUsers,
    hasInstructorUsersLoaded: () => instructorUsersCache.length > 0,
    loadInstructorUsersForMessages,
    isInstructorAdmin,
    normalizeSearchText,
    onlyDigits,
    escapeHtml,
    showAppToast,
    getCurrentUserData: () => currentUserData
});

const {
    populateInstructorCertificateCompanies,
    populateInstructorCertificateStudents,
    renderStudentCertificatePanel
} = window.PBC_CREATE_CERTIFICATE_MANAGER({
    getInstructorCertificateBaseUsers,
    loadInstructorUsersForMessages,
    isInstructorAdmin,
    normalizeSearchText,
    onlyDigits,
    escapeHtml,
    escapeJsString,
    showAppToast,
    getCurrentUserData: () => currentUserData,
    getCurrentUser: () => window.currentUser,
    driveOpenUrl,
    driveDownloadUrl
});

const {
    hasAcademicValue,
    deriveAcademicSituation,
    mergeAcademicRecord,
    persistAcademicImportHistory,
    renderAcademicImportHistory
} = window.PBC_CREATE_ACADEMIC_IMPORT_MANAGER({
    ACADEMIC_GRADE_SUBJECTS,
    calculateAcademicAverage,
    normalizeAcademicCompany,
    normalizeAcademicName,
    normalizeSearchText,
    onlyDigits,
    escapeHtml,
    escapeJsString,
    showAppToast,
    setAcademicImportReport,
    isInstructorAdmin,
    findMatchingUserForAcademicRecord,
    fetchAcademicRecordsFromSheet,
    readAcademicRecordsFromFile,
    inferAcademicCompanyFromFileName,
    getCurrentUserData: () => currentUserData,
    getCurrentUser: () => window.currentUser,
    refreshInstructorUsers: async () => {
        instructorUsersCache = [];
        await loadInstructorUsersForMessages().catch(() => []);
    },
    refreshCertificateFilters: () => {
        populateInstructorCertificateCompanies();
        populateInstructorCertificateStudents();
    },
    refreshManualGradeFilters: () => {
        populateManualGradeCompanies();
        populateManualGradeStudents();
    }
});

const {
    populateManualGradeCompanies,
    populateManualGradeStudents
} = window.PBC_CREATE_MANUAL_GRADES_MANAGER({
    getInstructorMessageUsers,
    normalizeAcademicCompany,
    normalizeAcademicName,
    normalizeSearchText,
    onlyDigits,
    escapeHtml,
    showAppToast,
    isInstructorAdmin,
    calculateAcademicAverage,
    hasAcademicValue: (...args) => hasAcademicValue(...args),
    deriveAcademicSituation: (...args) => deriveAcademicSituation(...args),
    mergeAcademicRecord: (...args) => mergeAcademicRecord(...args),
    persistAcademicImportHistory: (...args) => persistAcademicImportHistory(...args),
    getCurrentUserData: () => currentUserData
});

const paymentManager = window.PBC_CREATE_PAYMENT_MANAGER({
    showAppToast,
    escapeHtml,
    toDateFromFirestore
});

const couponManager = window.PBC_CREATE_COUPON_MANAGER({
    isInstructorAdmin,
    showAppToast,
    escapeHtml,
    escapeJsString,
    subscriptionPrices: paymentManager.subscriptionPrices,
    normalizeCouponCode: paymentManager.normalizeCouponCode,
    getCouponDate: paymentManager.getCouponDate,
    isCouponValid: paymentManager.isCouponValid,
    formatCouponDate: paymentManager.formatCouponDate,
    getCurrentUserData: () => currentUserData
});

const studentPages = window.PBC_CREATE_STUDENT_PAGES({
    normalizeSearchText,
    onlyDigits,
    escapeHtml,
    escapeJsString,
    isInstructorAdmin,
    getCurrentUserData: () => currentUserData,
    getCompletedModules: () => completedModules,
    setCurrentModuleId: (id) => { currentModuleId = id; },
    getContentArea: () => contentArea,
    loadModuleContent: (...args) => loadModuleContent(...args),
    updateBreadcrumbs: (...args) => updateBreadcrumbs(...args),
    closeSidebar: (...args) => closeSidebar(...args),
    openSidebar: (...args) => openSidebar(...args),
    startOnboardingTour: (...args) => startOnboardingTour(...args),
    openPaymentModal: paymentManager.openPaymentModal,
    getVisibleModuleIds,
    getLearningStats,
    getAccessStatus,
    getJourneyStepHtml,
    getStudentMissionsHtml,
    getImportantNoticeHtml,
    getOperationalLevelHtml,
    getStudentGamificationProfileHtml,
    getStudentCompetencyAchievementsHtml,
    getStudentSmartDashboardHtml,
    getStudentNpsHtml,
    getFavoriteCardsHtml,
    getFavoriteModules,
    getHistoryHtml,
    getLibraryItems,
    getVisibleHandbooks,
    premiumLibraryCategories,
    operationalGlossaryItems,
    moduleContent,
    renderStudentAcademicHtml,
    deriveAcademicSituation: (...args) => deriveAcademicSituation(...args),
    calculateAcademicAverage,
    renderStudentCertificatePanel
});

const getSearchItems = studentPages.getSearchItems;

const courseNavigation = window.PBC_CREATE_COURSE_NAVIGATION({
    moduleContent,
    moduleCategories,
    normalizeSearchText,
    getCurrentUserData: () => currentUserData,
    getCompletedModules: () => completedModules,
    setCompletedModules: (items) => { completedModules = items; },
    getNotifiedAchievements: () => notifiedAchievements,
    setNotifiedAchievements: (items) => { notifiedAchievements = items; },
    getCurrentModuleId: () => currentModuleId,
    getTotalModules: () => totalModules,
    setTotalModules: (value) => { totalModules = value; },
    getVisibleModuleIds,
    saveProgressToCloud: (...args) => window.saveProgressToCloud?.(...args),
    showAppToast,
    getAchievementModal: () => achievementModal,
    getAchievementOverlay: () => achievementOverlay,
    confetti: window.confetti,
    loadModuleContent: (...args) => loadModuleContent(...args)
});

const {
    getCategoryColor,
    populateModuleLists,
    updateProgress,
    setupConcludeButtonListener,
    updateActiveModuleInList,
    updateNavigationButtons,
    hideAchievementModal
} = courseNavigation;

const trainingModes = window.PBC_CREATE_TRAINING_MODES({
    getCurrentUserData: () => currentUserData,
    getContentArea: () => contentArea,
    getLoadingSpinner: () => loadingSpinner,
    getCompletedModules: () => completedModules,
    setCompletedModules: (items) => { completedModules = items; },
    saveProgressToCloud: (...args) => window.saveProgressToCloud?.(...args),
    updateProgress,
    shuffleArray,
    getQuizData: () => window.QUIZ_DATA || {},
    loadModuleContent: (...args) => loadModuleContent(...args),
    confetti: window.confetti
});

const {
    startSimuladoMode,
    initSurvivalGame,
    getRPGScenarios,
    initRPGGame,
    renderDigitalID,
    clearSimuladoTimer
} = trainingModes;

const moduleLoader = window.PBC_CREATE_MODULE_LOADER({
    moduleContent,
    moduleCategories,
    getCurrentUserData: () => currentUserData,
    setCurrentModuleId: (id) => { currentModuleId = id; },
    getContentArea: () => contentArea,
    getLoadingSpinner: () => loadingSpinner,
    renderPremiumLockScreen,
    recordStudyEvent,
    getNarratedLessonAudioElement,
    resetLessonAudioPlayer,
    clearSimuladoTimer,
    startSimuladoMode,
    initSurvivalGame,
    getRPGScenarios,
    initRPGGame,
    renderDigitalID,
    getModuleMediaHtml,
    getModuleMediaAssets,
    renderNarratedLessonAudioHtml,
    getCategoryColor,
    isFavoriteModule,
    loadQuestionBank,
    shuffleArray,
    setupQuizListeners,
    setupConcludeButtonListener,
    setupNotesListener,
    updateActiveModuleInList,
    updateNavigationButtons,
    updateBreadcrumbs,
    closeSidebar
});

loadModuleContent = moduleLoader.loadModuleContent;

window.PBC_CREATE_INSTRUCTOR_PANEL({
    isInstructorAdmin,
    showAppToast,
    escapeHtml,
    escapeJsString,
    toDateFromFirestore,
    setupInstructorCouponDefaults: couponManager.setupInstructorCouponDefaults,
    refreshInstructorCoupons: couponManager.refreshInstructorCoupons,
    openCommandPanel,
    closeCommandPanel,
    renderAcademicImportHistory,
    loadInstructorUsersForMessages,
    clearInstructorUsersCache: () => { instructorUsersCache = []; },
    populateInstructorCertificateCompanies,
    populateInstructorCertificateStudents,
    populateManualGradeCompanies,
    populateManualGradeStudents,
    getCurrentUserData: () => currentUserData
});


window.PBC_CREATE_ADMIN_PANEL({
    normalizeSearchText,
    onlyDigits,
    escapeHtml,
    escapeJsString,
    showAppToast,
    isInstructorAdmin,
    openCommandPanel,
    forceCloseCommandPanels,
    getAdminCreatedDateInfo,
    formatAdminDateTime,
    getCurrentUserData: () => currentUserData
});

window.PBC_CREATE_MANAGER_PANEL({
    getVisibleModuleIds,
    toDateFromFirestore,
    getAdminCreatedDateInfo,
    formatAdminDateTime,
    onlyDigits,
    escapeHtml,
    escapeJsString,
    showAppToast,
    userMatchesSearch,
    openCommandPanel,
    closeCommandPanel,
    getCurrentUserData: () => currentUserData
});

    
    function checkTrialStatus(expiryDateString) {
        document.getElementById('trial-floating-notify')?.classList.add('hidden');
    }

    document.addEventListener('click', (event) => {
        const closeTrialBtn = event.target.closest?.('#close-trial-notify');
        if (!closeTrialBtn) return;
        event.preventDefault();
        event.stopPropagation();
        sessionStorage.setItem('trial_notice_dismissed', 'true');
        document.getElementById('trial-floating-notify')?.classList.add('hidden');
    }, true);

    const authUi = window.PBC_CREATE_AUTH_UI?.();

    function setupAuthEventListeners() {
        authUi?.setupAuthEventListeners();
    }

    function handleInitialLoad() {
        const lastModule = localStorage.getItem('gateBombeiroLastModule');
        if (lastModule) loadModuleContent(lastModule); else goToHomePage();
    }

    async function loadQuestionBank(moduleId) {
        if (cachedQuestionBanks[moduleId]) return cachedQuestionBanks[moduleId];
        if (typeof QUIZ_DATA === 'undefined') return null;
        const questions = QUIZ_DATA[moduleId];
        if (!questions || !Array.isArray(questions) || questions.length === 0) return null; 
        cachedQuestionBanks[moduleId] = questions;
        return questions;
    }

    function renderPremiumLockScreen(title) {
        contentArea.innerHTML = `<div class="text-center py-12 px-6"><div class="inline-block p-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6"><i class="fas fa-lock text-5xl text-yellow-600 dark:text-yellow-500"></i></div><h2 class="text-3xl font-bold mb-4 text-gray-800 dark:text-white">Conteúdo Exclusivo</h2><p class="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">O módulo <strong>${title}</strong> faz parte do nosso pacote avançado. Assine agora para desbloquear Simulados, Bônus e muito mais.</p><button id="premium-lock-btn" class="action-button pulse-button text-lg px-8 py-4"><i class="fas fa-crown mr-2"></i> DESBLOQUEAR TUDO AGORA</button></div>`;
        document.getElementById('premium-lock-btn').addEventListener('click', paymentManager.openPaymentModal);
        updateActiveModuleInList();
        updateNavigationButtons();
    }

    function handleQuizOptionClick(e) {
        if (e?.__pbcQuizHandled) return;
        if (e) e.__pbcQuizHandled = true;

        const o = e?.currentTarget?.classList?.contains('quiz-option')
            ? e.currentTarget
            : e?.target?.closest?.('.quiz-option');

        if (!o || o.dataset.locked === 'true' || o.getAttribute('aria-disabled') === 'true') return;

        e?.preventDefault?.();
        const moduleId = o.dataset.module;
        const questionId = o.dataset.questionId;
        const selectedAnswer = o.dataset.answer;
        const questionData = cachedQuestionBanks[moduleId]?.find(q => q.id === questionId);
        if (!questionData) return; 
        
        const correctAnswer = questionData.answer;
        const correctAnswerText = questionData.options[correctAnswer];
        const explanationText = questionData.explanation || 'Nenhuma explicação disponível.';
        
        const optionsGroup = o.closest('.quiz-options-group');
        if (!optionsGroup) return;
        const feedbackArea = document.getElementById(`feedback-${questionId}`);
        
        optionsGroup.querySelectorAll(`.quiz-option[data-question-id="${questionId}"]`).forEach(opt => {
            opt.dataset.locked = 'true';
            opt.setAttribute('aria-disabled', 'true');
            opt.tabIndex = -1;
            if (opt.dataset.answer === correctAnswer) opt.classList.add('correct');
        });
        
        let feedbackContent = '';
        if (selectedAnswer === correctAnswer) {
            o.classList.add('correct');
            feedbackContent = `
                <div class="p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded">
                    <strong class="block text-green-700 dark:text-green-400 mb-1"><i class="fas fa-check-circle mr-2"></i> Correto!</strong> 
                    <div class="text-sm text-gray-600 dark:text-gray-300">${explanationText}</div>
                </div>
            `;
            try { triggerSuccessParticles(e, o); } catch (err) {}
        } else {
            o.classList.add('incorrect');
            feedbackContent = `
                <div class="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded">
                    <div class="mb-2"><strong class="text-red-700 dark:text-red-400"><i class="fas fa-times-circle mr-2"></i> Incorreto.</strong></div>
                    <div class="mb-2 text-sm text-gray-700 dark:text-gray-200">
                        A resposta correta é: <span class="font-bold text-green-600 dark:text-green-400 block mt-1 p-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">${correctAnswer.toUpperCase()}) ${correctAnswerText}</span>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <strong>Explicação:</strong> ${explanationText}
                    </div>
                </div>
            `;
        }
        
        if (feedbackArea) {
            feedbackArea.innerHTML = `<div class="explanation mt-3 animate-slide-in">${feedbackContent}</div>`;
            feedbackArea.classList.remove('hidden');
        }
    }
    
    function updateBreadcrumbs(moduleTitle = 'Início') {
        const homeLink = `<a href="#" id="home-breadcrumb" class="text-blue-600 dark:text-blue-400 hover:text-orange-500 transition-colors"><i class="fas fa-home mr-1"></i> Início</a>`;
        if (!currentModuleId) {
            breadcrumbContainer.innerHTML = homeLink;
        } else {
            const category = Object.values(moduleCategories).find(cat => {
                const moduleNum = parseInt(currentModuleId.replace('module', ''));
                return moduleNum >= cat.range[0] && moduleNum <= cat.range[1];
            });
            if (category) {
                const categoryLink = `<span class="mx-2 text-gray-400">/</span> <span class="font-bold text-gray-700 dark:text-gray-300">${category.title}</span>`;
                const moduleSpan = `<span class="mx-2 text-gray-400">/</span> <span class="text-orange-500">${moduleTitle}</span>`;
                breadcrumbContainer.innerHTML = `${homeLink} ${categoryLink} ${moduleSpan}`;
            } else {
                breadcrumbContainer.innerHTML = `${homeLink} <span class="mx-2 text-gray-400">/</span> ${moduleTitle}`;
            }
        }
        document.getElementById('home-breadcrumb')?.addEventListener('click', (e) => { e.preventDefault(); goToHomePage(); });
    }
    
    function setupNotesListener(id) {
        const notesTextarea = document.getElementById(`notes-module-${id}`);
        if (notesTextarea) {
            notesTextarea.addEventListener('keyup', () => {
                localStorage.setItem('note-' + id, notesTextarea.value);
            });
        }
    }

    function goToHomePage() {
        studentPages.goToStudentHome();
    }
    window.goToStudentHome = goToHomePage;

    function getWelcomeContent() {
        return studentPages.getWelcomeContent();
    }

    function setupProtection() {
        const isEditableTarget = (target) => {
            const element = target?.closest?.('input, textarea, select, [contenteditable="true"]');
            return Boolean(element) && isInstructorAdmin(currentUserData);
        };
        document.body.style.userSelect = 'none';
        document.addEventListener('contextmenu', e => {
            if (!isEditableTarget(e.target)) e.preventDefault();
        });
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && ['c','a','x','v'].includes(e.key.toLowerCase()) && isEditableTarget(e.target)) return;
            if (e.ctrlKey || e.metaKey) {
                if (['c','a','x','v','s','p','u'].includes(e.key.toLowerCase())) e.preventDefault();
            }
            if (e.key === 'F12') e.preventDefault();
        });
        ['copy', 'cut', 'paste'].forEach(eventName => {
            document.addEventListener(eventName, e => {
                if (!isEditableTarget(e.target)) e.preventDefault();
            });
        });
        document.querySelectorAll('img').forEach(img => { img.draggable = false; img.addEventListener('dragstart', e => e.preventDefault()); });
    }

    function setupTheme() {
        const isDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
        updateThemeIcons();
    }
    function toggleTheme() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        updateThemeIcons();
    }
    function updateThemeIcons() {
        const icon = document.documentElement.classList.contains('dark') ? 'fa-sun' : 'fa-moon';
        document.querySelectorAll('#dark-mode-toggle-desktop i, #bottom-nav-theme i').forEach(i => i.className = `fas ${icon} text-2xl`);
    }

    function shuffleArray(array) {
        let newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
    }
    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.add('show'), 10);
        }
    }

    function toggleFocusMode() {
        document.body.classList.toggle('focus-mode');
    }

    function setupQuizListeners() {
        document.querySelectorAll('.quiz-option').forEach(o => {
            if (o.dataset.quizListenerReady === 'true') return;
            o.dataset.quizListenerReady = 'true';
            o.addEventListener('click', handleQuizOptionClick);
            o.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') handleQuizOptionClick(event);
            });
        });
    }

    function triggerSuccessParticles(clickEvent, element) {
        if (typeof confetti === 'function') confetti({ particleCount: 28, spread: 70, origin: { x: clickEvent ? clickEvent.clientX/window.innerWidth : 0.5, y: clickEvent ? clickEvent.clientY/window.innerHeight : 0.5 } });
    }

    function setupHeaderScroll() {
        const header = document.getElementById('main-header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            });
        }
    }

    function setupRippleEffects() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.action-button') || e.target.closest('.quiz-option');
            if (btn) {
                const oldRipple = btn.querySelector('.ripple');
                if (oldRipple) oldRipple.remove();
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = btn.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
                ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
                btn.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            }
        });
    }

    function addEventListeners() {
        // 1. Botões de Navegação (CORRIGIDO PARA SUPORTAR SP E BC)
        const nextButton = document.getElementById('next-module');
        const prevButton = document.getElementById('prev-module');

        prevButton?.addEventListener('click', () => {
            if (!currentModuleId) return;
            
            // Detecta prefixo correto (module ou sp_module)
            let prefix = 'module';
            let n = 0;

            if (currentModuleId.startsWith('sp_module')) {
                prefix = 'sp_module';
                n = parseInt(currentModuleId.replace('sp_module', ''));
            } else {
                n = parseInt(currentModuleId.replace('module', ''));
            }

            if(n > 1) {
                loadModuleContent(`${prefix}${n-1}`);
            }
            nextButton?.classList.remove('blinking-button');
        });

        nextButton?.addEventListener('click', () => {
            if (!currentModuleId) return;
            
            // Detecta prefixo correto
            let prefix = 'module';
            let n = 0;

            if (currentModuleId.startsWith('sp_module')) {
                prefix = 'sp_module';
                n = parseInt(currentModuleId.replace('sp_module', ''));
            } else {
                n = parseInt(currentModuleId.replace('module', ''));
            }

            // Usa totalModules (que já é filtrado por curso no login)
            if(n < totalModules) {
                loadModuleContent(`${prefix}${n+1}`);
            }
            nextButton?.classList.remove('blinking-button');
        });
const managerPanelBtn = document.getElementById("manager-panel-btn");
if (managerPanelBtn) {
    managerPanelBtn.addEventListener("click", () => {
        console.log("🔓 Botão de gestor clicado!");
        window.openManagerPanel();
    });
}

    // Lógica da busca Admin
document.getElementById('admin-search-input')?.addEventListener('input', function(e) {
    window.filterAdminTable();
});

// Lógica da busca Gestor
document.getElementById('manager-search-input')?.addEventListener('input', function(e) {
    window.filterManagerTable();
});

// Ligar o botão de biometria
document.getElementById('btn-biometric-login')?.addEventListener('click', () => {
    window.FirebaseCourse?.loginWithBiometrics?.();
});

// --- NOVO: Botão Manual de Salvar Progresso (Rodapé) ---
document.getElementById('manual-sync-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('manual-sync-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
    btn.disabled = true;

    try {
        await window.saveProgressToCloud(); // Chama a função blindada que já criamos
        showAppToast('Progresso salvo', 'Sua evolução foi sincronizada na nuvem.', 'success');
    } catch (error) {
        showAppToast('Erro ao salvar', error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
            // --- ADICIONE ISTO NO FINAL DA FUNÇÃO addEventListeners ---
        
        // Botão manual do Tour (Garante que funcione mesmo clicando várias vezes)
        const tourBtn = document.getElementById('restart-tour-btn');
        if (tourBtn) {
            // Removemos clone para limpar ouvintes antigos e adicionamos o novo
            const newTourBtn = tourBtn.cloneNode(true);
            tourBtn.parentNode.replaceChild(newTourBtn, tourBtn);
            
            newTourBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Iniciando tour manual..."); 
                startOnboardingTour(true);
            });
        }
        

        courseNavigation.bindModuleSearchHandlers();

        // 3. Admin Panel (Correção Mobile)
        adminBtn?.addEventListener('click', window.openAdminPanel);
        mobileAdminBtn?.addEventListener('click', window.openAdminPanel);
        document.getElementById('instructor-panel-btn')?.addEventListener('click', window.openInstructorPanel);
        document.getElementById('mobile-instructor-btn')?.addEventListener('click', window.openInstructorPanel);
        document.getElementById('close-instructor-modal')?.addEventListener('click', window.closeInstructorPanel);

        closeAdminBtn?.addEventListener('click', () => {
            closeCommandPanel(adminModal, adminOverlay);
        });
        adminOverlay?.addEventListener('click', () => {
            if (document.getElementById('manager-modal')?.classList.contains('show') && typeof window.closeManagerRealtime === 'function') {
                window.closeManagerRealtime();
            }
            closeCommandPanel(adminModal, adminOverlay);
            closeCommandPanel(document.getElementById('instructor-modal'), adminOverlay);
            closeCommandPanel(document.getElementById('manager-modal'), adminOverlay);
        });

        // 4. Reset com Limpeza de Nuvem
        document.getElementById('reset-progress')?.addEventListener('click', () => { 
            document.getElementById('reset-modal')?.classList.add('show'); 
            document.getElementById('reset-modal-overlay')?.classList.add('show'); 
        });
        
        document.getElementById('cancel-reset-button')?.addEventListener('click', () => { 
            document.getElementById('reset-modal')?.classList.remove('show'); 
            document.getElementById('reset-modal-overlay')?.classList.remove('show'); 
        });
        
        document.getElementById('confirm-reset-button')?.addEventListener('click', async () => {
            const btn = document.getElementById('confirm-reset-button');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Resetando...';
            btn.disabled = true;

            try {
                // 1. Limpa no Banco de Dados (Firestore) se estiver logado
                if (currentUserData && currentUserData.uid) {
                    const db = window.__fbDB || window.fbDB;
                    await db.collection('users').doc(currentUserData.uid).update({
                        completedModules: [] // Zera no banco
                    });
                }

                // 2. Limpa Local
                window.clearLocalUserData();

                alert('Progresso resetado com sucesso!');
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert("Erro ao resetar na nuvem, mas o local foi limpo.");
                window.location.reload();
            }
        });
        
        // 5. Back to Top
        document.getElementById('back-to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
            const btn = document.getElementById('back-to-top');
            if(btn) {
                if (window.scrollY > 300) { btn.style.display = 'flex'; setTimeout(() => { btn.style.opacity = '1'; btn.style.transform = 'translateY(0)'; }, 10); } 
                else { btn.style.opacity = '0'; btn.style.transform = 'translateY(20px)'; setTimeout(() => btn.style.display = 'none', 300); }
            }
        });

        // 6. Cliques
        document.body.addEventListener('click', e => {
            const quizOption = e.target.closest('.quiz-option');
            if (quizOption) {
                handleQuizOptionClick(e);
                return;
            }

            const openModuleButton = e.target.closest('[data-open-module]');
            if (openModuleButton && !openModuleButton.closest('.module-list-item')) {
                e.preventDefault();
                const moduleId = openModuleButton.dataset.openModule || openModuleButton.dataset.module || 'module1';
                loadModuleContent(moduleId);
                if (openModuleButton.closest('#mobile-module-container')) closeSidebar();
                return;
            }

            const moduleItem = e.target.closest('.module-list-item');
            if (moduleItem) {
                loadModuleContent(moduleItem.dataset.module);
                if (moduleItem.closest('#mobile-module-container')) closeSidebar();
                const nextButton = document.getElementById('next-module');
                if(nextButton) nextButton.classList.remove('blinking-button');
            }

            if (e.target.closest('.accordion-button')) {
                const b = e.target.closest('.accordion-button');
                const p = b.nextElementSibling;
                if (!p) return;
                const isActive = b.classList.contains('active');
                const allPanels = b.closest('.module-accordion-container, .sidebar, #mobile-module-container').querySelectorAll('.accordion-panel');
                allPanels.forEach(op => {
                    if (op !== p && op.previousElementSibling) {
                            op.style.maxHeight = null;
                            op.previousElementSibling.classList.remove('active');
                    }
                });
                if (!isActive) {
                    b.classList.add('active');
                    p.style.maxHeight = p.scrollHeight + "px";
                } else {
                    b.classList.remove('active');
                    p.style.maxHeight = null;
                }
            }
        });

        document.body.addEventListener('keydown', e => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const quizOption = e.target.closest('.quiz-option');
            if (!quizOption) return;
            handleQuizOptionClick(e);
        });

        document.getElementById('mobile-menu-button')?.addEventListener('click', openSidebar);
        document.getElementById('close-sidebar-button')?.addEventListener('click', closeSidebar);
        sidebarOverlay?.addEventListener('click', closeSidebar);
        document.getElementById('home-button-desktop')?.addEventListener('click', goToHomePage);
        document.getElementById('bottom-nav-home')?.addEventListener('click', goToHomePage);
        document.getElementById('bottom-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('bottom-nav-theme')?.addEventListener('click', toggleTheme);
        document.getElementById('bottom-nav-profile')?.addEventListener('click', () => window.renderStudentProfilePage?.());
        document.getElementById('dark-mode-toggle-desktop')?.addEventListener('click', toggleTheme);
        document.getElementById('focus-mode-toggle')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-menu-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-menu-exit')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-nav-exit')?.addEventListener('click', toggleFocusMode);
        document.getElementById('close-congrats')?.addEventListener('click', () => { document.getElementById('congratulations-modal').classList.remove('show'); document.getElementById('modal-overlay').classList.remove('show'); });
        closeAchButton?.addEventListener('click', hideAchievementModal);
        achievementOverlay?.addEventListener('click', hideAchievementModal);
        if (!window.PBC_ACHIEVEMENT_CLOSE_BOUND) {
            window.PBC_ACHIEVEMENT_CLOSE_BOUND = true;
            document.addEventListener('click', (event) => {
                if (event.target.closest('#close-ach-modal') || event.target.closest('#achievement-modal-overlay')) {
                    window.closeAchievementModal?.();
                }
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && document.getElementById('achievement-modal')?.classList.contains('show')) {
                    window.closeAchievementModal?.();
                }
            });
        }
        setupIamWidget();
    }
// ... (restante do código anterior) ...

   // --- 6. IAM - INTELIGÊNCIA ARTIFICIAL MEDEIROS ---
    function setupIamWidget() {
        const widget = document.getElementById('iam-ai-widget');
        const launcher = document.getElementById('iam-ai-launcher');
        const closeBtn = document.getElementById('iam-ai-close');
        const frame = document.getElementById('iam-ai-frame');

        if (!widget || !launcher || launcher.dataset.bound === 'true') return;
        launcher.dataset.bound = 'true';

        const closeIam = () => {
            widget.classList.remove('open');
            document.body.classList.remove('iam-open');
            launcher.setAttribute('aria-expanded', 'false');
        };

        const openIam = () => {
            if (!hasIamPremiumAccess()) {
                closeIam();
                window.openIamPremiumGate();
                return;
            }

            const today = new Date().toLocaleDateString();
            const key = `ai_usage_${today}`;
            let count = parseInt(window.localStorage?.getItem(key) || '0') + 1;

            const limit = 50; 

            if (count > limit) {
                showAppToast('Limite diário da IAM atingido', `Seu plano permite ${limit} aberturas por dia.`, 'warning');
                paymentManager.openPaymentModal();
                return;
            }

            window.localStorage?.setItem(key, count);
            widget.classList.add('open');
            document.body.classList.add('iam-open');
            launcher.setAttribute('aria-expanded', 'true');
            if (frame && !frame.src) frame.src = frame.dataset.src || 'https://iam-intelig-ncia-artificial-medeiros-801400632400.us-west2.run.app/';
        };

        launcher.addEventListener('click', () => {
            if (widget.classList.contains('open')) closeIam();
            else openIam();
        });
        closeBtn?.addEventListener('click', closeIam);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeIam();
        });
    }

   // --- 7. TOUR GUIADO (ONBOARDING - AJUSTE FINAL MOBILE/DESKTOP) ---
    function startOnboardingTour(isManual = false) {
        // Se for automático e já tiver visto, cancela
        if (!isManual && localStorage.getItem('bravo_tour_completed') === 'true') return;

        setTimeout(() => {
            if (!window.driver || !window.driver.js || !window.driver.js.driver) return;

            const driver = window.driver.js.driver;
            const isMobile = window.innerWidth < 768; // Detecta se é celular
            
            const installBtnDesktop = document.getElementById('install-app-btn');
            const installBtnMobile = document.getElementById('install-app-btn-mobile');
            
            const steps = [
                { 
                    element: isMobile ? '#bottom-nav-modules' : '#desktop-module-container', 
                    popover: { 
                        title: '1. Onde estudar', 
                        description: 'Use o Curso para acessar aulas, exercícios e seu progresso.', 
                        side: isMobile ? "top" : "right", 
                        align: isMobile ? 'center' : 'start' 
                    } 
                },
                { 
                    element: '#iam-ai-launcher', 
                    popover: { 
                        title: '2. Tire dúvidas com a IAM', 
                        description: 'Peça resumos, explicações rápidas e ajuda para revisar a aula.', 
                        side: isMobile ? "top" : "right", 
                        align: isMobile ? "center" : "end" 
                    } 
                },
                { 
                    element: isMobile ? '#bottom-nav-profile' : '#footer-subscribe-btn', 
                    popover: { 
                        title: '3. Perfil e próximos passos', 
                        description: 'Veja seu progresso, status, histórico, biblioteca e próximos passos no Perfil.', 
                        side: isMobile ? "top" : "bottom", 
                        align: 'center' 
                    } 
                }
            ];

            // Passo da Instalação (Condicional)
            if (installBtnDesktop && !installBtnDesktop.classList.contains('hidden')) {
                // VERSÃO DESKTOP
                steps.push({ 
                    element: '#install-app-btn', 
                    popover: { 
                        title: '3. Instale no Computador', 
                        description: 'Tenha acesso rápido instalando o App no seu Celular ou Computador.', 
                        side: "bottom",
                        align: 'center'
                    } 
                });
            } else if (installBtnMobile && !installBtnMobile.classList.contains('hidden')) {
                // AJUSTE 2: VERSÃO MOBILE (Texto corrigido)
                steps.push({ 
                    element: '#mobile-menu-button', 
                    popover: { 
                        title: '3. Instale o App', 
                        description: 'Abra o menu e clique em <strong>Instalar App</strong> para ter o Bravo Charlie no seu celular.', 
                        side: "bottom",
                        align: 'end'
                    } 
                });
            }

            const driverObj = driver({
                showProgress: true,
                animate: true,
                stagePadding: 5,
                popoverClass: 'driverjs-theme',
                steps: steps,
                onDestroyed: () => {
                    if (!isManual) localStorage.setItem('bravo_tour_completed', 'true');
                },
                nextBtnText: 'Próximo',
                prevBtnText: 'Voltar',
                doneBtnText: 'Concluir'
            });

            driverObj.drive();
        }, 1500);
    }
    // --- LÓGICA DA LANDING PAGE PROFISSIONAL ---

// Rola suavemente até a história
window.scrollToStory = function() {
    const section = document.getElementById('story-section');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// Entra no sistema e verifica login (VERSÃO OTIMIZADA PARA MOBILE)
window.enterSystem = function() {
    const landing = document.getElementById('landing-hero');
    disableIntroBlockingLayer();
    const introWrapper = document.getElementById('intro-carousel-wrapper');
    if (introWrapper) {
        introWrapper.classList.add('slide-out');
        introWrapper.style.pointerEvents = 'none';
    }
    
    if (landing) {
        // 1. Prepara a animação (Hardware Acceleration)
        landing.style.willChange = 'transform, opacity';
        landing.style.transition = 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.8s ease';
        
        // 2. Força o navegador a reconhecer o estado atual antes de mudar
        requestAnimationFrame(() => {
            // Aplica o movimento
            landing.style.transform = 'translate3d(0, -100%, 0)'; // translate3d ativa a GPU do celular
            landing.style.opacity = '0';
        });
    }

    // 3. Aguarda a animação terminar para destravar o scroll e remover a capa
    setTimeout(() => {
        hideIntroExperience();
        
        // Verifica autenticação
        if (!currentUserData) {
            console.log("Ativando verificação de autenticação...");
            window.PBC_LOGIN_REQUESTED = true;
            activateAuthenticationCheck();
            if (!window.__fbAuth?.currentUser) {
                openLoginPromptModal();
            }
        }
    }, 800); // Tempo sincronizado com a transição (0.8s)
}
// --- SISTEMA DE ANIMAÇÃO E NOTEBOOK (COM DICA MOBILE) ---
function initScrollReveal() {
    const laptop = document.getElementById('laptop-lid');
    const heroContainer = document.getElementById('landing-hero');
    const tapHint = document.getElementById('notebook-tap-hint');

    // Função Unificada: Abre o notebook e esconde a dica
    const openLaptop = () => {
        if (laptop && !laptop.classList.contains('open')) {
            // 1. Abre a tampa
            laptop.classList.add('open');
            
            // 2. Some com a dica visualmente
            if (tapHint) {
                tapHint.style.opacity = '0'; // Fica transparente
                // Remove do layout após o efeito visual (0.5s)
                setTimeout(() => {
                    tapHint.style.display = 'none'; 
                }, 500);
            }
        }
    };

    // --- A. GATILHO POR ROLAGEM (Desktop/Geral) ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Anima textos
                if (entry.target.classList.contains('reveal-on-scroll')) {
                    entry.target.classList.remove('opacity-0', 'translate-y-10', 'translate-x-10', '-translate-x-10', 'scale-95');
                    observer.unobserve(entry.target);
                }
                
                // Anima Notebook (Se o navegador detectar a rolagem)
                if (entry.target.id === 'laptop-lid') {
                    openLaptop(); 
                    observer.unobserve(entry.target);
                }
            }
        });
    }, {
        threshold: 0.1, // Sensibilidade alta (10%)
        root: heroContainer // Importante para detectar dentro da capa
    });

    // Registra elementos
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    if (laptop) observer.observe(laptop);

    // --- B. GATILHO POR TOQUE (Mobile/Interação) ---
    if (laptop) {
        // Se clicar no próprio notebook
        laptop.addEventListener('click', openLaptop);
        
        // Se clicar na área envolta (wrapper) - ajuda em telas pequenas
        const wrapper = document.querySelector('.laptop-wrapper');
        if(wrapper) {
            wrapper.addEventListener('click', openLaptop);
            wrapper.addEventListener('touchstart', openLaptop, {passive: true});
        }
    }
}
// Rolar para a próxima seção
window.scrollToNextSection = function() {
    const section = document.getElementById('features-section');
    if(section) section.scrollIntoView({ behavior: 'smooth' });
}
    // --- FUNÇÃO PARA INICIAR LOGIN COMO GESTOR ---
window.startManagerLogin = function() {
       window.enterSystem();
};
  // VARIÁVEL GLOBAL PARA ARMAZENAR DADOS DO GESTOR TEMPORARIAMENTE
let managerCachedUsers = [];
window.saveProgressToCloud = function(targetUid = null) {
    return new Promise((resolve, reject) => {
        try {
            if (!currentUserData || !currentUserData.uid) {
                console.warn("⚠️ Usuário não definido, não há o que salvar.");
                resolve();
                return;
            }

            // 1. Decide para qual UID salvar
            let finalTargetUid = targetUid || currentUserData.uid;

            // 2. Pega o progresso
            let modulesToSave = completedModules || [];
            if (!modulesToSave || modulesToSave.length === 0) {
                const localData = localStorage.getItem('gateBombeiroCompletedModules_v3');
                if (localData) {
                    modulesToSave = JSON.parse(localData);
                    completedModules = modulesToSave;
                }
            }
            modulesToSave = Array.from(new Set(modulesToSave));

            console.log("📤 Enviando para nuvem. UID:", finalTargetUid, "| Módulos:", modulesToSave.length);

            // 3. Envio ao Firestore
            const db = window.__fbDB || window.fbDB;
            if (!db) {
                console.error("❌ ERRO: Banco de dados ainda não está pronto em saveProgressToCloud.");
                alert("Sistema ainda está carregando. Tente novamente em alguns segundos.");
                resolve();
                return;
            }

            db.collection('users').doc(finalTargetUid).update({
                completedModules: modulesToSave,
                last_progress_update: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                console.log("✅ SUCESSO: Progresso salvo no banco de dados!");

                if (currentUserData) {
                    currentUserData.completedModules = modulesToSave;
                }

                resolve();
            }).catch(err => {
                console.error("❌ ERRO NO BANCO DE DADOS:", err);
                alert("Erro ao salvar: " + err.message);
                reject(err);
            });

        } catch (err) {
            console.error("❌ ERRO GERAL em saveProgressToCloud:", err);
            reject(err);
        }
    });
};
    
    // --- NOVA FUNÇÃO: LIMPEZA TOTAL DE DADOS (LOGOUT/RESET) ---
window.clearLocalUserData = function() {
    // 1. Limpa variáveis globais da memória RAM
    completedModules = [];
    notifiedAchievements = [];
    currentUserData = null;
    totalModules = 0;

    // 2. Limpa o LocalStorage (Disco)
    localStorage.removeItem('gateBombeiroCompletedModules_v3');
    localStorage.removeItem('gateBombeiroNotifiedAchievements_v3');
    localStorage.removeItem('gateBombeiroLastModule');
    localStorage.removeItem('my_session_id');
    localStorage.removeItem('user_profile_pic');
    
    // Limpa notas salvas
    Object.keys(localStorage).forEach(key => { 
        if (key.startsWith('note-')) localStorage.removeItem(key); 
    });

    // 3. Atualiza a interface visualmente para "Zero"
    const totalEl = document.getElementById('total-modules');
    const completedEl = document.getElementById('completed-modules-count');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar-minimal');
    const welcome = document.getElementById('welcome-greeting');

    if (totalEl) totalEl.textContent = '0';
    if (completedEl) completedEl.textContent = '0';
    if (progressText) progressText.textContent = '0%';
    if (progressBar) progressBar.style.width = '0%';
    if (welcome) welcome.textContent = 'Bem-vindo,';
    const iamWidget = document.getElementById('iam-ai-widget');
    const iamLauncher = document.getElementById('iam-ai-launcher');
    if (iamWidget) {
        iamWidget.classList.add('hidden');
        iamWidget.classList.remove('open');
    }
    if (iamLauncher) iamLauncher.setAttribute('aria-expanded', 'false');

    // 4. Reseta checkbox visual da lista
    document.querySelectorAll('.module-list-item').forEach(item => {
        item.classList.remove('completed', 'active');
        const icon = item.querySelector('.completion-icon');
        if(icon) icon.remove();
    });

    console.log("🧹 Dados locais limpos com sucesso.");
};

    // ============================================================
    // LÓGICA DO MODAL DE CONTATO (CURSOS EXTRAS)
    // ============================================================
    window.openContactModal = function(courseName) {
        const modal = document.getElementById('course-contact-modal');
        const overlay = document.getElementById('course-contact-overlay');
        const titleEl = document.getElementById('contact-course-name');
        const whatsBtn = document.getElementById('btn-whatsapp-contact');
        const emailBtn = document.getElementById('btn-email-contact');

        if (!modal || !overlay) return;

        // 1. Atualiza o Nome do Curso
        if (titleEl) titleEl.textContent = courseName;

        // 2. Configura o Link do WhatsApp (SEU NÚMERO AQUI)
        const phone = "5561998300711"; 
        const msg = encodeURIComponent(`Olá! Tenho interesse no curso de *${courseName}*. Poderia me passar mais informações sobre turmas e valores?`);
        if (whatsBtn) whatsBtn.href = `https://wa.me/${phone}?text=${msg}`;

        // 3. Configura o Link de Email
        if (emailBtn) emailBtn.href = `mailto:contato@bravos.com.br?subject=Interesse em ${courseName}`;

        // 4. Abre o Modal
        overlay.classList.add('show');
        modal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
        modal.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
    };

    // Fechar Modal
    function closeContactModal() {
        const modal = document.getElementById('course-contact-modal');
        const overlay = document.getElementById('course-contact-overlay');
        
        if (modal) {
            modal.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
            modal.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
        }
        if (overlay) overlay.classList.remove('show');
    }

    document.getElementById('close-contact-modal')?.addEventListener('click', closeContactModal);
    document.getElementById('course-contact-overlay')?.addEventListener('click', closeContactModal);


    // ============================================================
    // LÓGICA DO CARROSSEL DE CURSOS EXTRAS (ARRASTAR E SETAS)
    // ============================================================
    (function initExtraCoursesCarousel() {
        const slider = document.getElementById('extra-courses-scroll');
        const leftBtn = document.getElementById('scroll-left-btn');
        const rightBtn = document.getElementById('scroll-right-btn');

        if (!slider) return;

        // --- 1. Lógica das Setas ---
        if (rightBtn) {
            rightBtn.addEventListener('click', () => {
                slider.scrollBy({ left: 340, behavior: 'smooth' }); 
            });
        }
        if (leftBtn) {
            leftBtn.addEventListener('click', () => {
                slider.scrollBy({ left: -340, behavior: 'smooth' }); 
            });
        }

        // --- 2. Lógica de "Agarrar e Arrastar" (Mouse Drag) ---
        let isDown = false;
        let startX;
        let scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('active'); 
            slider.classList.remove('snap-x'); 
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active');
            slider.classList.add('snap-x'); 
        });

        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active');
            slider.classList.add('snap-x'); 
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault(); 
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; 
            slider.scrollLeft = scrollLeft - walk;
        });
    })();
    
    setupIamWidget();
    init(); // <--- Inicia o app
}); // <--- Fecha o DOMContentLoaded
