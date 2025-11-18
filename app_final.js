/* === ARQUIVO app.js (CORREÇÃO FINAL DE TIMING) === */

// ESPERA O HTML ESTAR 100% CARREGADO ANTES DE EXECUTAR QUALQUER COISA
document.addEventListener('DOMContentLoaded', () => {

    // --- VERIFICAÇÃO DE SEGURANÇA (Primeira coisa a rodar) ---
    // (Verifica se data.js e course.js carregaram)
    if (typeof moduleContent === 'undefined' || typeof moduleCategories === 'undefined' || typeof questionSources === 'undefined') {
        
        document.getElementById('main-header')?.classList.add('hidden');
        document.querySelector('footer')?.classList.add('hidden');
        document.querySelector('nav.lg\\:hidden')?.classList.add('hidden');
        document.getElementById('welcome-greeting-container')?.classList.add('hidden');
        document.getElementById('breadcrumb-container')?.classList.add('hidden');
        document.getElementById('sticky-progress-wrapper')?.classList.add('hidden');

        const contentAreaError = document.getElementById('content-area');
        if (contentAreaError) {
            contentAreaError.innerHTML = `
                <div class="text-center py-10 px-6">
                    <div class="inline-block p-5 bg-red-100 dark:bg-red-900/50 rounded-full mb-6 floating">
                        <i class="fas fa-exclamation-triangle text-6xl text-red-600"></i>
                    </div>
                    <h2 class="text-3xl font-bold mb-4 text-red-700 dark:text-red-300">Erro Crítico de Carregamento</h2>
                    <p class="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-8">
                        O arquivo de dados essencial (<code>data.js</code> ou <code>course.js</code>) não foi encontrado ou está corrompido. 
                        Verifique se os arquivos estão na mesma pasta que o <code>index.html</code> e se as variáveis estão globais.
                    </p>
                    <button onclick="location.reload()" class="action-button pulse text-lg">
                        <i class="fas fa-sync-alt mr-2"></i> Tentar Recarregar
                    </button>
                </div>`;
            
            contentAreaError.closest('.bg-white')?.classList.remove('hidden');
            document.getElementById('loading-spinner')?.classList.add('hidden');
        }
        
        console.error("Erro: Arquivo data.js ou course.js não carregado ou incompleto (moduleContent, moduleCategories, ou questionSources ausente).");
        return; // Interrompe a execução
    }
    // --- FIM DA VERIFICAÇÃO DE SEGURANÇA ---


    // --- VARIÁVEIS GLOBAIS DO APP ---
    // (Agora estão seguras dentro do DOMContentLoaded)
    const contentArea = document.getElementById('content-area');
    const totalModules = Object.keys(moduleContent).length;
    let completedModules = JSON.parse(localStorage.getItem('gateBombeiroCompletedModules_v3')) || [];
    let notifiedAchievements = JSON.parse(localStorage.getItem('gateBombeiroNotifiedAchievements_v3')) || [];
    let currentModuleId = null;
    let cachedQuestionBanks = {}; 

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
    
    const resetModal = document.getElementById('reset-modal');
    const resetOverlay = document.getElementById('reset-modal-overlay');
    const confirmResetButton = document.getElementById('confirm-reset-button');
    const cancelResetButton = document.getElementById('cancel-reset-button');

    // --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
    function init() {
        setupProtection();
        setupTheme();
        
        // --- INICIALIZAÇÃO DO FIREBASE ---
        const firebaseConfig = {
          apiKey: "AIzaSyDNet1QC72jr79u8JpnFMLBoPI26Re6o3g",
          authDomain: "projeto-bravo-charlie-app.firebaseapp.com",
          projectId: "projeto-bravo-charlie-app",
          storageBucket: "projeto-bravo-charlie-app.appspot.com",
          messagingSenderId: "26745008470",
          appId: "1:26745008470:web:5f25965524c646b3e666f7"
        };
        
        if (typeof FirebaseCourse === 'undefined') {
            console.error("Firebase-init.js não foi carregado a tempo.");
            alert("Erro ao carregar o sistema de login. Verifique sua conexão e tente recarregar.");
            return;
        }

        FirebaseCourse.init(firebaseConfig);
        
        // Configura os botões de Login/Cadastro
        setupAuthEventListeners(); 
        
        // Adiciona listener para o botão de Sair (Logout)
        document.getElementById('logout-button')?.addEventListener('click', FirebaseCourse.signOutUser);
        document.getElementById('logout-expired-button')?.addEventListener('click', FirebaseCourse.signOutUser);

        // O checkAuth agora controla o início do app
        FirebaseCourse.checkAuth((user, userData) => {
            onLoginSuccess(user, userData);
        });
        
        // Configura os listeners de UI que não dependem de login
        setupHeaderScroll();
        setupRippleEffects();
    }
    
    // --- NOVA FUNÇÃO: INICIA O APP APÓS LOGIN VÁLIDO ---
    function onLoginSuccess(user, userData) {
        console.log(`Login bem-sucedido. Iniciando app para ${userData.name}`);
        
        // 1. Esconde o modal de login
        document.getElementById('name-prompt-modal')?.classList.remove('show');
        document.getElementById('name-modal-overlay')?.classList.remove('show');
        
        // 2. Define a saudação (lógica do antigo handlePersonalGreeting)
        const greetingEl = document.getElementById('welcome-greeting');
        if(greetingEl) greetingEl.textContent = `Olá, ${userData.name}!`;
        
        // 3. Define a marca d'água (lógica do antigo setupPrintWatermarkContent)
        if (printWatermark) {
            printWatermark.textContent = `Conteúdo Exclusivo de ${userData.name} - Proibida a Reprodução`;
        }

        // 4. Inicia o resto do app (lógica do antigo init())
        // ESTES SÃO OS ELEMENTOS QUE ESTAVAM DANDO 'null'
        document.getElementById('total-modules').textContent = totalModules;
        document.getElementById('course-modules-count').textContent = totalModules;
        
        populateModuleLists();
        updateProgress();
        addEventListeners(); // Adiciona os listeners principais do app
        handleInitialLoad();
    }

    // --- NOVA FUNÇÃO: GERENCIA OS BOTÕES DE LOGIN/CADASTRO ---
    function setupAuthEventListeners() {
        const nameField = document.getElementById('name-field-container');
        const nameInput = document.getElementById('name-input');
        const emailInput = document.getElementById('email-input');
        const passwordInput = document.getElementById('password-input');
        const feedback = document.getElementById('auth-feedback');
        
        const loginGroup = document.getElementById('login-button-group');
        const signupGroup = document.getElementById('signup-button-group');
        const authTitle = document.getElementById('auth-title');
        const authMsg = document.getElementById('auth-message');

        const btnShowLogin = document.getElementById('show-login-button');
        const btnShowSignup = document.getElementById('show-signup-button');
        const btnLogin = document.getElementById('login-button');
        const btnSignup = document.getElementById('signup-button');

        // Alternar para modo CADASTRO
        btnShowSignup?.addEventListener('click', () => {
            loginGroup.classList.add('hidden');
            signupGroup.classList.remove('hidden');
            nameField.classList.remove('hidden');
            authTitle.textContent = "Criar Nova Conta";
            authMsg.textContent = "Preencha seus dados para iniciar o trial de 30 dias.";
            feedback.textContent = "";
        });
        
        // Alternar para modo LOGIN
        btnShowLogin?.addEventListener('click', () => {
            loginGroup.classList.remove('hidden');
            signupGroup.classList.add('hidden');
            nameField.classList.add('hidden');
            authTitle.textContent = "Acessar Plataforma";
            authMsg.textContent = "Entre com seu e-mail e senha para continuar.";
            feedback.textContent = "";
        });
        
        // Ação de LOGIN
        btnLogin?.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                feedback.textContent = "Por favor, preencha e-mail e senha.";
                return;
            }
            feedback.textContent = "Entrando...";
            try {
                await FirebaseCourse.signInWithEmail(email, password);
                feedback.textContent = "Login com sucesso! Carregando...";
            } catch (error) {
                console.error("Erro de Login:", error.code);
                if (error.code === 'auth/invalid-credential') {
                    feedback.textContent = "E-mail ou senha inválidos.";
                } else {
                    feedback.textContent = "Erro ao tentar fazer login.";
                }
            }
        });
        
        // Ação de CADASTRO
        btnSignup?.addEventListener('click', async () => {
            const name = nameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            
            if (!name || !email || !password) {
                feedback.textContent = "Por favor, preencha nome, e-mail e senha.";
                return;
            }
            if (password.length < 6) {
                feedback.textContent = "A senha deve ter no mínimo 6 caracteres.";
                return;
            }
            feedback.textContent = "Criando conta...";
            try {
                await FirebaseCourse.signUpWithEmail(name, email, password);
                feedback.textContent = "Conta criada! Carregando...";
            } catch (error) {
                console.error("Erro de Cadastro:", error.code);
                if (error.code === 'auth/email-already-in-use') {
                    feedback.textContent = "Este e-mail já está em uso. Tente fazer login.";
                } else {
                    feedback.textContent = "Erro ao criar a conta.";
                }
            }
        });
    }

    // --- Lógica de Carregamento Inicial ---
    function handleInitialLoad() {
        const lastModule = localStorage.getItem('gateBombeiroLastModule');
        if (lastModule) {
            loadModuleContent(lastModule);
        } else {
            goToHomePage();
        }
    }

    // --- LAZY LOADING DE PERGUNTAS (Corrigido) ---
    async function loadQuestionBank(moduleId) {
        if (cachedQuestionBanks[moduleId]) {
            return cachedQuestionBanks[moduleId];
        }
        if (typeof QUIZ_DATA === 'undefined') {
            console.error("Erro fatal: quizzes.js não carregou ou 'QUIZ_DATA' não está definido.");
            return null;
        }
        const questions = QUIZ_DATA[moduleId];
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            console.warn(`Nenhum quiz encontrado em QUIZ_DATA para o módulo: ${moduleId}`);
            return null; 
        }
        cachedQuestionBanks[moduleId] = questions;
        return questions;
    }

    // --- FUNÇÃO DE CARREGAR MÓDULO (COM SCROLL CORRIGIDO) ---
    async function loadModuleContent(id) {
        if (!id || !moduleContent[id]) return;
        currentModuleId = id;
        localStorage.setItem('gateBombeiroLastModule', id);
        
        const d = moduleContent[id];
        const savedNote = localStorage.getItem('note-' + id) || ''; 
        const categoryColor = getCategoryColor(id);
        
        contentArea.style.opacity = '0';
        loadingSpinner.classList.remove('hidden');
        contentArea.classList.add('hidden'); 

        let allQuestions = null;
        
        try {
            allQuestions = await loadQuestionBank(id);
        } catch(error) {
             console.error("Erro no carregamento do quiz:", error);
        }
        
        setTimeout(() => {
            loadingSpinner.classList.add('hidden');
            contentArea.classList.remove('hidden'); 

            let html = `
                <h3 class="flex items-center text-3xl mb-6 pb-4 border-b"><i class="${d.iconClass} mr-4 ${categoryColor} fa-fw"></i>${d.title}</h3>
                <div>${d.content}</div>
            `;

            if (allQuestions && allQuestions.length > 0) {
                const questionsToDisplay = 4;
                const count = Math.min(allQuestions.length, questionsToDisplay); 
                const shuffledQuestions = shuffleArray(allQuestions);
                const selectedQuestions = shuffledQuestions.slice(0, count);

                let quizHtml = `<hr><h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Exercícios de Fixação</h3>`;
                
                selectedQuestions.forEach((q, index) => {
                    const questionNumber = index + 1;
                    quizHtml += `<div class="quiz-block" data-question-id="${q.id}">
                                    <p class="font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">${questionNumber}. ${q.question}</p>
                                    <div class="quiz-options-group space-y-2 mb-4">`;
                    
                    for (const key in q.options) {
                        quizHtml += `<div class="quiz-option" data-module="${id}" data-question-id="${q.id}" data-answer="${key}">
                                        <span class="option-key">${key.toUpperCase()})</span> ${q.options[key]}
                                    </div>`;
                    }
                    
                    quizHtml += `</div><div id="feedback-${q.id}" class="feedback-area hidden"></div></div>`;
                });
                
                html += quizHtml;
            } else {
                console.error(`Falha ao carregar quiz: 'QUIZ_DATA.${id}' está indefinido ou vazio.`);
                html += `<div class="warning-box mt-8">
                            <p><strong><i class="fas fa-exclamation-triangle mr-2"></i> Exercícios não encontrados.</strong></p>
                            <p>Não foi possível encontrar as perguntas de fixação para este módulo no arquivo <code>quizzes.js</code>.</p>
                         </div>`;
            }

            html += `
                <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-right">
                    <button class="action-button conclude-button" data-module="${id}">Concluir Módulo</button>
                </div>
                <div class="mt-10 pt-6 border-t-2 border-dashed border-gray-200 dark:border-gray-700">
                    <h4 class="text-xl font-bold mb-3 text-secondary dark:text-gray-200"><i class="fas fa-pencil-alt mr-2"></i>Anotações Pessoais</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Suas notas para este módulo. Elas são salvas automaticamente no seu navegador.</p>
                    <textarea id="notes-module-${id}" class="notes-textarea" placeholder="Digite suas anotações aqui...">${savedNote}</textarea>
                </div>
            `;

            contentArea.innerHTML = html;
            
            setupQuizListeners();
            setupConcludeButtonListener();
            setupNotesListener(id);
            
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

    // --- FUNÇÃO DE QUIZ (FEEDBACK APRIMORADO) ---
    function handleQuizOptionClick(e) {
        const o = e.currentTarget;
        if (o.disabled) return;
        const moduleId = o.dataset.module;
        const questionId = o.dataset.questionId;
        const selectedAnswer = o.dataset.answer;
        const questionData = cachedQuestionBanks[moduleId]?.find(q => q.id === questionId);
        if (!questionData) {
            console.error(`Pergunta ${questionId} não encontrada no cache.`);
            return; 
        }
        const correctAnswer = questionData.answer;
        const explanationText = questionData.explanation || 'Nenhuma explicação disponível.';
        const optionsGroup = o.closest('.quiz-options-group');
        const feedbackArea = document.getElementById(`feedback-${questionId}`);
        optionsGroup.querySelectorAll(`.quiz-option[data-question-id="${questionId}"]`).forEach(opt => {
            opt.disabled = true;
            if (opt.dataset.answer === correctAnswer) {
                opt.classList.add('correct');
            }
        });
        let feedbackContent = '';
        if (selectedAnswer === correctAnswer) {
            o.classList.add('correct');
            feedbackContent = `<strong class="font-semibold text-green-700 dark:text-green-400"><i class="fas fa-check-circle mr-2"></i> Correto!</strong> ${explanationText}`;
            try {
                if (typeof triggerSuccessParticles === 'function') {
                    triggerSuccessParticles(e, o);
                }
            } catch (err) {
                console.error('Erro ao executar triggerSuccessParticles:', err);
            }
        } else {
            o.classList.add('incorrect');
            feedbackContent = `<strong class="font-semibold text-red-700 dark:text-red-400"><i class="fas fa-times-circle mr-2"></i> Incorreto.</strong> ${explanationText} 
                                <span class="text-sm italic block mt-1"> (Dica: A resposta correta foi destacada em verde.)</span>`;
        }
        if (feedbackArea) {
            feedbackArea.innerHTML = `<div class="explanation mt-2">${feedbackContent}</div>`;
            feedbackArea.classList.remove('hidden');
        }
    }
    
    // --- FUNÇÃO DE BREADCRUMBS (NAVEGAÇÃO APRIMORADA) ---
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
        document.getElementById('home-breadcrumb')?.addEventListener('click', (e) => {
            e.preventDefault(); 
            goToHomePage();
        });
    }
    
    // --- FUNÇÕES DE UTILIDADE ---
    function setupNotesListener(id) {
        const notesTextarea = document.getElementById(`notes-module-${id}`);
        if (notesTextarea) {
            notesTextarea.style.userSelect = 'auto';
            notesTextarea.style.webkitUserSelect = 'auto';
            notesTextarea.style.mozUserSelect = 'auto';
            notesTextarea.style.msUserSelect = 'auto';
            notesTextarea.addEventListener('keyup', () => {
                localStorage.setItem('note-' + id, notesTextarea.value);
            });
        }
    }


    // --- FUNÇÕES REUTILIZÁVEIS ---

    function goToHomePage() {
        localStorage.removeItem('gateBombeiroLastModule'); 
        
        if (contentArea) {
            contentArea.innerHTML = getWelcomeContent();
        }
        document.getElementById('module-nav')?.classList.add('hidden');
        document.querySelectorAll('.module-list-item.active').forEach(i => i.classList.remove('active'));
        currentModuleId = null;
        closeSidebar();
        document.getElementById('next-module')?.classList.remove('blinking-button');
        
        const btn = document.getElementById('start-course');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                loadModuleContent('module1');
                const firstAccordionButton = document.querySelector('#desktop-module-container .accordion-button');
                if(firstAccordionButton) {
                     const firstPanel = firstAccordionButton.nextElementSibling;
                     if (firstPanel) {
                         firstAccordionButton.classList.add('active');
                         firstPanel.style.maxHeight = firstPanel.scrollHeight + "px";
                     }
                }
            });
        }
        updateBreadcrumbs();
    }

    function getWelcomeContent() {
        return `<div class="text-center py-8">
                        <div class="floating inline-block p-5 bg-red-100 dark:bg-red-900/50 rounded-full mb-6"><i class="fas fa-fire-extinguisher text-6xl text-red-600"></i></div>
                        <h2 class="text-4xl font-bold mb-4 text-blue-900 dark:text-white">Torne-se um Profissional de Elite</h2>
                        <p class="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                            Bem-vindo ao <strong class="font-bold text-orange-500 dark:text-orange-400">Curso de Formação para Bombeiro Civil e Brigadista</strong>.
                        </p>
                        <button id="start-course" class="action-button pulse text-lg"><i class="fas fa-play-circle mr-2"></i> Iniciar Curso Agora</button>
                    </div>`;
    }

    function setupProtection() {
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
          if (e.ctrlKey || e.metaKey) {
            if (['c','a','x','v','s','p','u'].includes(e.key.toLowerCase())) e.preventDefault();
          }
          if (e.key === 'F12') e.preventDefault();
          if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) e.preventDefault();
          if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            console.warn('Impressão desativada para proteger o conteúdo.'); 
          }
        });
        document.querySelectorAll('img').forEach(img => {
          img.draggable = false;
          img.addEventListener('dragstart', e => e.preventDefault());
        });
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
    
    function getCategoryColor(moduleId) {
        if (!moduleId) return 'text-gray-500'; 
        const num = parseInt(moduleId.replace('module', ''));
        
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            if (num >= cat.range[0] && num <= cat.range[1]) {
                switch (key) {
                    case 'rh': return 'text-orange-500'; 
                    case 'legislacao': return 'text-orange-500'; 
                    case 'salvamento': return 'text-blue-500'; 
                    case 'pci': return 'text-red-500'; 
                    case 'aph_novo': return 'text-green-500'; 
                    case 'nr33': return 'text-teal-500';       
                    case 'nr35': return 'text-indigo-500'; 
                    default: return 'text-gray-500';
                }
            }
        }
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
    let html = `<h2 class="text-2xl font-semibold mb-5 flex items-center text-blue-900 dark:text-white"><i class="fas fa-list-ul mr-3 text-orange-500"></i> Conteúdo do Curso</h2>
                    <div class="mb-4 relative"><input type="text" class="module-search w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700" placeholder="Buscar módulo."><i class="fas fa-search absolute right-3 top-3.5 text-gray-400"></i></div>
                    <div class="module-accordion-container space-y-2">`;

    for (const k in moduleCategories) {
        const cat = moduleCategories[k];
        html += `<div><button class="accordion-button"><span><i class="${cat.icon} w-6 mr-2 text-gray-500"></i>${cat.title}</span><i class="fas fa-chevron-down"></i></button><div class="accordion-panel">`;
        for (let i = cat.range[0]; i <= cat.range[1]; i++) {
            const m = moduleContent[`module${i}`];
            if (m) {
                const isDone = Array.isArray(completedModules) && completedModules.includes(m.id);
                html += `<div class="module-list-item${isDone ? ' completed' : ''}" data-module="${m.id}">
                            <i class="${m.iconClass} module-icon"></i>
                            <span style="flex:1">${m.title}</span>
                            ${isDone ? '<i class="fas fa-check-circle completion-icon" aria-hidden="true"></i>' : ''}
                         </div>`;
            }
        }
        html += `</div></div>`;
    }

    html += `</div>`;
    html += `<div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"><h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Conquistas por Área</h3><div id="achievements-grid" class="grid grid-cols-2 gap-4">`;
    for (const key in moduleCategories) {
        const cat = moduleCategories[key];
        html += `<div id="ach-cat-${key}" class="achievement" title="Conclua a área para ganhar: ${cat.achievementTitle}"><div class="achievement-icon"><i class="${cat.icon}"></i></div><p class="text-sm font-bold text-gray-700 dark:text-gray-300">${cat.achievementTitle}</p></div>`;
    }
    html += `</div></div>`;
    return html;
}

    function updateProgress() {
        const p = (completedModules.length / totalModules) * 100;
        
        const progressTextEl = document.getElementById('progress-text');
        if (progressTextEl) progressTextEl.textContent = `${p.toFixed(0)}%`;
        
        const completedCountEl = document.getElementById('completed-modules-count');
        if (completedCountEl) completedCountEl.textContent = completedModules.length;
        
        const progressBarMinimal = document.getElementById('progress-bar-minimal');
        if (progressBarMinimal) {
            progressBarMinimal.style.width = `${p}%`;
        }
        
        updateModuleListStyles();
        checkAchievements();
        if (totalModules > 0 && completedModules.length === totalModules) showCongratulations();
    }

    function showCongratulations() {
        document.getElementById('congratulations-modal')?.classList.add('show');
        document.getElementById('modal-overlay')?.classList.add('show');
        if(typeof confetti === 'function') {
            confetti({particleCount:150, spread:90, origin:{y:0.6},zIndex:200});
        }
    }
    function showAchievementToast(title) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas fa-trophy"></i><div><p class="font-bold">Módulo Concluído!</p><p class="text-sm">${title}</p></div>`;
        if (toastContainer) {
            toastContainer.appendChild(toast);
        }
        setTimeout(() => toast.remove(), 4500);
    }
    function updateModuleListStyles() {
        document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('completed', completedModules.includes(i.dataset.module)));
    }
    function checkAchievements() {
        let newNotification = false;
        for(const key in moduleCategories) {
            const cat = moduleCategories[key];
            let allComplete = true;
            for(let i = cat.range[0]; i <= cat.range[1]; i++) {
                if (!moduleContent[`module${i}`] || !completedModules.includes(`module${i}`)) {
                    allComplete = false; break;
                }
            }
            
            if (allComplete && !notifiedAchievements.includes(key)) {
                showAchievementModal(cat.achievementTitle, cat.icon);
                notifiedAchievements.push(key);
                newNotification = true;
            }
            
            document.querySelectorAll(`#ach-cat-${key}`).forEach(el => el.classList.toggle('unlocked', allComplete));
        }
        if (newNotification) {
            localStorage.setItem('gateBombeiroNotifiedAchievements_v3', JSON.stringify(notifiedAchievements));
        }
    }
    function showAchievementModal(title, iconClass) {
        const iconContainer = document.getElementById('ach-modal-icon-container');
        const titleEl = document.getElementById('ach-modal-title');
        if (!achievementModal || !achievementOverlay || !iconContainer || !titleEl) return;

        iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
        titleEl.textContent = `Conquista: ${title}`;
        achievementModal.classList.add('show');
        achievementOverlay.classList.add('show');
        
        if(typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 103 });
        }
    }
    function hideAchievementModal() {
        achievementModal?.classList.remove('show');
        achievementOverlay?.classList.remove('show');
    }

    function toggleFocusMode() {
        const isEnteringFocusMode = !document.body.classList.contains('focus-mode');
        document.body.classList.toggle('focus-mode');
        
        if (!isEnteringFocusMode) {
            closeSidebar();
        }
    }

    function setupConcludeButtonListener() {
        if (!currentModuleId) return;
        const b = document.querySelector(`.conclude-button[data-module="${currentModuleId}"]`);
        if(b) {
            if (concludeButtonClickListener) {
                b.removeEventListener('click', concludeButtonClickListener);
            }

            if(completedModules.includes(currentModuleId)){
                b.disabled=true;
                b.innerHTML='<i class="fas fa-check-circle mr-2"></i> Concluído';
            } else {
                b.disabled = false;
                b.innerHTML = 'Concluir Módulo';
                concludeButtonClickListener = () => handleConcludeButtonClick(b);
                b.addEventListener('click', concludeButtonClickListener);
            }
        }
    }
    let concludeButtonClickListener = null;
    function handleConcludeButtonClick(b) {
        const id = b.dataset.module;
        if (id && !completedModules.includes(id)) {
            completedModules.push(id);
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            updateProgress();
            b.disabled = true;
            b.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Concluído';
            showAchievementToast(moduleContent[id].title);
            if(typeof confetti === 'function') {
                confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, zIndex: 2000 });
            }

            setTimeout(() => {
                const navContainer = document.getElementById('module-nav');
                const nextButton = document.getElementById('next-module');
                if (navContainer) {
                    navContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (nextButton && !nextButton.disabled) {
                        nextButton.classList.add('blinking-button');
                    }
                }
            }, 700);
        }
    }
    function updateActiveModuleInList() {
        document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('active', i.dataset.module === currentModuleId));
    }
    function updateNavigationButtons() {
        const prevModule = document.getElementById('prev-module');
        const nextModule = document.getElementById('next-module');
        if (!prevModule || !nextModule) return;

        if (!currentModuleId) {
             prevModule.disabled = true;
             nextModule.disabled = true;
             return;
        }
        const n = parseInt(currentModuleId.replace('module',''));
        prevModule.disabled = (n === 1);
        nextModule.disabled = (n === totalModules);
    }
    function setupQuizListeners() {
        document.querySelectorAll('.quiz-option').forEach(o => o.addEventListener('click', handleQuizOptionClick));
    }

    // --- FUNÇÃO ADDEVENTLISTENERS (COM LÓGICA DO MODAL DE RESET) ---
    function addEventListeners() {
        const nextButton = document.getElementById('next-module');
        const prevButton = document.getElementById('prev-module');
        const homeButtonDesktop = document.getElementById('home-button-desktop');
        const homeButtonBottom = document.getElementById('bottom-nav-home');
        
        document.body.addEventListener('click', e => {
            const moduleItem = e.target.closest('.module-list-item');
            if (moduleItem) {
                loadModuleContent(moduleItem.dataset.module);
                nextButton?.classList.remove('blinking-button');
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
        
        prevButton?.addEventListener('click', () => {
            if (!currentModuleId) return;
            const n = parseInt(currentModuleId.replace('module',''));
            if(n > 1) loadModuleContent(`module${n-1}`);
            nextButton?.classList.remove('blinking-button');
        });
        nextButton?.addEventListener('click', () => {
            if (!currentModuleId) return;
            const n = parseInt(currentModuleId.replace('module',''));
            if(n < totalModules) loadModuleContent(`module${n+1}`);
            nextButton?.classList.remove('blinking-button');
        });
        
        document.getElementById('mobile-menu-button')?.addEventListener('click', openSidebar);
        document.getElementById('close-sidebar-button')?.addEventListener('click', closeSidebar);
        sidebarOverlay?.addEventListener('click', closeSidebar);
        
        homeButtonDesktop?.addEventListener('click', goToHomePage);
        homeButtonBottom?.addEventListener('click', goToHomePage);
        
        document.getElementById('bottom-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('bottom-nav-theme')?.addEventListener('click', toggleTheme);
        document.getElementById('dark-mode-toggle-desktop')?.addEventListener('click', toggleTheme);
        
        document.getElementById('focus-mode-toggle')?.addEventListener('click', toggleFocusMode);
        document.getElementById('bottom-nav-focus')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-menu-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-menu-exit')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-nav-exit')?.addEventListener('click', toggleFocusMode);

        const congratsModal = document.getElementById('congratulations-modal');
        const modalOverlay = document.getElementById('modal-overlay');
        
        document.getElementById('close-congrats')?.addEventListener('click', () => {
            if (congratsModal) congratsModal.classList.remove('show');
            if (modalOverlay) modalOverlay.classList.remove('show');
        });
        modalOverlay?.addEventListener('click', () => {
            if (congratsModal) congratsModal.classList.remove('show');
            if (modalOverlay) modalOverlay.classList.remove('show');
        });
        
        closeAchButton?.addEventListener('click', hideAchievementModal);
        achievementOverlay?.addEventListener('click', hideAchievementModal);


        document.body.addEventListener('input', e => {
            if(e.target.matches('.module-search')) {
                const s = e.target.value.toLowerCase();
                const container = e.target.closest('div.relative');
                if (container) {
                    const accordionContainer = container.nextElementSibling;
                    if (accordionContainer) {
                         accordionContainer.querySelectorAll('.module-list-item').forEach(i => {
                            i.style.display = i.textContent.toLowerCase().includes(s) ? 'flex' : 'none';
                        });
                    }
                }
            }
        });

        const resetButton = document.getElementById('reset-progress');
        resetButton?.addEventListener('click', () => {
             resetModal?.classList.add('show');
             resetOverlay?.classList.add('show');
        });
        
        cancelResetButton?.addEventListener('click', () => {
            resetModal?.classList.remove('show');
            resetOverlay?.classList.remove('show');
        });

        confirmResetButton?.addEventListener('click', () => {
            localStorage.removeItem('gateBombeiroCompletedModules_v3');
            localStorage.removeItem('gateBombeiroNotifiedAchievements_v3');
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('note-')) {
                    localStorage.removeItem(key);
                }
            });
            
            alert('Progresso local resetado.');
            window.location.reload();
        });
        
        const backToTopButton = document.getElementById('back-to-top');
        if (backToTopButton) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    backToTopButton.style.display = 'flex';
                    setTimeout(() => {
                        backToTopButton.style.opacity = '1';
                        backToTopButton.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    backToTopButton.style.opacity = '0';
                    backToTopButton.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        backToTopButton.style.display = 'none';
                    }, 300);
                }
            });

            backToTopButton.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // --- MICRO ANIMAÇÃO DE SUCESSO ---
    function triggerSuccessParticles(clickEvent, element) {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 28,
          spread: 70,
          startVelocity: 45,
          origin: {
            x: (clickEvent && clickEvent.clientX) ? clickEvent.clientX / window.innerWidth : 0.5,
            y: (clickEvent && clickEvent.clientY) ? clickEvent.clientY / window.innerHeight : 0.5
          },
          colors: ['#FFD700', '#FFCF66', '#F7A325'],
          zIndex: 3000
        });
      }
      const container = document.createElement('div');
      container.className = 'gold-particles-container';
      container.style.position = 'fixed'; 
      container.style.left = '0';
      container.style.top = '0';
      container.style.pointerEvents = 'none';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.zIndex = '4000';
      document.body.appendChild(container);
      const rect = (element && element.getBoundingClientRect) ? element.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
      const cx = rect.left + (rect.width / 2);
      const cy = rect.top + (rect.height / 2);
      for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'gold-particle';
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.transform = 'translate(-50%, -50%)';
        container.appendChild(p);
        const dx = (Math.random() - 0.5) * 180;
        const dy = -Math.random() * 150 - 20;
        const rot = Math.random() * 360;
        p.animate(
          [
            { transform: `translate(-50%, -50%) translate(0px, 0px) rotate(0deg)`, opacity: 1 },
            { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }
          ],
          {
            duration: 900 + Math.random() * 400,
            easing: 'cubic-bezier(.2,.7,.2,1)'
          }
        );
        setTimeout(() => p.remove(), 1500);
      }
      setTimeout(() => { if (container && container.parentNode) container.remove(); }, 1800);
    }

    // ===== HEADER SCROLL EFFECT (MOVIDO) =====
    function setupHeaderScroll() {
        const header = document.getElementById('main-header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            });
        }
    }

    // ===== EFEITO RIPPLE (MOVIDO) =====
    function setupRippleEffects() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.action-button');
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

            const option = e.target.closest('.quiz-option');
            if (option) {
                const oldRipple = option.querySelector('.ripple');
                if (oldRipple) oldRipple.remove();

                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = option.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
                ripple.style.top = e.clientY - rect.top - size / 2 + 'px';

                option.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            }
        });
    }

    // --- INICIALIZAÇÃO DO APP ---
    // A chamada init() agora está segura dentro do DOMContentLoaded.
    init();
});
