/* === ARQUIVO app_final.js (VERSÃO FINAL V9 - COMPLETA COM FOTO NA CARTEIRINHA) === */

document.addEventListener('DOMContentLoaded', () => {

    // --- VARIÁVEIS GLOBAIS DO APP ---
    const contentArea = document.getElementById('content-area');
    const totalModules = Object.keys(window.moduleContent || {}).length; 
    let completedModules = JSON.parse(localStorage.getItem('gateBombeiroCompletedModules_v3')) || [];
    let notifiedAchievements = JSON.parse(localStorage.getItem('gateBombeiroNotifiedAchievements_v3')) || [];
    let currentModuleId = null;
    let cachedQuestionBanks = {}; 
    let currentUserData = null; 

    // --- VARIÁVEIS PARA O SIMULADO ---
    let simuladoTimerInterval = null;
    let simuladoTimeLeft = 0;
    let activeSimuladoQuestions = [];
    let userAnswers = {};
    let currentSimuladoQuestionIndex = 0; 

    // --- VARIÁVEIS PARA MODO SOBREVIVÊNCIA ---
    let survivalLives = 3;
    let survivalScore = 0;
    let survivalQuestions = [];
    let currentSurvivalIndex = 0;

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
    document.getElementById('acc-dyslexic')?.addEventListener('click', () => {
        document.body.classList.toggle('dyslexic-font');
    });
    document.getElementById('acc-spacing')?.addEventListener('click', () => {
        document.body.classList.toggle('high-spacing');
    });

    // --- AUDIOBOOK ---
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

        const div = document.createElement('div');
        div.innerHTML = moduleContent[currentModuleId].content;
        const cleanText = div.textContent || div.innerText || "";

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.8; 

        utterance.onstart = () => {
            document.getElementById('audio-btn-icon')?.classList.remove('fa-headphones');
            document.getElementById('audio-btn-icon')?.classList.add('fa-stop');
            document.getElementById('audio-btn-text').textContent = 'Parar Áudio';
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
        document.getElementById('main-header')?.classList.add('hidden');
        document.querySelector('footer')?.classList.add('hidden');
        return; 
    }

    function init() {
        setupProtection();
        setupTheme();
        
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
        
        document.getElementById('name-prompt-modal')?.classList.remove('show');
        document.getElementById('name-modal-overlay')?.classList.remove('show');
        document.getElementById('expired-modal')?.classList.remove('show');
        
        const greetingEl = document.getElementById('welcome-greeting');
        if(greetingEl) greetingEl.textContent = `Olá, ${userData.name.split(' ')[0]}!`;
        
        if (printWatermark) {
            printWatermark.textContent = `Licenciado para ${userData.name} (CPF: ${userData.cpf || '...'}) - Proibida a Cópia`;
        }

        if (userData.isAdmin === true) {
            if(adminBtn) adminBtn.classList.remove('hidden');
            if(mobileAdminBtn) mobileAdminBtn.classList.remove('hidden');
        }

        checkTrialStatus(userData.acesso_ate);

        document.getElementById('total-modules').textContent = totalModules;
        document.getElementById('course-modules-count').textContent = totalModules;
        
        populateModuleLists();
        updateProgress();
        addEventListeners(); 
        handleInitialLoad();
    }

    // --- FUNÇÕES ADMIN ---
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
                const isPremium = u.status === 'premium';
                const validade = u.acesso_ate ? new Date(u.acesso_ate).toLocaleDateString('pt-BR') : '-';
                const cpf = u.cpf || 'Sem CPF';
                const planoTipo = u.planType || (isPremium ? 'Indefinido' : 'Trial');
                const deviceInfo = u.last_device || 'Desconhecido';
                const noteIconColor = u.adminNote ? 'text-yellow-500' : 'text-gray-400';
                const row = `
                    <tr class="border-b hover:bg-gray-50 transition-colors">
                        <td class="p-3 font-bold text-gray-800">${u.name}</td>
                        <td class="p-3 text-gray-600 text-sm">${u.email}<br><span class="text-xs text-gray-500">CPF: ${cpf}</span></td>
                        <td class="p-3 text-xs text-gray-500 max-w-[150px] truncate" title="${deviceInfo}">${deviceInfo}</td>
                        <td class="p-3">
                            <div class="flex flex-col items-start">
                                <span class="px-2 py-1 rounded text-xs font-bold uppercase ${isPremium ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                    ${u.status || 'trial'}
                                </span>
                                <span class="text-xs text-gray-500 mt-1">${planoTipo}</span>
                            </div>
                        </td>
                        <td class="p-3 text-sm font-medium">${validade}</td>
                        <td class="p-3 flex flex-wrap gap-2">
                            <button onclick="editUserData('${uid}', '${u.name}', '${cpf}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Editar Dados"><i class="fas fa-pen"></i></button>
                            <button onclick="editUserNote('${uid}', '${(u.adminNote || '').replace(/'/g, "\\'")}')" class="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-2 py-1.5 rounded text-xs shadow" title="Observações"><i class="fas fa-sticky-note ${noteIconColor}"></i></button>
                            <button onclick="manageUserAccess('${uid}', '${u.acesso_ate}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Gerenciar Acesso"><i class="fas fa-calendar-alt"></i></button>
                            <button onclick="sendResetEmail('${u.email}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Resetar Senha"><i class="fas fa-key"></i></button>
                            <button onclick="deleteUser('${uid}', '${u.name}', '${cpf}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Erro ao carregar: ${err.message}</td></tr>`;
        }
    };

    window.editUserData = async function(uid, oldName, oldCpf) {
        const newName = prompt("Novo nome do aluno:", oldName);
        if (newName === null) return;
        const newCpfRaw = prompt("Novo CPF (apenas números):", oldCpf === 'Sem CPF' ? '' : oldCpf);
        if (newCpfRaw === null) return;
        const newCpf = newCpfRaw.replace(/\D/g, ''); 
        if (!newName || !newCpf) { alert("Nome e CPF são obrigatórios."); return; }
        try {
            const batch = window.__fbDB.batch();
            const userRef = window.__fbDB.collection('users').doc(uid);
            batch.update(userRef, { name: newName, cpf: newCpf });
            if (oldCpf !== 'Sem CPF' && oldCpf !== newCpf) {
                batch.delete(window.__fbDB.collection('cpfs').doc(oldCpf));
                batch.set(window.__fbDB.collection('cpfs').doc(newCpf), { uid: uid });
            } else if (oldCpf === 'Sem CPF') {
                batch.set(window.__fbDB.collection('cpfs').doc(newCpf), { uid: uid });
            }
            await batch.commit();
            alert("Dados atualizados!");
            openAdminPanel();
        } catch (err) { alert("Erro: " + err.message); }
    };

    window.manageUserAccess = async function(uid, currentExpiryStr) {
        const opcao = prompt("Gerenciar Plano e Validade:\n\n1 - MENSAL (+30 dias)\n2 - SEMESTRAL (+180 dias)\n3 - ANUAL (+365 dias)\n4 - PERMANENTE (10 anos)\n5 - PERSONALIZADO (Adicionar/Remover dias)\n\nDigite o número da opção:");
        if (!opcao) return;
        let diasToAdd = 0;
        let novoPlano = '';
        if (opcao === '1') { diasToAdd = 30; novoPlano = 'Mensal'; }
        else if (opcao === '2') { diasToAdd = 180; novoPlano = 'Semestral'; }
        else if (opcao === '3') { diasToAdd = 365; novoPlano = 'Anual'; }
        else if (opcao === '4') { diasToAdd = 3650; novoPlano = 'Vitalício'; }
        else if (opcao === '5') {
            const diasInput = prompt("Digite a quantidade de dias para adicionar (ex: 15) ou remover (ex: -5):");
            if(!diasInput) return;
            diasToAdd = parseInt(diasInput);
            novoPlano = 'Personalizado';
        }
        else { alert("Opção inválida"); return; }

        const hoje = new Date();
        let baseDate = new Date(currentExpiryStr);
        if (isNaN(baseDate.getTime()) || baseDate < hoje) baseDate = hoje;
        baseDate.setDate(baseDate.getDate() + diasToAdd);
        const newExpiryISO = baseDate.toISOString();

        try {
            await window.__fbDB.collection('users').doc(uid).update({ status: 'premium', acesso_ate: newExpiryISO, planType: novoPlano });
            alert("Acesso atualizado com sucesso!");
            openAdminPanel();
        } catch (err) { alert("Erro ao atualizar: " + err.message); }
    };

    window.editUserNote = async function(uid, currentNote) {
        const newNote = prompt("Observações sobre este aluno:", currentNote);
        if (newNote === null) return; 
        try {
            await window.__fbDB.collection('users').doc(uid).update({ adminNote: newNote });
            alert("Observação salva.");
            openAdminPanel();
        } catch (err) { alert("Erro: " + err.message); }
    };

    window.deleteUser = async function(uid, name, cpf) {
        if(confirm(`TEM CERTEZA que deseja excluir o aluno ${name}?`)) {
            const userConfirm = prompt("Para confirmar, digite DELETAR:");
            if (userConfirm !== "DELETAR") return;
            try {
                const batch = window.__fbDB.batch();
                batch.delete(window.__fbDB.collection('users').doc(uid));
                if (cpf && cpf !== 'Sem CPF' && cpf !== 'undefined') batch.delete(window.__fbDB.collection('cpfs').doc(cpf));
                await batch.commit();
                alert("Usuário excluído.");
                openAdminPanel();
            } catch (err) { alert("Erro ao excluir: " + err.message); }
        }
    };

    window.sendResetEmail = async function(email) {
        if(confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) {
            try {
                await window.__fbAuth.sendPasswordResetEmail(email);
                alert('E-mail enviado!');
            } catch(err) { alert('Erro: ' + err.message); }
        }
    };

    function checkTrialStatus(expiryDateString) {
        const expiryDate = new Date(expiryDateString);
        const today = new Date();
        const diffTime = expiryDate - today; 
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const trialToast = document.getElementById('trial-floating-notify');
        const daysLeftSpan = document.getElementById('trial-days-left');
        const trialBtn = document.getElementById('trial-subscribe-btn');
        const closeTrialBtn = document.getElementById('close-trial-notify');
        const trialTitle = document.getElementById('trial-title-text');

        if (trialToast && diffDays <= 30 && diffDays >= 0) {
            trialToast.classList.remove('hidden');
            if(daysLeftSpan) daysLeftSpan.textContent = diffDays;
            if(trialTitle) trialTitle.textContent = "Período de Experiência";
            trialBtn?.addEventListener('click', () => {
                document.getElementById('expired-modal').classList.add('show');
                document.getElementById('name-modal-overlay').classList.add('show');
            });
            closeTrialBtn?.addEventListener('click', () => { trialToast.classList.add('hidden'); });
        }
    }

    function setupAuthEventListeners() {
        const nameField = document.getElementById('name-field-container');
        const cpfField = document.getElementById('cpf-field-container'); 
        const nameInput = document.getElementById('name-input');
        const cpfInput = document.getElementById('cpf-input'); 
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
        const btnOpenPayHeader = document.getElementById('header-subscribe-btn');
        const btnOpenPayMobile = document.getElementById('mobile-subscribe-btn');
        const btnOpenPayLogin = document.getElementById('open-payment-login-btn');
        const expiredModal = document.getElementById('expired-modal');
        const closePayModal = document.getElementById('close-payment-modal-btn');
        const loginModalOverlay = document.getElementById('name-modal-overlay');
        const loginModal = document.getElementById('name-prompt-modal');

        function openPaymentModal() {
            expiredModal.classList.add('show');
            if (loginModalOverlay) loginModalOverlay.classList.add('show');
            if (loginModal && loginModal.classList.contains('show')) {
                loginModal.classList.remove('show');
                loginModal.dataset.wasOpen = 'true'; 
            }
        }
        btnOpenPayHeader?.addEventListener('click', openPaymentModal);
        btnOpenPayMobile?.addEventListener('click', openPaymentModal);
        btnOpenPayLogin?.addEventListener('click', openPaymentModal);
        closePayModal?.addEventListener('click', () => {
            expiredModal.classList.remove('show');
            if (loginModal && loginModal.dataset.wasOpen === 'true') {
                loginModal.classList.add('show');
                loginModal.dataset.wasOpen = 'false';
            } else {
                if (document.body.getAttribute('data-app-ready') === 'true') {
                     loginModalOverlay?.classList.remove('show');
                } else {
                    loginModal?.classList.add('show');
                }
            }
        });
        btnShowSignup?.addEventListener('click', () => {
            loginGroup.classList.add('hidden');
            signupGroup.classList.remove('hidden');
            nameField.classList.remove('hidden');
            cpfField.classList.remove('hidden'); 
            authTitle.textContent = "Criar Nova Conta";
            authMsg.textContent = "Cadastre-se para o Período de Experiência.";
            feedback.textContent = "";
        });
        btnShowLogin?.addEventListener('click', () => {
            loginGroup.classList.remove('hidden');
            signupGroup.classList.add('hidden');
            nameField.classList.add('hidden');
            cpfField.classList.add('hidden'); 
            authTitle.textContent = "Área do Aluno";
            authMsg.textContent = "Acesso Restrito";
            feedback.textContent = "";
        });
        btnLogin?.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                feedback.textContent = "Preencha e-mail e senha.";
                feedback.className = "text-center text-sm mt-4 font-semibold text-red-500";
                return;
            }
            feedback.textContent = "Entrando...";
            feedback.className = "text-center text-sm mt-4 text-blue-400 font-semibold";
            try {
                localStorage.removeItem('my_session_id'); 
                await FirebaseCourse.signInWithEmail(email, password);
                feedback.textContent = "Verificando...";
            } catch (error) {
                feedback.className = "text-center text-sm mt-4 text-red-400 font-semibold";
                feedback.textContent = "Erro ao entrar. Verifique seus dados.";
            }
        });
        btnSignup?.addEventListener('click', async () => {
            const name = nameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            const cpf = cpfInput.value;
            if (!name || !email || !password || !cpf) {
                feedback.textContent = "Todos os campos são obrigatórios.";
                feedback.className = "text-center text-sm mt-4 font-semibold text-red-500";
                return;
            }
            feedback.textContent = "Criando conta...";
            feedback.className = "text-center text-sm mt-4 text-blue-400 font-semibold";
            try {
                await FirebaseCourse.signUpWithEmail(name, email, password, cpf);
                feedback.textContent = "Sucesso! Iniciando...";
            } catch (error) {
                feedback.className = "text-center text-sm mt-4 text-red-400 font-semibold";
                feedback.textContent = error.message || "Erro ao criar conta.";
            }
        });
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

    async function generateSimuladoQuestions(config) {
        const allQuestions = [];
        const questionsByCategory = {};
        
        for (const catKey in moduleCategories) {
            questionsByCategory[catKey] = [];
            const cat = moduleCategories[catKey];
            for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                const modId = `module${i}`;
                if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA[modId]) {
                    questionsByCategory[catKey].push(...QUIZ_DATA[modId]);
                }
            }
        }

        for (const [catKey, qty] of Object.entries(config.distribution)) {
            if (questionsByCategory[catKey]) {
                const shuffled = shuffleArray(questionsByCategory[catKey]);
                allQuestions.push(...shuffled.slice(0, qty));
            }
        }
        
        return shuffleArray(allQuestions);
    }

    // --- CARREGAMENTO DE MÓDULOS (ROTEADOR PRINCIPAL) ---
    async function loadModuleContent(id) {
        if (!id || !moduleContent[id]) return;
        const d = moduleContent[id];
        const num = parseInt(id.replace('module', ''));
        let moduleCategory = null;
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            if (num >= cat.range[0] && num <= cat.range[1]) { moduleCategory = cat; break; }
        }
        const isPremiumContent = moduleCategory && moduleCategory.isPremium;
        const userIsNotPremium = !currentUserData || currentUserData.status !== 'premium';

        // Verifica bloqueio premium
        if (isPremiumContent && userIsNotPremium) { renderPremiumLockScreen(moduleContent[id].title); return; }

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
                    <h3 class="text-3xl mb-4 pb-4 border-b text-blue-600 dark:text-blue-400 flex items-center">
                        <i class="fas fa-tools mr-3"></i> Ferramentas Operacionais
                    </h3>
                    <div id="tools-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
                `;
                const grid = document.getElementById('tools-grid');
                if (typeof ToolsApp !== 'undefined') {
                    ToolsApp.renderPonto(grid);
                    ToolsApp.renderEscala(grid);
                    ToolsApp.renderPlanner(grid);
                    ToolsApp.renderWater(grid);
                    ToolsApp.renderNotes(grid);
                    ToolsApp.renderHealth(grid);
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
                contentArea.innerHTML = d.content;
                document.getElementById('start-rpg-btn').addEventListener('click', () => initRPGGame(d.rpgData));
            }

            // 5. CARTEIRINHA (Módulo 62)
            else if (d.isIDCard) {
                contentArea.innerHTML = d.content;
                renderDigitalID();
            }

            // 6. MODO AULA NORMAL (TEXTO + AUDIO)
            else {
                let html = `
                    <h3 class="flex items-center text-3xl mb-6 pb-4 border-b"><i class="${d.iconClass} mr-4 ${getCategoryColor(id)} fa-fw"></i>${d.title}</h3>
                    
                    <div id="audio-btn" class="audio-controls mb-6" onclick="window.speakContent()">
                        <i id="audio-btn-icon" class="fas fa-headphones text-lg mr-2"></i>
                        <span id="audio-btn-text">Ouvir Aula</span>
                    </div>

                    <div>${d.content}</div>
                `;

                const isSpecialModule = ['module53', 'module54', 'module55', 'module56', 'module57', 'module58', 'module59', 'module60', 'module61', 'module62'].includes(id);

                if (d.driveLink) {
                    if (userIsNotPremium) {
                        html += `<div class="mt-10 mb-8"><button onclick="document.getElementById('expired-modal').classList.add('show'); document.getElementById('name-modal-overlay').classList.add('show');" class="drive-button opacity-75 hover:opacity-100 relative overflow-hidden"><div class="absolute inset-0 bg-black/30 flex items-center justify-center z-10"><i class="fas fa-lock text-2xl mr-2"></i></div><span class="blur-[2px] flex items-center"><i class="fab fa-google-drive mr-3"></i> VER FOTOS E VÍDEOS (PREMIUM)</span></button><p class="text-xs text-center mt-2 text-gray-500"><i class="fas fa-lock text-yellow-500"></i> Recurso exclusivo para assinantes</p></div>`;
                    } else {
                        html += `<div class="mt-10 mb-8"><a href="${d.driveLink}" target="_blank" class="drive-button"><i class="fab fa-google-drive"></i>VER FOTOS E VÍDEOS DESTA MATÉRIA</a></div>`;
                    }
                }

                const savedNote = localStorage.getItem('note-' + id) || '';

                let allQuestions = null;
                try { allQuestions = await loadQuestionBank(id); } catch(error) { console.error(error); }

                if (allQuestions && allQuestions.length > 0) {
                    const count = Math.min(allQuestions.length, 4); 
                    const shuffledQuestions = shuffleArray([...allQuestions]); 
                    const selectedQuestions = shuffledQuestions.slice(0, count);
                    
                    let quizHtml = `<div class="quiz-section-separator"></div><h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Exercícios de Fixação</h3>`;
                    selectedQuestions.forEach((q, index) => {
                        const questionNumber = index + 1;
                        quizHtml += `<div class="quiz-block" data-question-id="${q.id}"><p class="font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">${questionNumber}. ${q.question}</p><div class="quiz-options-group space-y-2 mb-4">`;
                        for (const key in q.options) {
                            quizHtml += `<div class="quiz-option" data-module="${id}" data-question-id="${q.id}" data-answer="${key}"><span class="option-key">${key.toUpperCase()})</span> ${q.options[key]}<span class="ripple"></span></div>`;
                        }
                        quizHtml += `</div><div id="feedback-${q.id}" class="feedback-area hidden"></div></div>`;
                    });
                    html += quizHtml;
                } else {
                    if (!d.id.startsWith('module9') && !isSpecialModule) {
                        html += `<div class="warning-box mt-8"><p><strong><i class="fas fa-exclamation-triangle mr-2"></i> Exercícios não encontrados.</strong></p></div>`;
                    }
                }

                html += `<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-right"><button class="action-button conclude-button" data-module="${id}">Concluir Módulo</button></div><div class="mt-10 pt-6 border-t-2 border-dashed border-gray-200 dark:border-gray-700"><h4 class="text-xl font-bold mb-3 text-secondary dark:text-gray-200"><i class="fas fa-pencil-alt mr-2"></i>Anotações Pessoais</h4><p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Suas notas para este módulo. Elas são salvas automaticamente no seu navegador.</p><textarea id="notes-module-${id}" class="notes-textarea" placeholder="Digite suas anotações aqui...">${savedNote}</textarea></div>`;

                contentArea.innerHTML = html;
                setupQuizListeners();
                setupConcludeButtonListener();
                setupNotesListener(id);
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

    // === LÓGICA: MODO SOBREVIVÊNCIA ===
    async function initSurvivalGame() {
        survivalLives = 3;
        survivalScore = 0;
        currentSurvivalIndex = 0;
        survivalQuestions = [];

        // Coleta todas as questões disponíveis no app
        const allQs = [];
        for(let i=1; i<=52; i++) { // Módulos de conteúdo
            const modId = `module${i}`;
            if(QUIZ_DATA[modId]) allQs.push(...QUIZ_DATA[modId]);
        }
        survivalQuestions = shuffleArray(allQs);

        renderSurvivalScreen();
    }

    function renderSurvivalScreen() {
        if(survivalLives <= 0) {
            // Game Over
            localStorage.setItem('lastSurvivalScore', survivalScore);
            contentArea.innerHTML = `
                <div class="text-center animate-slide-in p-8">
                    <h2 class="text-4xl font-bold text-red-600 mb-4">GAME OVER</h2>
                    <div class="text-6xl mb-6">💀</div>
                    <p class="text-2xl text-gray-800 dark:text-white mb-2">Sua Pontuação Final</p>
                    <div class="text-5xl font-extrabold text-orange-500 mb-8">${survivalScore}</div>
                    <button id="retry-survival" class="action-button pulse-button">Tentar Novamente</button>
                </div>
            `;
            document.getElementById('retry-survival').addEventListener('click', initSurvivalGame);
            return;
        }

        const q = survivalQuestions[currentSurvivalIndex];
        if(!q) {
            // Acabaram as questões (Raro)
            contentArea.innerHTML = `<h2 class="text-center text-2xl">Você zerou o banco de questões! Incrível!</h2>`;
            return;
        }

        let hearts = '';
        for(let i=0; i<survivalLives; i++) hearts += '<i class="fas fa-heart text-red-600 text-2xl mx-1 survival-life-heart"></i>';

        contentArea.innerHTML = `
            <div class="flex justify-between items-center mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow">
                <div class="flex items-center">${hearts}</div>
                <div class="text-xl font-bold text-blue-600 dark:text-blue-400">Pontos: ${survivalScore}</div>
            </div>
            <div class="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg animate-fade-in">
                <p class="font-bold text-lg mb-6 text-gray-800 dark:text-white">Questão ${currentSurvivalIndex + 1}: ${q.question}</p>
                <div class="space-y-3">
                    ${Object.keys(q.options).map(key => `
                        <button class="w-full text-left p-4 rounded border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors survival-option" data-key="${key}">
                            <span class="font-bold text-orange-500 mr-2">${key.toUpperCase()})</span> ${q.options[key]}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        document.querySelectorAll('.survival-option').forEach(btn => {
            btn.addEventListener('click', (e) => handleSurvivalAnswer(e, q));
        });
    }

    function handleSurvivalAnswer(e, q) {
        const selected = e.currentTarget.dataset.key;
        const isCorrect = selected === q.answer;
        const btns = document.querySelectorAll('.survival-option');
        
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.key === q.answer) b.classList.add('bg-green-200', 'dark:bg-green-900', 'border-green-500');
            else if(b.dataset.key === selected && !isCorrect) b.classList.add('bg-red-200', 'dark:bg-red-900', 'border-red-500');
        });

        if(isCorrect) {
            survivalScore += 10;
            if(typeof confetti === 'function') confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
        } else {
            survivalLives--;
            navigator.vibrate?.(200);
        }

        setTimeout(() => {
            currentSurvivalIndex++;
            renderSurvivalScreen();
        }, 1500);
    }

    // === LÓGICA: RPG (SIMULADOR) ===
    async function initRPGGame(rpgData) {
        renderRPGScene(rpgData.start, rpgData);
    }

    function renderRPGScene(sceneId, rpgData) {
        const scene = rpgData.scenes[sceneId];
        if(!scene) return; // Erro ou fim

        let html = `
            <div class="max-w-2xl mx-auto animate-fade-in">
                <div class="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    ${scene.image ? `<img src="${scene.image}" class="w-full h-48 object-cover">` : ''}
                    <div class="p-6">
                        <p class="text-lg text-gray-800 dark:text-gray-200 mb-6 leading-relaxed">${scene.text}</p>
                        <div class="space-y-3">
        `;

        scene.options.forEach(opt => {
            html += `
                <button class="rpg-choice-btn w-full text-left p-4 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all rounded shadow-sm mb-2" data-next="${opt.next}">
                    <i class="fas fa-chevron-right text-blue-500 mr-2"></i> ${opt.text}
                </button>
            `;
        });

        html += `</div></div></div></div>`;
        contentArea.innerHTML = html;

        if(scene.type === 'death') {
            contentArea.querySelector('.bg-white').classList.add('border-red-500', 'border-2');
        } else if(scene.type === 'win') {
            contentArea.querySelector('.bg-white').classList.add('border-green-500', 'border-2');
            if(typeof confetti === 'function') confetti();
        }

        document.querySelectorAll('.rpg-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = btn.dataset.next;
                if(next === 'exit') loadModuleContent('module61'); // Reset
                else renderRPGScene(next, rpgData);
            });
        });
    }

    // === LÓGICA ATUALIZADA: CARTEIRINHA DIGITAL COM FOTO ===
    function renderDigitalID() {
        if (!currentUserData) return;
        
        const container = document.getElementById('id-card-container');
        if (!container) return;

        // Lógica da Foto: Tenta pegar do LocalStorage, senão usa um avatar padrão
        const savedPhoto = localStorage.getItem('user_profile_pic');
        const defaultPhoto = "https://raw.githubusercontent.com/instrutormedeiros/ProjetoBravoCharlie/refs/heads/main/assets/img/LOGO_QUADRADA.png"; 
        const currentPhoto = savedPhoto || defaultPhoto;

        // Formatação de datas
        const validUntil = new Date(currentUserData.acesso_ate).toLocaleDateString('pt-BR');
        const statusColor = currentUserData.status === 'premium' ? 'text-yellow-400' : 'text-gray-400';
        
        container.innerHTML = `
            <div class="relative w-full max-w-md bg-gradient-card rounded-xl overflow-hidden shadow-2xl text-white font-sans transform transition hover:scale-[1.01] duration-300">
                <div class="card-shine"></div>
                
                <div class="bg-red-700 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="bg-white p-1 rounded-full">
                            <img src="https://raw.githubusercontent.com/instrutormedeiros/ProjetoBravoCharlie/refs/heads/main/assets/img/LOGO_QUADRADA.png" class="w-10 h-10 object-cover">
                        </div>
                        <div>
                            <h3 class="font-bold text-sm uppercase tracking-wider">Bombeiro Civil</h3>
                            <p class="text-[10px] text-red-200">Identificação de Aluno</p>
                        </div>
                    </div>
                    <i class="fas fa-wifi text-white/50 rotate-90"></i>
                </div>

                <div class="p-6 relative z-10">
                    
                    <div class="flex justify-between items-start mb-6">
                        <div class="flex items-center gap-4">
                            
                            <div class="relative group cursor-pointer" onclick="document.getElementById('profile-pic-input').click()" title="Clique para alterar a foto">
                                <div class="w-20 h-20 rounded-lg border-2 border-white/30 overflow-hidden bg-gray-800">
                                    <img id="id-card-photo" src="${currentPhoto}" class="w-full h-full object-cover">
                                </div>
                                <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i class="fas fa-camera text-white"></i>
                                </div>
                                <input type="file" id="profile-pic-input" class="hidden" accept="image/*" onchange="window.updateProfilePic(this)">
                            </div>

                            <div>
                                <p class="text-xs text-gray-400 uppercase mb-1">Nome do Aluno</p>
                                <h2 class="text-lg font-bold text-white tracking-wide leading-tight max-w-[150px] break-words">${currentUserData.name}</h2>
                            </div>
                        </div>

                        <div class="bg-white p-1 rounded">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUserData.email}" class="w-14 h-14">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">CPF</p>
                            <p class="font-mono text-sm">${currentUserData.cpf || '000.000.000-00'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">Matrícula</p>
                            <p class="font-mono text-sm">BC-${Math.floor(Math.random()*10000)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">Válido Até</p>
                            <p class="font-bold text-green-400 text-sm">${validUntil}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">Status</p>
                            <p class="font-bold text-sm uppercase flex items-center gap-1 ${statusColor}">
                                <i class="fas fa-star text-xs"></i> ${currentUserData.status || 'Trial'}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="bg-black/30 p-3 text-center border-t border-white/10">
                    <p class="text-[9px] text-gray-500">Uso pessoal e intransferível. Toque na foto para alterar.</p>
                </div>
            </div>
            <div class="text-center mt-6">
                <button onclick="window.print()" class="text-sm text-blue-500 hover:underline"><i class="fas fa-print"></i> Imprimir Carteirinha</button>
            </div>
        `;
    }

    // === FUNÇÃO GLOBAL PARA UPLOAD DE FOTO ===
    window.updateProfilePic = function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('id-card-photo').src = e.target.result;
                localStorage.setItem('user_profile_pic', e.target.result);
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    // === FUNÇÕES PADRÃO DO APP ===
    async function startSimuladoMode(moduleData) {
        loadingSpinner.classList.remove('hidden');
        contentArea.classList.add('hidden');

        activeSimuladoQuestions = await generateSimuladoQuestions(moduleData.simuladoConfig);
        userAnswers = {};
        simuladoTimeLeft = moduleData.simuladoConfig.timeLimit * 60; 
        currentSimuladoQuestionIndex = 0;

        contentArea.innerHTML = `
            <div class="relative pt-4 pb-12">
                <div id="simulado-timer-bar" class="simulado-header-sticky shadow-lg">
                    <span class="simulado-timer flex items-center"><i class="fas fa-clock mr-2 text-lg"></i><span id="timer-display">60:00</span></span>
                    <span class="simulado-progress text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Questão <span id="q-current">1</span> / ${activeSimuladoQuestions.length}</span>
                </div>
                
                <div class="mt-10 mb-6 px-2 text-center">
                     <h3 class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white border-b pb-2 inline-block">${moduleData.title}</h3>
                </div>

                <div id="question-display-area" class="simulado-question-container"></div>
                
                <div class="mt-8 flex justify-between items-center">
                    <button id="sim-prev-btn" class="sim-nav-btn sim-btn-prev shadow" style="visibility: hidden;"><i class="fas fa-arrow-left mr-2"></i> Anterior</button>
                    <button id="sim-next-btn" class="sim-nav-btn sim-btn-next shadow">Próxima <i class="fas fa-arrow-right ml-2"></i></button>
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
        const savedAnswer = userAnswers[q.id] || null;
        
        let html = `
            <div class="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 animate-slide-in">
                <p class="font-bold text-lg mb-6 text-gray-800 dark:text-white">${index+1}. ${q.question}</p>
                <div class="space-y-3">
        `;
        for (const key in q.options) {
            const isChecked = savedAnswer === key ? 'checked' : '';
            html += `
                <label class="flex items-center p-4 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input type="radio" name="q-curr" value="${key}" class="mr-4 w-5 h-5 text-orange-600 focus:ring-orange-500" ${isChecked} onchange="registerSimuladoAnswer('${q.id}', '${key}')">
                    <span class="text-base text-gray-700 dark:text-gray-300"><strong class="mr-2 text-orange-500">${key.toUpperCase()})</strong> ${q.options[key]}</span>
                </label>
            `;
        }
        html += `</div></div>`;
        container.innerHTML = html;

        document.getElementById('q-current').innerText = index + 1;
        
        const prevBtn = document.getElementById('sim-prev-btn');
        const nextBtn = document.getElementById('sim-next-btn');
        
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        if (index === activeSimuladoQuestions.length - 1) {
            nextBtn.innerHTML = '<i class="fas fa-check-double mr-2"></i> ENTREGAR';
            nextBtn.className = "sim-nav-btn bg-green-600 text-white hover:bg-green-500 shadow-lg transform hover:scale-105 transition-transform";
        } else {
            nextBtn.innerHTML = 'Próxima <i class="fas fa-arrow-right ml-2"></i>';
            nextBtn.className = "sim-nav-btn sim-btn-next";
        }
    }

    function navigateSimulado(direction, moduleId) {
        const newIndex = currentSimuladoQuestionIndex + direction;
        if (newIndex >= 0 && newIndex < activeSimuladoQuestions.length) {
            currentSimuladoQuestionIndex = newIndex;
            showSimuladoQuestion(newIndex);
            window.scrollTo({ top: 100, behavior: 'smooth' });
        } else if (newIndex >= activeSimuladoQuestions.length) {
            if(confirm("Tem certeza que deseja entregar o simulado?")) {
                finishSimulado(moduleId);
            }
        }
    }

    window.registerSimuladoAnswer = function(qId, answer) {
        userAnswers[qId] = answer;
    };

    function startTimer(moduleId) {
        const display = document.getElementById('timer-display');
        simuladoTimerInterval = setInterval(() => {
            simuladoTimeLeft--;
            const m = Math.floor(simuladoTimeLeft / 60);
            const s = simuladoTimeLeft % 60;
            display.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
            
            if (simuladoTimeLeft <= 0) {
                clearInterval(simuladoTimerInterval);
                alert("Tempo esgotado! O simulado será encerrado.");
                finishSimulado(moduleId);
            }
        }, 1000);
    }

    function finishSimulado(moduleId) {
        clearInterval(simuladoTimerInterval);
        let correctCount = 0;
        const total = activeSimuladoQuestions.length;
        let feedbackHtml = '<div class="space-y-4">';

        activeSimuladoQuestions.forEach((q, i) => {
            const selected = userAnswers[q.id];
            const isCorrect = selected === q.answer;
            if(isCorrect) correctCount++;
            
            const statusClass = isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20';
            const correctAnswerText = q.options[q.answer];
            const selectedAnswerText = selected ? q.options[selected] : "Não respondeu";
            const explanation = q.explanation || "Sem explicação disponível.";

            feedbackHtml += `
                <div class="p-4 rounded border-l-4 ${statusClass} mb-4">
                    <p class="font-bold text-gray-800 dark:text-gray-200 text-sm mb-3">${i+1}. ${q.question}</p>
                    <div class="grid grid-cols-1 gap-3 text-xs mb-3">
                        <div class="p-2 rounded ${isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
                            <span class="font-bold block mb-1">Sua Resposta:</span> 
                            ${selected ? selected.toUpperCase() + ') ' + selectedAnswerText : 'Em branco'}
                        </div>
                        ${!isCorrect ? `
                        <div class="p-2 rounded bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800">
                            <span class="font-bold block mb-1">Resposta Correta:</span> 
                            ${q.answer.toUpperCase()}) ${correctAnswerText}
                        </div>
                        ` : ''}
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <strong><i class="fas fa-info-circle mr-1 text-blue-500"></i> Explicação:</strong><br> ${explanation}
                    </div>
                </div>
            `;
        });
        feedbackHtml += '</div>';

        const score = (correctCount / total) * 10;
        const finalHtml = `
            <div class="simulado-result-card mb-8 animate-slide-in">
                <h2 class="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Resultado Final</h2>
                <div class="simulado-score-circle">${score.toFixed(1)}</div>
                <p class="text-lg text-gray-600 dark:text-gray-300">Acertou <strong>${correctCount}</strong> de <strong>${total}</strong> questões.</p>
            </div>
            <h4 class="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b pb-2">Gabarito & Explicações</h4>
            ${feedbackHtml}
            <div class="text-center mt-8"><button onclick="location.reload()" class="action-button">Voltar ao Início</button></div>
        `;
        
        contentArea.innerHTML = finalHtml;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (!completedModules.includes(moduleId)) {
            completedModules.push(moduleId);
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            updateProgress();
        }
    }

    function renderPremiumLockScreen(title) {
        contentArea.innerHTML = `<div class="text-center py-12 px-6"><div class="inline-block p-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6"><i class="fas fa-lock text-5xl text-yellow-600 dark:text-yellow-500"></i></div><h2 class="text-3xl font-bold mb-4 text-gray-800 dark:text-white">Conteúdo Exclusivo</h2><p class="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">O módulo <strong>${title}</strong> faz parte do nosso pacote avançado. Assine agora para desbloquear Simulados, Bônus e muito mais.</p><button id="premium-lock-btn" class="action-button pulse-button text-lg px-8 py-4"><i class="fas fa-crown mr-2"></i> DESBLOQUEAR TUDO AGORA</button></div>`;
        document.getElementById('premium-lock-btn').addEventListener('click', () => { document.getElementById('expired-modal').classList.add('show'); document.getElementById('name-modal-overlay').classList.add('show'); });
        updateActiveModuleInList();
        updateNavigationButtons();
    }

    function handleQuizOptionClick(e) {
        const o = e.currentTarget;
        if (o.disabled) return;
        const moduleId = o.dataset.module;
        const questionId = o.dataset.questionId;
        const selectedAnswer = o.dataset.answer;
        const questionData = cachedQuestionBanks[moduleId]?.find(q => q.id === questionId);
        if (!questionData) return; 
        
        const correctAnswer = questionData.answer;
        const correctAnswerText = questionData.options[correctAnswer];
        const explanationText = questionData.explanation || 'Nenhuma explicação disponível.';
        
        const optionsGroup = o.closest('.quiz-options-group');
        const feedbackArea = document.getElementById(`feedback-${questionId}`);
        
        optionsGroup.querySelectorAll(`.quiz-option[data-question-id="${questionId}"]`).forEach(opt => {
            opt.disabled = true;
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
        localStorage.removeItem('gateBombeiroLastModule'); 
        
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

        if (contentArea) contentArea.innerHTML = getWelcomeContent();
        document.getElementById('module-nav')?.classList.add('hidden');
        document.querySelectorAll('.module-list-item.active').forEach(i => i.classList.remove('active'));
        currentModuleId = null;
        closeSidebar();
        const btn = document.getElementById('start-course');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => { loadModuleContent('module1'); });
        }
        updateBreadcrumbs();
    }

    function getWelcomeContent() {
        return `<div class="text-center py-8"><div class="floating inline-block p-5 bg-red-100 dark:bg-red-900/50 rounded-full mb-6"><i class="fas fa-fire-extinguisher text-6xl text-red-600"></i></div><h2 class="text-4xl font-bold mb-4 text-blue-900 dark:text-white">Torne-se um Profissional de Elite</h2><p class="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">Bem-vindo ao <strong class="font-bold text-orange-500 dark:text-orange-400">Curso de Formação para Bombeiro Civil e Brigadista</strong>.</p><button id="start-course" class="action-button pulse text-lg"><i class="fas fa-play-circle mr-2"></i> Iniciar Curso Agora</button></div>`;
    }

    function setupProtection() {
        document.body.style.userSelect = 'none';
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey) { if (['c','a','x','v','s','p','u'].includes(e.key.toLowerCase())) e.preventDefault(); } if (e.key === 'F12') e.preventDefault(); });
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
            [newArray[i], newArray[j]] = [newArray[i], newArray[i]];
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
        let html = `<h2 class="text-2xl font-semibold mb-5 flex items-center text-blue-900 dark:text-white"><i class="fas fa-list-ul mr-3 text-orange-500"></i> Conteúdo do Curso</h2><div class="mb-4 relative"><input type="text" class="module-search w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700" placeholder="Buscar módulo..."><i class="fas fa-search absolute right-3 top-3.5 text-gray-400"></i></div><div class="module-accordion-container space-y-2">`;
        for (const k in moduleCategories) {
            const cat = moduleCategories[k];
            const isLocked = cat.isPremium && (!currentUserData || currentUserData.status !== 'premium');
            const lockIcon = isLocked ? '<i class="fas fa-lock text-xs ml-2 text-yellow-500"></i>' : '';
            html += `<div><button class="accordion-button"><span><i class="${cat.icon} w-6 mr-2 text-gray-500"></i>${cat.title} ${lockIcon}</span><i class="fas fa-chevron-down"></i></button><div class="accordion-panel">`;
            for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                const m = moduleContent[`module${i}`];
                if (m) {
                    const isDone = Array.isArray(completedModules) && completedModules.includes(m.id);
                    const itemLock = isLocked ? '<i class="fas fa-lock text-xs text-gray-400 ml-2"></i>' : '';
                    html += `<div class="module-list-item${isDone ? ' completed' : ''}" data-module="${m.id}"><i class="${m.iconClass} module-icon"></i><span style="flex:1">${m.title} ${itemLock}</span>${isDone ? '<i class="fas fa-check-circle completion-icon" aria-hidden="true"></i>' : ''}</div>`;
                }
            }
            html += `</div></div>`;
        }
        html += `</div>`;
        html += `<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"><h3 class="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center"><i class="fas fa-medal mr-2 text-yellow-500"></i> Conquistas por Área</h3><div id="achievements-grid" class="grid grid-cols-2 gap-4">`;
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            html += `<div id="ach-cat-${key}" class="achievement-card" title="Conclua a área para ganhar: ${cat.achievementTitle}"><div class="achievement-icon"><i class="${cat.icon}"></i></div><p class="achievement-title">${cat.achievementTitle}</p></div>`;
        }
        html += `</div></div>`;
        return html;
    }

    function updateProgress() {
        const p = (completedModules.length / totalModules) * 100;
        document.getElementById('progress-text').textContent = `${p.toFixed(0)}%`;
        document.getElementById('completed-modules-count').textContent = completedModules.length;
        if (document.getElementById('progress-bar-minimal')) {
            document.getElementById('progress-bar-minimal').style.width = `${p}%`;
        }
        updateModuleListStyles();
        checkAchievements();
        if (totalModules > 0 && completedModules.length === totalModules) showCongratulations();
    }

    function showCongratulations() {
        document.getElementById('congratulations-modal')?.classList.add('show');
        document.getElementById('modal-overlay')?.classList.add('show');
        if(typeof confetti === 'function') confetti({particleCount:150, spread:90, origin:{y:0.6},zIndex:200});
    }
    function showAchievementToast(title) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas fa-trophy"></i><div><p class="font-bold">Módulo Concluído!</p><p class="text-sm">${title}</p></div>`;
        if (toastContainer) toastContainer.appendChild(toast);
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
        if (newNotification) localStorage.setItem('gateBombeiroNotifiedAchievements_v3', JSON.stringify(notifiedAchievements));
    }
    function showAchievementModal(title, iconClass) {
        const iconContainer = document.getElementById('ach-modal-icon-container');
        const titleEl = document.getElementById('ach-modal-title');
        if (!achievementModal || !achievementOverlay || !iconContainer || !titleEl) return;
        iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
        titleEl.textContent = `Conquista: ${title}`;
        achievementModal.classList.add('show');
        achievementOverlay.classList.add('show');
        if(typeof confetti === 'function') confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 103 });
    }
    function hideAchievementModal() {
        achievementModal?.classList.remove('show');
        achievementOverlay?.classList.remove('show');
    }

    function toggleFocusMode() {
        const isEnteringFocusMode = !document.body.classList.contains('focus-mode');
        document.body.classList.toggle('focus-mode');
        if (!isEnteringFocusMode) closeSidebar();
    }

    function setupConcludeButtonListener() {
        if (!currentModuleId) return;
        const b = document.querySelector(`.conclude-button[data-module="${currentModuleId}"]`);
        if(b) {
            if (concludeButtonClickListener) b.removeEventListener('click', concludeButtonClickListener);
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
            if(typeof confetti === 'function') confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, zIndex: 2000 });
            setTimeout(() => {
                const navContainer = document.getElementById('module-nav');
                const nextButton = document.getElementById('next-module');
                if (navContainer) {
                    navContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (nextButton && !nextButton.disabled) nextButton.classList.add('blinking-button');
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
        nextModule.disabled = (n === totalModules); // Agora totalModules inclui até o 62
    }
    function setupQuizListeners() {
        document.querySelectorAll('.quiz-option').forEach(o => o.addEventListener('click', handleQuizOptionClick));
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
        // 1. Botões de Navegação
        const nextButton = document.getElementById('next-module');
        const prevButton = document.getElementById('prev-module');

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

        // 2. Busca
        document.body.addEventListener('input', e => {
            if(e.target.matches('.module-search')) {
                const s = e.target.value.toLowerCase();
                const container = e.target.closest('div.relative');
                if (container) {
                    const accordionContainer = container.nextElementSibling;
                    if (accordionContainer) {
                            accordionContainer.querySelectorAll('.module-list-item').forEach(i => {
                            const text = i.textContent.toLowerCase();
                            const match = text.includes(s);
                            i.style.display = match ? 'flex' : 'none';
                            if(match && s.length > 0) {
                                const panel = i.closest('.accordion-panel');
                                const btn = panel.previousElementSibling;
                                if(!btn.classList.contains('active')) {
                                    btn.classList.add('active');
                                    panel.style.maxHeight = panel.scrollHeight + "px";
                                }
                            }
                        });
                        if(s.length === 0) {
                            accordionContainer.querySelectorAll('.accordion-button').forEach(btn => {
                                btn.classList.remove('active');
                                btn.nextElementSibling.style.maxHeight = null;
                            });
                        }
                    }
                }
            }
        });

        // 3. Admin Panel (Correção Mobile)
        adminBtn?.addEventListener('click', window.openAdminPanel);
        mobileAdminBtn?.addEventListener('click', window.openAdminPanel);

        closeAdminBtn?.addEventListener('click', () => {
            adminModal.classList.remove('show');
            adminOverlay.classList.remove('show');
        });
        adminOverlay?.addEventListener('click', () => {
            adminModal.classList.remove('show');
            adminOverlay.classList.remove('show');
        });

        // 4. Reset
        document.getElementById('reset-progress')?.addEventListener('click', () => { document.getElementById('reset-modal')?.classList.add('show'); document.getElementById('reset-modal-overlay')?.classList.add('show'); });
        document.getElementById('cancel-reset-button')?.addEventListener('click', () => { document.getElementById('reset-modal')?.classList.remove('show'); document.getElementById('reset-modal-overlay')?.classList.remove('show'); });
        document.getElementById('confirm-reset-button')?.addEventListener('click', () => {
            localStorage.removeItem('gateBombeiroCompletedModules_v3');
            localStorage.removeItem('gateBombeiroNotifiedAchievements_v3');
            Object.keys(localStorage).forEach(key => { if (key.startsWith('note-')) localStorage.removeItem(key); });
            alert('Progresso local resetado.');
            window.location.reload();
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
            const moduleItem = e.target.closest('.module-list-item');
            if (moduleItem) {
                loadModuleContent(moduleItem.dataset.module);
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

        document.getElementById('mobile-menu-button')?.addEventListener('click', openSidebar);
        document.getElementById('close-sidebar-button')?.addEventListener('click', closeSidebar);
        sidebarOverlay?.addEventListener('click', closeSidebar);
        document.getElementById('home-button-desktop')?.addEventListener('click', goToHomePage);
        document.getElementById('bottom-nav-home')?.addEventListener('click', goToHomePage);
        document.getElementById('bottom-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('bottom-nav-theme')?.addEventListener('click', toggleTheme);
        document.getElementById('dark-mode-toggle-desktop')?.addEventListener('click', toggleTheme);
        document.getElementById('focus-mode-toggle')?.addEventListener('click', toggleFocusMode);
        document.getElementById('bottom-nav-focus')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-menu-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-menu-exit')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-nav-exit')?.addEventListener('click', toggleFocusMode);
        document.getElementById('close-congrats')?.addEventListener('click', () => { document.getElementById('congratulations-modal').classList.remove('show'); document.getElementById('modal-overlay').classList.remove('show'); });
        closeAchButton?.addEventListener('click', hideAchievementModal);
        achievementOverlay?.addEventListener('click', hideAchievementModal);
    }

    init();
});
