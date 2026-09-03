(function(window) {
    'use strict';

    window.PBC_CREATE_MODULE_LOADER = function(deps = {}) {
        const moduleContent = deps.moduleContent || window.moduleContent || {};
        const moduleCategories = deps.moduleCategories || window.moduleCategories || {};
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const setCurrentModuleId = deps.setCurrentModuleId || (() => {});
        const getContentArea = deps.getContentArea || (() => document.getElementById('content-area'));
        const getLoadingSpinner = deps.getLoadingSpinner || (() => document.getElementById('loading-spinner'));
        const renderPremiumLockScreen = deps.renderPremiumLockScreen || (() => {});
        const recordStudyEvent = deps.recordStudyEvent || (() => {});
        const getNarratedLessonAudioElement = deps.getNarratedLessonAudioElement || (() => null);
        const resetLessonAudioPlayer = deps.resetLessonAudioPlayer || (() => {});
        const clearSimuladoTimer = deps.clearSimuladoTimer || (() => {});
        const startSimuladoMode = deps.startSimuladoMode || (() => {});
        const initSurvivalGame = deps.initSurvivalGame || (() => {});
        const getRPGScenarios = deps.getRPGScenarios || (() => ({}));
        const initRPGGame = deps.initRPGGame || (() => {});
        const renderDigitalID = deps.renderDigitalID || (() => {});
        const getModuleMediaHtml = deps.getModuleMediaHtml || (() => '');
        const getModuleMediaAssets = deps.getModuleMediaAssets || (() => null);
        const renderNarratedLessonAudioHtml = deps.renderNarratedLessonAudioHtml || (() => '');
        const getCategoryColor = deps.getCategoryColor || (() => '');
        const isFavoriteModule = deps.isFavoriteModule || (() => false);
        const loadQuestionBank = deps.loadQuestionBank || (async () => null);
        const shuffleArray = deps.shuffleArray || (items => Array.isArray(items) ? [...items] : []);
        const setupQuizListeners = deps.setupQuizListeners || (() => {});
        const setupConcludeButtonListener = deps.setupConcludeButtonListener || (() => {});
        const setupNotesListener = deps.setupNotesListener || (() => {});
        const loadModuleNote = deps.loadModuleNote || (async id => localStorage.getItem('note-' + id) || '');
        const updateActiveModuleInList = deps.updateActiveModuleInList || (() => {});
        const updateNavigationButtons = deps.updateNavigationButtons || (() => {});
        const updateBreadcrumbs = deps.updateBreadcrumbs || (() => {});
        const closeSidebar = deps.closeSidebar || (() => {});

        function escapeTextareaValue(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        async function loadModuleContent(id) {
            const contentArea = getContentArea();
            const loadingSpinner = getLoadingSpinner();
            const currentUserData = getCurrentUserData();
            if (!contentArea) return;

        if (id === 'module62') {
            localStorage.removeItem('gateBombeiroLastModule');
            loadModuleContent('module59');
            return;
        }
        if (!id || !moduleContent[id]) return;
        const d = moduleContent[id];
        const num = parseInt(id.replace('module', ''));
        let moduleCategory = null;
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            if (num >= cat.range[0] && num <= cat.range[1]) { moduleCategory = cat; break; }
        }
        const isPremiumContent = moduleCategory && moduleCategory.isPremium;
        const userHasPremiumAccess = typeof window.hasActivePlatformAccess === 'function'
            ? window.hasActivePlatformAccess(currentUserData)
            : currentUserData?.status === 'premium';
        const userIsNotPremium = !userHasPremiumAccess;

        // Verifica bloqueio premium
        if (isPremiumContent && userIsNotPremium) { renderPremiumLockScreen(moduleContent[id].title); return; }

        setCurrentModuleId(id);
        localStorage.setItem('gateBombeiroLastModule', id);
        recordStudyEvent('module_open', d.title, id);
        
        const activeNarratedAudio = getNarratedLessonAudioElement();
        if (activeNarratedAudio) {
            activeNarratedAudio.pause();
            activeNarratedAudio.currentTime = 0;
        }
        window.hideNarratedFloatingAudio?.();
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        resetLessonAudioPlayer();
        clearSimuladoTimer();

        contentArea.style.opacity = '0';
        loadingSpinner.classList.remove('hidden');
        contentArea.classList.add('hidden'); 

        setTimeout(async () => {
            loadingSpinner.classList.add('hidden');
            contentArea.classList.remove('hidden'); 

            // 1. MODO SIMULADO
            if (d.isSimulado) {
                contentArea.innerHTML = `
                    <h3 class="text-3xl mb-4 pb-4 border-b text-orange-600 dark:text-orange-500 flex items-center">
                        <i class="${d.iconClass} mr-3"></i> ${d.title}
                    </h3>
                    <div>${d.content}</div>
                    <div class="text-center mt-8">
                        <button id="start-simulado-btn" class="action-button pulse-button text-xl px-8 py-4">
                            <i class="fas fa-play mr-2"></i> INICIAR SIMULADO
                        </button>
                    </div>
                `;
                document.getElementById('start-simulado-btn').addEventListener('click', () => startSimuladoMode(d));
            } 
            
            // 2. FERRAMENTAS (Módulo 59)
            else if (id === 'module59') { 
                contentArea.innerHTML = `
                    <section class="tools-hero-panel">
                        <div class="tools-hero-content">
                            <div class="tools-main-mark">
                                <i class="fas fa-shield-halved"></i>
                                <span><i class="fas fa-bolt"></i></span>
                            </div>
                            <div>
                                <span><i class="fas fa-layer-group"></i> Hub profissional</span>
                                <h3>Central de Ferramentas</h3>
                                <p>20 ferramentas com apoio da IAM para rotina, carreira, documentos, oportunidades, avisos e treino prático pós-curso.</p>
                            </div>
                        </div>
                    </section>
                    <div id="tools-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
                `;
                const grid = document.getElementById('tools-grid');
                if (typeof ToolsApp !== 'undefined') {
                    if (typeof ToolsApp.renderProfessionalSuite === 'function') {
                        ToolsApp.renderProfessionalSuite(grid);
                    } else {
                        ToolsApp.renderChecklist(grid);
                        ToolsApp.renderPonto(grid);
                        ToolsApp.renderEscala(grid);
                        ToolsApp.renderPlanner(grid);
                    }
                } else {
                    grid.innerHTML = '<p class="text-red-500">Erro: Script de Ferramentas não carregado.</p>';
                }
            }

            // 3. MODO SOBREVIVÊNCIA (Módulo 60)
            else if (d.isSurvival) {
                contentArea.innerHTML = d.content;
                const survivalScoreEl = document.getElementById('survival-last-score');
                const lastScore = localStorage.getItem('lastSurvivalScore');
                if(survivalScoreEl && lastScore) survivalScoreEl.innerText = `Seu recorde anterior: ${lastScore} pontos`;
                
                document.getElementById('start-survival-btn').addEventListener('click', initSurvivalGame);
            }

            // 4. RPG (Módulo 61)
            else if (d.isRPG) {
                const rpgScenarios = getRPGScenarios();
                contentArea.innerHTML = `
                    <section class="rpg-command-hero">
                        <span><i class="fas fa-headset"></i> Central de Operações 2.0</span>
                        <h3>Simulador de Ocorrências</h3>
                        <p>Escolha uma ocorrência, avalie risco, preserve a cena e tome decisões sob pressão operacional.</p>
                    </section>
                    <div class="rpg-command-stats">
                        <article><strong>6</strong><span>cenários</span></article>
                        <article><strong>3+</strong><span>decisões por missão</span></article>
                        <article><strong>Risco</strong><span>feedback imediato</span></article>
                    </div>
                    <div class="rpg-card-grid rpg-card-grid-v2">
                        ${Object.values(rpgScenarios).map((scenario, index) => `
                            <button class="rpg-card-btn group" data-rpg-scenario="${scenario.id}">
                                <small>Ocorrência ${String(index + 1).padStart(2, '0')}</small>
                                <h4><i class="${scenario.icon} mr-2"></i> ${scenario.title}</h4>
                                <p>${scenario.summary}</p>
                                <span class="rpg-risk-pill">${scenario.risk}</span>
                            </button>
                        `).join('')}
                    </div>
                `;
                document.querySelectorAll('[data-rpg-scenario]').forEach(button => {
                    button.addEventListener('click', () => initRPGGame(rpgScenarios[button.dataset.rpgScenario]));
                });
            }

            // 5. CARTEIRINHA (Módulo 62)
            else if (d.isIDCard) {
                contentArea.innerHTML = d.content;
                renderDigitalID();
            }

            // 6. MODO AULA NORMAL (TEXTO + AUDIO ATUALIZADO)
            else {
                const moduleMediaHtml = getModuleMediaHtml(id, d.title);
                const hasLocalMedia = Boolean(getModuleMediaAssets(id));
                const narratedAudioHtml = renderNarratedLessonAudioHtml(id, d.title);
                let audioHtml = narratedAudioHtml || `
                    <div class="modern-audio-player">
                        <button id="audio-main-btn" class="audio-main-btn" onclick="window.speakContent()">
                            <i id="audio-btn-icon" class="fas fa-headphones"></i> <span id="audio-btn-text">Ouvir Aula</span>
                        </button>
                        <div class="h-6 w-px bg-gray-600 mx-2"></div>
                        <select id="audio-speed" class="audio-speed-select" title="Velocidade de Reprodução">
                            <option value="0.8">0.8x</option>
                            <option value="1.0" selected>1.0x</option>
                            <option value="1.2">1.2x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2.0">2.0x</option>
                        </select>
                    </div>
                `;

                let html = `
                    <div class="study-module-header">
                        <span class="study-kicker"><i class="fas fa-book-open"></i> Modo estudo</span>
                        <h3><i class="${d.iconClass} ${getCategoryColor(id)} fa-fw"></i>${d.title}</h3>
                        <div class="study-header-actions">
                            <span><i class="fas fa-headphones"></i> Áudio disponível</span>
                            ${hasLocalMedia ? '<span><i class="fas fa-video"></i> Vídeo e slides</span>' : ''}
                            <span><i class="fas fa-pencil-alt"></i> Exercícios ao final</span>
                            <button type="button" class="study-favorite-btn ${isFavoriteModule(id) ? 'active' : ''}" data-favorite-module="${id}" onclick="window.toggleFavoriteModule('${id}')">
                                <i class="${isFavoriteModule(id) ? 'fas' : 'far'} fa-star"></i> ${isFavoriteModule(id) ? 'Favorito' : 'Favoritar'}
                            </button>
                        </div>
                    </div>
                    <button type="button" class="study-iam-nudge" onclick="window.ToolsApp?.openIamAssistant?.()">
                        <strong>IAM</strong>
                        <span><i class="fas fa-wand-magic-sparkles"></i> Tire dúvidas ou peça um resumo desta aula</span>
                    </button>
                    ${audioHtml}
                    <div>${d.content}</div>
                `;
                const isSpecialModule = ['module53', 'module54', 'module55', 'module56', 'module57', 'module58', 'module59', 'module60', 'module61', 'module62'].includes(id);

                // --- INICIO BLOCO DRIVE LINK (ATUALIZADO) ---
        // Verifica se o link existe, não é vazio, e não é o placeholder "EM_BREVE"
        if (!hasLocalMedia && d.driveLink && d.driveLink !== "" && d.driveLink !== "EM_BREVE" && d.driveLink !== "SEU_LINK_DO_DRIVE_AQUI") {
            if (userIsNotPremium) {
                html += `<div class="mt-10 mb-8"><button onclick="document.getElementById('expired-modal').classList.add('show'); document.getElementById('name-modal-overlay').classList.add('show');" class="drive-button opacity-75 hover:opacity-100 relative overflow-hidden"><div class="absolute inset-0 bg-black/30 flex items-center justify-center z-10"><i class="fas fa-lock text-2xl mr-2"></i></div><span class="blur-[2px] flex items-center"><i class="fab fa-google-drive mr-3"></i> VER FOTOS E VÍDEOS (PREMIUM)</span></button><p class="text-xs text-center mt-2 text-gray-500"><i class="fas fa-lock text-yellow-500"></i> Recurso exclusivo para assinantes</p></div>`;
            } else {
                html += `<div class="mt-10 mb-8"><a href="${d.driveLink}" target="_blank" class="drive-button"><i class="fab fa-google-drive"></i> VER FOTOS E VÍDEOS DESTA MATÉRIA</a></div>`;
            }
        } else if (!hasLocalMedia) {
            // Se não tiver link ou for "EM_BREVE", mostra botão que avisa sem abrir aba
            html += `<div class="mt-10 mb-8"><button onclick="alert('🚧 Conteúdo em produção! As fotos e vídeos desta matéria estarão disponíveis em breve.')" class="drive-button opacity-70 cursor-wait"><i class="fab fa-google-drive"></i> VER FOTOS E VÍDEOS (EM BREVE)</button></div>`;
        }
        // --- FIM BLOCO DRIVE LINK ---

                const savedNote = await loadModuleNote(id);

                let allQuestions = null;
                try { allQuestions = await loadQuestionBank(id); } catch(error) { console.error(error); }

                if (allQuestions && allQuestions.length > 0) {
                    const count = Math.min(allQuestions.length, 4); 
                    const shuffledQuestions = shuffleArray([...allQuestions]); 
                    const selectedQuestions = shuffledQuestions.slice(0, count);
                    
                    // Injeção da frase "Pratique aqui..." (Pedido 6)
                    let quizHtml = `
                        <div class="study-practice-callout-wrap">
                            <span class="study-practice-callout">
                                <i class="fas fa-pencil-alt"></i><span>Pratique aqui o que você aprendeu</span>
                            </span>
                        </div>
                        <div class="quiz-section-separator mt-4"></div>
                        <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Exercícios de Fixação</h3>
                    `;
                    
                    selectedQuestions.forEach((q, index) => {
                        const questionNumber = index + 1;
                        quizHtml += `<div class="quiz-block" data-question-id="${q.id}"><p class="font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">${questionNumber}. ${q.question}</p><div class="quiz-options-group space-y-2 mb-4">`;
                        for (const key in q.options) {
                            quizHtml += `<div class="quiz-option" role="button" tabindex="0" data-module="${id}" data-question-id="${q.id}" data-answer="${key}"><span class="option-key">${key.toUpperCase()})</span><span class="option-text">${q.options[key]}</span><span class="ripple"></span></div>`;
                        }
                        quizHtml += `</div><div id="feedback-${q.id}" class="feedback-area hidden"></div></div>`;
                    });
                    html += quizHtml;
                } else {
                    if (!d.id.startsWith('module9') && !isSpecialModule) {
                        html += `<div class="warning-box mt-8"><p><strong><i class="fas fa-exclamation-triangle mr-2"></i> Exercícios não encontrados.</strong></p></div>`;
                    }
                }

                html += moduleMediaHtml;
                html += `<div class="module-complete-panel"><div><strong>Terminou esta aula?</strong><span>Marque como concluída para atualizar seu progresso.</span></div><button class="action-button conclude-button" data-module="${id}">Concluir Módulo</button></div><div class="notes-panel"><h4><i class="fas fa-pencil-alt mr-2"></i>Anotações Pessoais</h4><p>Suas notas são salvas automaticamente na nuvem deste aluno e também ficam protegidas neste aparelho.</p><textarea id="notes-module-${id}" class="notes-textarea" placeholder="Digite suas anotações aqui...">${escapeTextareaValue(savedNote)}</textarea><div id="notes-save-state-${id}" class="notes-save-state"><i class="fas fa-cloud-check"></i> Anotações sincronizadas.</div></div>`;

                contentArea.innerHTML = html;
                setupQuizListeners();
                setupConcludeButtonListener();
                setupNotesListener(id);
                if (narratedAudioHtml) window.initNarratedLessonAudio?.();
            }

            contentArea.style.opacity = '1';
            contentArea.style.transition = 'opacity 0.3s ease';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updateActiveModuleInList();
            updateNavigationButtons();
            updateBreadcrumbs(d.title);
            document.getElementById('module-nav').classList.remove('hidden');
            closeSidebar();
            document.getElementById('next-module')?.classList.remove('blinking-button');
        }, 300);
    }
    

        window.loadModuleContent = loadModuleContent;

        return { loadModuleContent };
    };
})(window);
