/* === ARQUIVO app_final.js (VERSÃO FINAL CORRIGIDA) === */
/* Correções: Simulado Timer, Voz, Ferramentas, Layout, Admin */

document.addEventListener('DOMContentLoaded', () => {

    // --- VARIÁVEIS GLOBAIS ---
    const contentArea = document.getElementById('content-area');
    // Verifica se moduleContent existe para evitar erros se carregado fora de ordem
    const totalModules = (typeof moduleContent !== 'undefined') ? Object.keys(moduleContent).length : 0;
    
    let completedModules = JSON.parse(localStorage.getItem('gateBombeiroCompletedModules_v3')) || [];
    let notifiedAchievements = JSON.parse(localStorage.getItem('gateBombeiroNotifiedAchievements_v3')) || [];
    let currentModuleId = null;
    let cachedQuestionBanks = {};
    let currentUserData = null;

    // --- VARIÁVEIS SIMULADO ---
    let simuladoTimerInterval = null;
    let simuladoTimeLeft = 0;
    let activeSimuladoQuestions = [];
    let userAnswers = {};
    let currentSimuladoQuestionIndex = 0;

    // --- SELETORES ---
    const toastContainer = document.getElementById('toast-container');
    const sidebar = document.getElementById('off-canvas-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const printWatermark = document.getElementById('print-watermark');
    const achievementModal = document.getElementById('achievement-modal');
    const achievementOverlay = document.getElementById('achievement-modal-overlay');
    const closeAchButton = document.getElementById('close-ach-modal'); // Pode não ser usado, mas mantido
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // Admin Buttons
    const adminBtn = document.getElementById('admin-panel-btn');
    const mobileAdminBtn = document.getElementById('mobile-admin-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminOverlay = document.getElementById('admin-modal-overlay');
    const closeAdminBtn = document.getElementById('close-admin-modal');

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
        if (fontSizeScale > 0.8) fontSizeScale -= 0.1;
        document.documentElement.style.fontSize = (16 * fontSizeScale) + 'px';
    });
    
    document.getElementById('acc-dyslexic')?.addEventListener('click', () => {
        document.body.classList.toggle('dyslexic-font');
    });
    
    document.getElementById('acc-spacing')?.addEventListener('click', () => {
        document.body.classList.toggle('high-spacing');
    });

    // --- AUDIOBOOK (TEXT TO SPEECH) ---
    window.speakContent = function() {
        if (!currentModuleId || !moduleContent[currentModuleId]) return;

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            document.getElementById('audio-btn-icon')?.classList.remove('fa-stop');
            document.getElementById('audio-btn-icon')?.classList.add('fa-headphones');
            document.getElementById('audio-btn-text').textContent = 'Ouvir Aula';
            document.getElementById('audio-btn').classList.remove('audio-playing');
            return;
        }

        // Cria um elemento temporário para limpar o HTML e pegar apenas o texto
        const div = document.createElement('div');
        div.innerHTML = moduleContent[currentModuleId].content;
        const cleanText = div.textContent || div.innerText || "";

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9; // Velocidade levemente reduzida para melhor compreensão

        utterance.onstart = () => {
            document.getElementById('audio-btn-icon')?.classList.remove('fa-headphones');
            document.getElementById('audio-btn-icon')?.classList.add('fa-stop');
            document.getElementById('audio-btn-text').textContent = 'Parar';
            document.getElementById('audio-btn').classList.add('audio-playing');
        };

        utterance.onend = () => {
            document.getElementById('audio-btn-icon')?.classList.remove('fa-stop');
            document.getElementById('audio-btn-icon')?.classList.add('fa-headphones');
            document.getElementById('audio-btn-text').textContent = 'Ouvir Aula';
            document.getElementById('audio-btn').classList.remove('audio-playing');
        };

        window.speechSynthesis.speak(utterance);
    };

    // --- INIT & AUTH ---
    if (typeof moduleContent === 'undefined' || typeof moduleCategories === 'undefined') return;

    function init() {
        if (typeof setupProtection === 'function') setupProtection();
        if (typeof setupTheme === 'function') setupTheme();

        const firebaseConfig = {
            apiKey: "AIzaSyDNet1QC72jr79u8JpnFMLBoPI26Re6o3g",
            authDomain: "projeto-bravo-charlie-app.firebaseapp.com",
            projectId: "projeto-bravo-charlie-app",
            storageBucket: "projeto-bravo-charlie-app.firebasestorage.app",
            messagingSenderId: "26745008470",
            appId: "1:26745008470:web:5f25965524c646b3e666f7",
            measurementId: "G-Y7VZFQ0D9F"
        };

        if (typeof FirebaseCourse !== 'undefined') {
            FirebaseCourse.init(firebaseConfig);
            setupAuthEventListeners();
            document.getElementById('logout-button')?.addEventListener('click', FirebaseCourse.signOutUser);
            document.getElementById('logout-expired-button')?.addEventListener('click', FirebaseCourse.signOutUser);
            document.getElementById('logout-button-header')?.addEventListener('click', FirebaseCourse.signOutUser);
            
            FirebaseCourse.checkAuth((user, userData) => {
                onLoginSuccess(user, userData);
            });
        }
        
        setupHeaderScroll();
        setupRippleEffects();
    }

    function onLoginSuccess(user, userData) {
        currentUserData = userData;
        
        if (document.body.getAttribute('data-app-ready') === 'true') return;
        document.body.setAttribute('data-app-ready', 'true');

        // Remove modais de login/bloqueio
        document.getElementById('name-prompt-modal')?.classList.remove('show');
        document.getElementById('name-modal-overlay')?.classList.remove('show');
        document.getElementById('expired-modal')?.classList.remove('show');

        // Personalização
        const greetingEl = document.getElementById('welcome-greeting');
        if (greetingEl) greetingEl.textContent = `Olá, ${userData.name.split(' ')[0]}!`;
        
        if (printWatermark) {
            printWatermark.textContent = `Licenciado para ${userData.name} (CPF: ${userData.cpf || '...'}) - Proibida a Cópia`;
        }

        // Botão Admin
        if (userData.isAdmin === true) {
            if (adminBtn) adminBtn.classList.remove('hidden');
            if (mobileAdminBtn) mobileAdminBtn.classList.remove('hidden');
        }

        checkTrialStatus(userData.acesso_ate);

        // Atualiza contadores
        const totalEl = document.getElementById('total-modules');
        if(totalEl) totalEl.textContent = totalModules;
        
        const countEl = document.getElementById('course-modules-count');
        if(countEl) countEl.textContent = totalModules;

        populateModuleLists();
        updateProgress();
        addEventListeners();
        handleInitialLoad();
    }

    // --- ADMIN FUNCTIONS ---
    window.openAdminPanel = async function() {
        if (!currentUserData || !currentUserData.isAdmin) return;
        
        adminModal.classList.add('show');
        adminOverlay.classList.add('show');
        
        const tbody = document.getElementById('admin-table-body');
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center">Carregando...</td></tr>';
        
        try {
            const snapshot = await window.__fbDB.collection('users').orderBy('name').get();
            tbody.innerHTML = '';
            
            snapshot.forEach(doc => {
                const u = doc.data();
                const uid = doc.id;
                const row = `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3 font-bold">${u.name}</td>
                        <td class="p-3 text-sm">${u.email}<br>${u.cpf}</td>
                        <td class="p-3 text-xs">${u.last_device || '-'}</td>
                        <td class="p-3">${u.status}</td>
                        <td class="p-3 text-sm">${u.acesso_ate ? new Date(u.acesso_ate).toLocaleDateString() : '-'}</td>
                        <td class="p-3">
                            <button onclick="manageUserAccess('${uid}', '${u.acesso_ate}')" class="bg-green-500 text-white px-2 py-1 rounded text-xs mr-1">Plan</button>
                            <button onclick="deleteUser('${uid}', '${u.name}', '${u.cpf}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Del</button>
                        </td>
                    </tr>`;
                tbody.innerHTML += row;
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-red-500">${err.message}</td></tr>`;
        }
    };

    window.manageUserAccess = async function(uid, currentExpiryStr) {
        const opcao = prompt("1 - MENSAL (+30)\n2 - SEMESTRAL (+180)\n3 - ANUAL (+365)\n4 - PERMANENTE");
        if (!opcao) return;
        
        let dias = 0;
        if (opcao == '1') dias = 30;
        else if (opcao == '2') dias = 180;
        else if (opcao == '3') dias = 365;
        else if (opcao == '4') dias = 3650;
        
        const hoje = new Date();
        let base = new Date(currentExpiryStr);
        if (isNaN(base.getTime()) || base < hoje) base = hoje;
        base.setDate(base.getDate() + dias);
        
        try {
            await window.__fbDB.collection('users').doc(uid).update({
                status: 'premium',
                acesso_ate: base.toISOString()
            });
            alert("Atualizado!");
            openAdminPanel();
        } catch (e) {
            alert(e.message);
        }
    };

    window.deleteUser = async function(uid, name, cpf) {
        if (confirm(`Excluir ${name}?`)) {
            try {
                const batch = window.__fbDB.batch();
                batch.delete(window.__fbDB.collection('users').doc(uid));
                if (cpf && cpf !== 'Sem CPF') {
                    batch.delete(window.__fbDB.collection('cpfs').doc(cpf));
                }
                await batch.commit();
                alert("Excluído.");
                openAdminPanel();
            } catch (e) {
                alert(e.message);
            }
        }
    };

    function checkTrialStatus(expiry) {
        // Implementação mantida conforme lógica original
        if (!expiry) return;
        const now = new Date();
        const expDate = new Date(expiry);
        if (now > expDate) {
             document.getElementById('expired-modal')?.classList.add('show');
        }
    }

    function setupAuthEventListeners() {
        // Listeners auxiliares de auth se necessário
    }

    // --- CARREGAMENTO DE MÓDULOS E FERRAMENTAS ---
    function handleInitialLoad() {
        const last = localStorage.getItem('gateBombeiroLastModule');
        if (last) loadModuleContent(last);
        else goToHomePage(); // Certifique-se que essa função existe ou crie um fallback
    }
    
    // Função helper caso goToHomePage não exista no escopo
    function goToHomePage() {
       // Placeholder para ir para a home se necessário
    }

    async function loadQuestionBank(id) {
        if (cachedQuestionBanks[id]) return cachedQuestionBanks[id];
        if (typeof QUIZ_DATA === 'undefined') return null;
        return QUIZ_DATA[id];
    }

    async function generateSimuladoQuestions(config) {
        const all = [];
        const byCat = {};
        
        // Agrupa questões por categoria
        for (const k in moduleCategories) {
            byCat[k] = [];
            const cat = moduleCategories[k];
            for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                const mid = `module${i}`;
                if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA[mid]) {
                    byCat[k].push(...QUIZ_DATA[mid]);
                }
            }
        }
        
        // Seleciona baseado na distribuição
        for (const [k, qty] of Object.entries(config.distribution)) {
            if (byCat[k]) {
                const shuf = shuffleArray(byCat[k]);
                all.push(...shuf.slice(0, qty));
            }
        }
        return shuffleArray(all);
    }

    async function loadModuleContent(id) {
        if (!id || !moduleContent[id]) return;
        
        const d = moduleContent[id];
        const num = parseInt(id.replace('module', ''));
        
        // Verifica Categoria e Bloqueio Premium
        let cat = null;
        for (const k in moduleCategories) {
            const c = moduleCategories[k];
            if (num >= c.range[0] && num <= c.range[1]) {
                cat = c;
                break;
            }
        }
        
        if (cat?.isPremium && (!currentUserData || currentUserData.status !== 'premium')) {
            renderPremiumLockScreen(d.title);
            return;
        }

        // Prepara transição
        currentModuleId = id;
        localStorage.setItem('gateBombeiroLastModule', id);
        
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        if (simuladoTimerInterval) clearInterval(simuladoTimerInterval);

        contentArea.style.opacity = '0';
        loadingSpinner.classList.remove('hidden');
        contentArea.classList.add('hidden');

        setTimeout(async () => {
            loadingSpinner.classList.add('hidden');
            contentArea.classList.remove('hidden');

            // --- CASO 1: MODO SIMULADO ---
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
                    </div>`;
                document.getElementById('start-simulado-btn').addEventListener('click', () => startSimuladoMode(d));
            }
            // --- CASO 2: MÓDULO FERRAMENTAS (Fix ID module56) ---
            else if (id === 'module56') {
                contentArea.innerHTML = `
                    <h3 class="text-3xl mb-4 pb-4 border-b text-blue-600 dark:text-blue-400 flex items-center">
                        <i class="fas fa-tools mr-3"></i> Ferramentas Operacionais
                    </h3>
                    <div id="tools-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>`;
                
                const grid = document.getElementById('tools-grid');
                if (typeof ToolsApp !== 'undefined') {
                    ToolsApp.renderPonto(grid);
                    ToolsApp.renderEscala(grid);
                    ToolsApp.renderPlanner(grid);
                    ToolsApp.renderWater(grid);
                    ToolsApp.renderNotes(grid);
                    ToolsApp.renderHealth(grid);
                } else {
                    grid.innerHTML = '<p class="text-red-500">Erro: Carregue tools_logic.js</p>';
                }
            }
            // --- CASO 3: AULA NORMAL ---
            else {
                const savedNote = localStorage.getItem('note-' + id) || '';
                let html = `
                    <h3 class="flex items-center text-3xl mb-6 pb-4 border-b">
                        <i class="${d.iconClass} mr-4 ${getCategoryColor(id)} fa-fw"></i>${d.title}
                    </h3>
                    <div id="audio-btn" class="audio-controls mb-6" onclick="window.speakContent()">
                        <i id="audio-btn-icon" class="fas fa-headphones text-lg mr-2"></i>
                        <span id="audio-btn-text">Ouvir Aula</span>
                    </div>
                    <div>${d.content}</div>`;
                
                if (d.driveLink) {
                    html += `<div class="mt-10 mb-8"><a href="${d.driveLink}" target="_blank" class="drive-button"><i class="fab fa-google-drive"></i>VER FOTOS E VÍDEOS</a></div>`;
                }

                // Carrega Quiz
                let allQuestions = await loadQuestionBank(id);
                if (allQuestions && allQuestions.length > 0) {
                    const count = Math.min(allQuestions.length, 4);
                    const selected = shuffleArray([...allQuestions]).slice(0, count);
                    
                    let quizHtml = `<div class="quiz-section-separator"></div><h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Exercícios de Fixação</h3>`;
                    
                    selected.forEach((q, i) => {
                        quizHtml += `
                        <div class="quiz-block" data-question-id="${q.id}">
                            <p class="font-semibold mt-4 mb-2">${i+1}. ${q.question}</p>
                            <div class="quiz-options-group space-y-2 mb-4">`;
                            for (const k in q.options) {
                                quizHtml += `<div class="quiz-option" data-module="${id}" data-question-id="${q.id}" data-answer="${k}"><span class="option-key">${k.toUpperCase()})</span> ${q.options[k]}<span class="ripple"></span></div>`;
                            }
                        quizHtml += `</div><div id="feedback-${q.id}" class="feedback-area hidden"></div></div>`;
                    });
                    html += quizHtml;
                }

                // Botão Concluir e Notas
                html += `
                    <div class="mt-8 pt-6 border-t border-gray-200 text-right">
                        <button class="action-button conclude-button" data-module="${id}">Concluir Módulo</button>
                    </div>
                    <div class="mt-10 pt-6 border-t-2 border-dashed border-gray-200 dark:border-gray-700">
                        <h4 class="text-xl font-bold mb-3 text-secondary dark:text-gray-200"><i class="fas fa-pencil-alt mr-2"></i>Anotações Pessoais</h4>
                        <textarea id="notes-module-${id}" class="notes-textarea" placeholder="Digite suas anotações aqui...">${savedNote}</textarea>
                    </div>`;

                contentArea.innerHTML = html;
                setupQuizListeners();
                setupConcludeButtonListener();
                setupNotesListener(id);
            }

            contentArea.style.opacity = '1';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            updateActiveModuleInList();
            updateNavigationButtons();
            updateBreadcrumbs(d.title);
            document.getElementById('module-nav').classList.remove('hidden');
            closeSidebar();
        }, 300);
    }

    // --- LÓGICA DO SIMULADO (LAYOUT CORRIGIDO) ---
    async function startSimuladoMode(moduleData) {
        loadingSpinner.classList.remove('hidden');
        contentArea.classList.add('hidden');
        
        activeSimuladoQuestions = await generateSimuladoQuestions(moduleData.simuladoConfig);
        userAnswers = {};
        simuladoTimeLeft = moduleData.simuladoConfig.timeLimit * 60;
        currentSimuladoQuestionIndex = 0;

        // O HEADER STICKY AGORA TEM TOP=5.5rem (ajustável) PARA NÃO FICAR POR BAIXO DO HEADER PRINCIPAL
        contentArea.innerHTML = `
            <div class="relative pb-12">
                <div id="simulado-timer-bar" class="simulado-header-sticky" style="position:sticky; top:5.5rem; z-index:40; background:var(--panel-bg); padding:1rem; border-bottom:2px solid var(--primary); display:flex; justify-content:space-between; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    <span class="simulado-timer font-bold text-xl text-red-600"><i class="fas fa-clock mr-2"></i><span id="timer-display">60:00</span></span>
                    <span class="simulado-progress text-sm font-bold">Questão <span id="q-current">1</span> / ${activeSimuladoQuestions.length}</span>
                </div>
                
                <div style="margin-top: 2rem; padding: 0 0.5rem;">
                    <h3 class="text-xl font-bold text-center mb-6 text-gray-800 dark:text-white">${moduleData.title}</h3>
                    <div id="question-display-area" class="simulado-question-container"></div>
                </div>
                
                <div class="mt-8 flex justify-between items-center pb-10">
                    <button id="sim-prev-btn" class="sim-nav-btn sim-btn-prev" style="visibility: hidden;"><i class="fas fa-arrow-left mr-2"></i> Anterior</button>
                    <button id="sim-next-btn" class="sim-nav-btn sim-btn-next">Próxima <i class="fas fa-arrow-right ml-2"></i></button>
                </div>
            </div>
        `;
        
        contentArea.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        showSimuladoQuestion(currentSimuladoQuestionIndex);
        startTimer(moduleData.id);
        
        document.getElementById('sim-next-btn').addEventListener('click', () => navigateSimulado(1, moduleData.id));
        document.getElementById('sim-prev-btn').addEventListener('click', () => navigateSimulado(-1, moduleData.id));
    }

    function showSimuladoQuestion(index) {
        const q = activeSimuladoQuestions[index];
        const container = document.getElementById('question-display-area');
        const saved = userAnswers[q.id] || null;
        
        let html = `<div class="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <p class="font-bold text-lg mb-6 text-gray-800 dark:text-white">${index+1}. ${q.question}</p>
            <div class="space-y-3">`;
            
        for (const k in q.options) {
            const chk = saved === k ? 'checked' : '';
            html += `
            <label class="flex items-center p-4 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input type="radio" name="q-curr" value="${k}" class="mr-4 w-5 h-5 text-orange-600" ${chk} onchange="registerSimuladoAnswer('${q.id}', '${k}')">
                <span class="text-base text-gray-700 dark:text-gray-300"><strong class="mr-2 text-orange-500">${k.toUpperCase()})</strong> ${q.options[k]}</span>
            </label>`;
        }
        
        html += `</div></div>`;
        container.innerHTML = html;
        
        document.getElementById('q-current').innerText = index + 1;
        document.getElementById('sim-prev-btn').style.visibility = index === 0 ? 'hidden' : 'visible';
        
        const nb = document.getElementById('sim-next-btn');
        if (index === activeSimuladoQuestions.length - 1) {
            nb.innerHTML = '<i class="fas fa-check-double mr-2"></i> ENTREGAR';
            nb.className = "sim-nav-btn bg-green-600 text-white hover:bg-green-500";
        } else {
            nb.innerHTML = 'Próxima <i class="fas fa-arrow-right ml-2"></i>';
            nb.className = "sim-nav-btn sim-btn-next";
        }
    }

    function navigateSimulado(dir, modId) {
        const n = currentSimuladoQuestionIndex + dir;
        if (n >= 0 && n < activeSimuladoQuestions.length) {
            currentSimuladoQuestionIndex = n;
            showSimuladoQuestion(n);
            window.scrollTo({ top: 100, behavior: 'smooth' });
        } else if (n >= activeSimuladoQuestions.length && confirm("Entregar simulado?")) {
            finishSimulado(modId);
        }
    }

    window.registerSimuladoAnswer = (id, val) => {
        userAnswers[id] = val;
    };

    function startTimer(modId) {
        const d = document.getElementById('timer-display');
        simuladoTimerInterval = setInterval(() => {
            simuladoTimeLeft--;
            const m = Math.floor(simuladoTimeLeft / 60);
            const s = simuladoTimeLeft % 60;
            d.textContent = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
            
            if (simuladoTimeLeft <= 0) {
                clearInterval(simuladoTimerInterval);
                finishSimulado(modId);
            }
        }, 1000);
    }

    function finishSimulado(modId) {
        clearInterval(simuladoTimerInterval);
        let c = 0;
        
        activeSimuladoQuestions.forEach(q => {
            if (userAnswers[q.id] === q.answer) c++;
        });
        
        const score = (c / activeSimuladoQuestions.length) * 10;
        
        let html = `
            <div class="simulado-result-card mb-8">
                <h2 class="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Resultado</h2>
                <div class="simulado-score-circle">${score.toFixed(1)}</div>
                <p>Acertou <strong>${c}</strong> de ${activeSimuladoQuestions.length}</p>
            </div>
            <div class="space-y-4">`;
            
        activeSimuladoQuestions.forEach((q, i) => {
            const sel = userAnswers[q.id];
            const isC = sel === q.answer;
            html += `
            <div class="p-4 rounded border-l-4 ${isC ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}">
                <p class="font-bold text-sm">${i+1}. ${q.question}</p>
                <p class="text-xs mt-2">Sua: <strong>${sel ? sel.toUpperCase() : '-'}</strong> | Correta: <strong class="text-green-600">${q.answer.toUpperCase()}</strong></p>
            </div>`;
        });
        
        html += `</div><div class="text-center mt-8"><button onclick="location.reload()" class="action-button">Sair</button></div>`;
        
        contentArea.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (!completedModules.includes(modId)) {
            completedModules.push(modId);
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            updateProgress();
        }
    }

    // --- FUNÇÕES AUXILIARES PADRÃO ---
    function renderPremiumLockScreen(title) {
        contentArea.innerHTML = `
            <div class="text-center py-12 px-6">
                <div class="inline-block p-6 bg-yellow-100 rounded-full mb-6"><i class="fas fa-lock text-5xl text-yellow-600"></i></div>
                <h2 class="text-3xl font-bold mb-4">Conteúdo Exclusivo</h2>
                <p class="mb-8">O módulo <strong>${title}</strong> é exclusivo para assinantes.</p>
                <button id="premium-lock-btn" class="action-button pulse-button">DESBLOQUEAR</button>
            </div>`;
        document.getElementById('premium-lock-btn').addEventListener('click', () => {
            document.getElementById('expired-modal').classList.add('show');
        });
        updateActiveModuleInList();
        updateNavigationButtons();
    }

    function shuffleArray(a) {
        let b = [...a];
        for (let i = b.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [b[i], b[j]] = [b[j], b[i]];
        }
        return b;
    }

    function getCategoryColor(id) {
        // Implementar lógica de cores se necessário, fallback padrão
        return 'text-gray-500';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
    }

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.add('show'), 10);
        }
    }

    function populateModuleLists() {
        document.getElementById('desktop-module-container').innerHTML = getModuleListHTML();
        document.getElementById('mobile-module-container').innerHTML = getModuleListHTML();
    }

    function getModuleListHTML() {
        let h = `<h2 class="text-2xl font-semibold mb-5 flex items-center text-blue-900 dark:text-white"><i class="fas fa-list-ul mr-3 text-orange-500"></i> Conteúdo</h2>
                 <div class="mb-4 relative">
                    <input type="text" class="module-search w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Buscar...">
                    <i class="fas fa-search absolute right-3 top-3.5 text-gray-400"></i>
                 </div>
                 <div class="module-accordion-container space-y-2">`;
                 
        for (const k in moduleCategories) {
            const c = moduleCategories[k];
            const lk = c.isPremium && (!currentUserData || currentUserData.status !== 'premium') ? '<i class="fas fa-lock text-xs ml-2 text-yellow-500"></i>' : '';
            
            h += `<div>
                    <button class="accordion-button"><span><i class="${c.icon} w-6 mr-2 text-gray-500"></i>${c.title} ${lk}</span><i class="fas fa-chevron-down"></i></button>
                    <div class="accordion-panel">`;
            
            for (let i = c.range[0]; i <= c.range[1]; i++) {
                const m = moduleContent[`module${i}`];
                if (m) {
                    const dn = completedModules.includes(m.id) ? ' completed' : '';
                    h += `<div class="module-list-item${dn}" data-module="${m.id}"><i class="${m.iconClass} module-icon"></i><span style="flex:1">${m.title}</span>${dn ? '<i class="fas fa-check-circle completion-icon"></i>' : ''}</div>`;
                }
            }
            h += `</div></div>`;
        }
        return h + `</div>`;
    }

    function updateProgress() {
        const p = (completedModules.length / totalModules) * 100;
        document.getElementById('progress-text').textContent = `${p.toFixed(0)}%`;
        document.getElementById('completed-modules-count').textContent = completedModules.length;
        document.getElementById('progress-bar-minimal').style.width = `${p}%`;
        
        updateModuleListStyles();
        checkAchievements();
        
        if (totalModules > 0 && completedModules.length === totalModules) showCongratulations();
    }

    function showCongratulations() {
        document.getElementById('congratulations-modal').classList.add('show');
        document.getElementById('modal-overlay').classList.add('show');
        if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 200 });
    }

    function showAchievementToast(t) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas fa-trophy"></i><div><p class="font-bold">Concluído!</p><p class="text-sm">${t}</p></div>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    function updateModuleListStyles() {
        document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('completed', completedModules.includes(i.dataset.module)));
    }

    function checkAchievements() {
        // Lógica de conquistas placeholder
    }

    function updateBreadcrumbs(title) {
        if(breadcrumbContainer) breadcrumbContainer.innerText = title;
    }

    function setupConcludeButtonListener() {
        if (!currentModuleId) return;
        const b = document.querySelector(`.conclude-button[data-module="${currentModuleId}"]`);
        if (b) {
            if (completedModules.includes(currentModuleId)) {
                b.disabled = true;
                b.innerHTML = 'Concluído';
            } else {
                b.disabled = false;
                b.innerHTML = 'Concluir';
                b.addEventListener('click', () => handleConcludeButtonClick(b));
            }
        }
    }

    function handleConcludeButtonClick(b) {
        const id = b.dataset.module;
        if (!completedModules.includes(id)) {
            completedModules.push(id);
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            updateProgress();
            b.disabled = true;
            b.innerHTML = 'Concluído';
            showAchievementToast(moduleContent[id].title);
            if (typeof confetti === 'function') confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, zIndex: 2000 });
        }
    }

    function updateActiveModuleInList() {
        document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('active', i.dataset.module === currentModuleId));
    }

    function updateNavigationButtons() {
        // Atualizar botões Anterior/Próximo se necessário
    }

    function setupQuizListeners() {
        document.querySelectorAll('.quiz-option').forEach(o => o.addEventListener('click', handleQuizOptionClick));
    }
    
    function handleQuizOptionClick(e) {
        // Função helper placeholder para clique no quiz
        const option = e.currentTarget;
        const questionId = option.dataset.questionId;
        const moduleId = option.dataset.module;
        const answerKey = option.dataset.answer;
        
        // Verifica resposta (Lógica básica, pode ser expandida)
        loadQuestionBank(moduleId).then(questions => {
            const q = questions.find(q => q.id === questionId);
            if(q) {
                const feedback = document.getElementById(`feedback-${questionId}`);
                feedback.classList.remove('hidden');
                if(answerKey === q.correct) {
                    option.classList.add('correct');
                    feedback.innerHTML = '<span class="text-green-600 font-bold">Correto!</span> ' + (q.explanation || '');
                    triggerSuccessParticles(e);
                } else {
                    option.classList.add('wrong');
                    feedback.innerHTML = '<span class="text-red-600 font-bold">Incorreto.</span> Tente novamente.';
                }
            }
        });
    }

    function triggerSuccessParticles(e) {
        if (typeof confetti === 'function') confetti({ particleCount: 28, spread: 70, origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } });
    }

    function setupHeaderScroll() {
        window.addEventListener('scroll', () => {
            const h = document.getElementById('main-header');
            if(h) {
                if (window.scrollY > 50) h.classList.add('scrolled');
                else h.classList.remove('scrolled');
            }
        });
    }

    function setupRippleEffects() {
        document.addEventListener('click', e => {
            const b = e.target.closest('.action-button') || e.target.closest('.quiz-option');
            if (b) {
                const r = document.createElement('span');
                r.classList.add('ripple');
                const rect = b.getBoundingClientRect();
                const s = Math.max(rect.width, rect.height);
                r.style.width = r.style.height = s + 'px';
                r.style.left = e.clientX - rect.left - s / 2 + 'px';
                r.style.top = e.clientY - rect.top - s / 2 + 'px';
                b.appendChild(r);
                setTimeout(() => r.remove(), 600);
            }
        });
    }

    function setupNotesListener(id) {
        const n = document.getElementById(`notes-module-${id}`);
        if (n) n.addEventListener('keyup', () => localStorage.setItem('note-' + id, n.value));
    }

    function addEventListeners() {
        const prev = document.getElementById('prev-module');
        const next = document.getElementById('next-module');

        prev?.addEventListener('click', () => {
            if (currentModuleId) {
                const n = parseInt(currentModuleId.replace('module', ''));
                if (n > 1) loadModuleContent(`module${n - 1}`);
            }
        });
        next?.addEventListener('click', () => {
            if (currentModuleId) {
                const n = parseInt(currentModuleId.replace('module', ''));
                if (n < totalModules) loadModuleContent(`module${n + 1}`);
            }
        });

        document.body.addEventListener('input', e => {
            if (e.target.matches('.module-search')) {
                const val = e.target.value.toLowerCase();
                document.querySelectorAll('.module-list-item').forEach(i => {
                    const txt = i.textContent.toLowerCase();
                    i.style.display = txt.includes(val) ? 'flex' : 'none';
                });
            }
        });
        
        adminBtn?.addEventListener('click', window.openAdminPanel);
        mobileAdminBtn?.addEventListener('click', window.openAdminPanel);
        closeAdminBtn?.addEventListener('click', () => {
            adminModal.classList.remove('show');
            adminOverlay.classList.remove('show');
        });

        document.getElementById('mobile-menu-button')?.addEventListener('click', openSidebar);
        document.getElementById('close-sidebar-button')?.addEventListener('click', closeSidebar);
        sidebarOverlay?.addEventListener('click', closeSidebar);

        document.getElementById('back-to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
            const b = document.getElementById('back-to-top');
            if (b) {
                if (window.scrollY > 300) b.style.display = 'flex';
                else b.style.display = 'none';
            }
        });

        document.body.addEventListener('click', e => {
            const m = e.target.closest('.module-list-item');
            if (m) loadModuleContent(m.dataset.module);
            
            const acc = e.target.closest('.accordion-button');
            if (acc) {
                const p = acc.nextElementSibling;
                if (acc.classList.contains('active')) {
                    acc.classList.remove('active');
                    p.style.maxHeight = null;
                } else {
                    acc.classList.add('active');
                    p.style.maxHeight = p.scrollHeight + "px";
                }
            }
        });
    }

    init();
});
