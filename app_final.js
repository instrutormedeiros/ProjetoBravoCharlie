/* === ARQUIVO app_final.js (VERSÃO FINAL - ADMIN POWER 2.0) === */

// ESPERA O HTML ESTAR 100% CARREGADO ANTES DE EXECUTAR QUALQUER COISA
document.addEventListener('DOMContentLoaded', () => {

    // --- VARIÁVEIS GLOBAIS DO APP ---
    const contentArea = document.getElementById('content-area');
    const totalModules = Object.keys(moduleContent).length;
    let completedModules = JSON.parse(localStorage.getItem('gateBombeiroCompletedModules_v3')) || [];
    let notifiedAchievements = JSON.parse(localStorage.getItem('gateBombeiroNotifiedAchievements_v3')) || [];
    let currentModuleId = null;
    let cachedQuestionBanks = {}; 
    let currentUserData = null; 

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

    const adminBtn = document.getElementById('admin-panel-btn');
    const mobileAdminBtn = document.getElementById('mobile-admin-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminOverlay = document.getElementById('admin-modal-overlay');
    const closeAdminBtn = document.getElementById('close-admin-modal');

    // --- PWA INSTALLATION LOGIC ---
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
                alert("Para instalar no iPhone:\n1. Toque em Compartilhar (quadrado com seta).\n2. Toque em 'Adicionar à Tela de Início'.");
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
            alert("Para instalar:\nPC/Android: Procure o ícone de instalação na barra de endereço ou menu.\niOS: Toque em Compartilhar > Adicionar à Tela de Início.");
        }
    }

    if(installBtn) installBtn.addEventListener('click', triggerInstall);
    if(installBtnMobile) installBtnMobile.addEventListener('click', triggerInstall);

    // --- VERIFICAÇÃO DE SEGURANÇA ---
    if (typeof moduleContent === 'undefined' || typeof moduleCategories === 'undefined' || typeof questionSources === 'undefined') {
        document.getElementById('main-header')?.classList.add('hidden');
        document.querySelector('footer')?.classList.add('hidden');
        const contentAreaError = document.getElementById('content-area');
        if (contentAreaError) {
            contentAreaError.innerHTML = `<div class="text-center py-10 px-6"><h2 class="text-3xl font-bold text-red-700">Erro Crítico</h2><p>Dados não carregados. Recarregue a página.</p><button onclick="location.reload()" class="action-button mt-4">Recarregar</button></div>`;
        }
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

        // --- Lógica do Botão Admin ---
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

    // --- PAINEL ADMINISTRATIVO AVANÇADO (ATUALIZADO 2.0) ---
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
                
                // Ícone de nota muda de cor se tiver observação
                const noteIconColor = u.adminNote ? 'text-yellow-500' : 'text-gray-400';
                
                const row = `
                    <tr class="border-b hover:bg-gray-50 transition-colors">
                        <td class="p-3 font-bold text-gray-800">${u.name}</td>
                        <td class="p-3 text-gray-600 text-sm">${u.email}<br><span class="text-xs text-gray-500">CPF: ${cpf}</span></td>
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
                            <!-- Botões de Ação -->
                            <button onclick="editUserData('${uid}', '${u.name}', '${cpf}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Editar Dados">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button onclick="editUserNote('${uid}', '${(u.adminNote || '').replace(/'/g, "\\'")}')" class="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-2 py-1.5 rounded text-xs shadow" title="Observações">
                                <i class="fas fa-sticky-note ${noteIconColor}"></i>
                            </button>
                            <button onclick="manageUserAccess('${uid}', '${u.acesso_ate}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Gerenciar Acesso e Plano">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                            <button onclick="sendResetEmail('${u.email}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Enviar E-mail de Reset de Senha">
                                <i class="fas fa-key"></i>
                            </button>
                            <button onclick="deleteUser('${uid}', '${u.name}', '${cpf}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Excluir Usuário">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Erro ao carregar: ${err.message}</td></tr>`;
        }
    };

    // 1. Editar Dados Básicos
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

    // 2. Gerenciar Acesso (Renomeado de extendUserAccess)
    window.manageUserAccess = async function(uid, currentExpiryStr) {
        const opcao = prompt(
            "Gerenciar Plano e Validade:\n\n" +
            "1 - MENSAL (+30 dias)\n" +
            "2 - SEMESTRAL (+180 dias)\n" +
            "3 - ANUAL (+365 dias)\n" +
            "4 - PERMANENTE (10 anos)\n" +
            "5 - PERSONALIZADO (Adicionar/Remover dias)\n\n" +
            "Digite o número da opção:"
        );

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
        // Se já venceu, soma a partir de hoje. Se não, soma do vencimento atual.
        if (isNaN(baseDate.getTime()) || baseDate < hoje) {
            baseDate = hoje;
        }

        baseDate.setDate(baseDate.getDate() + diasToAdd);
        const newExpiryISO = baseDate.toISOString();

        try {
            await window.__fbDB.collection('users').doc(uid).update({
                status: 'premium',
                acesso_ate: newExpiryISO,
                planType: novoPlano // Salva o tipo do plano para mostrar na tabela
            });
            alert("Acesso atualizado com sucesso!");
            openAdminPanel();
        } catch (err) {
            alert("Erro ao atualizar: " + err.message);
        }
    };

    // 3. Editar Observação (NOVO)
    window.editUserNote = async function(uid, currentNote) {
        const newNote = prompt("Observações sobre este aluno (ex: Pagou via PIX, Pendência, etc):", currentNote);
        if (newNote === null) return; // Cancelou

        try {
            await window.__fbDB.collection('users').doc(uid).update({
                adminNote: newNote
            });
            alert("Observação salva.");
            openAdminPanel();
        } catch (err) {
            alert("Erro ao salvar nota: " + err.message);
        }
    };

    // 4. Excluir Usuário
    window.deleteUser = async function(uid, name, cpf) {
        if(confirm(`TEM CERTEZA que deseja excluir o aluno ${name}?\n\nEssa ação não pode ser desfeita.`)) {
            const userConfirm = prompt("Para confirmar, digite DELETAR:");
            if (userConfirm !== "DELETAR") return;

            try {
                const batch = window.__fbDB.batch();
                batch.delete(window.__fbDB.collection('users').doc(uid));
                if (cpf && cpf !== 'Sem CPF' && cpf !== 'undefined') {
                    batch.delete(window.__fbDB.collection('cpfs').doc(cpf));
                }
                await batch.commit();
                alert("Usuário excluído.");
                openAdminPanel();
            } catch (err) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    // 5. Resetar Senha
    window.sendResetEmail = async function(email) {
        if(confirm(`Enviar e-mail de redefinição de senha para ${email}?\n\n(Por segurança, não é possível visualizar a senha atual, apenas resetá-la).`)) {
            try {
                await window.__fbAuth.sendPasswordResetEmail(email);
                alert('E-mail de redefinição enviado!');
            } catch(err) {
                alert('Erro: ' + err.message);
            }
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
            
            closeTrialBtn?.addEventListener('click', () => {
                trialToast.classList.add('hidden');
            });
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
        if (lastModule) {
            loadModuleContent(lastModule);
        } else {
            goToHomePage();
        }
    }

    async function loadQuestionBank(moduleId) {
        if (cachedQuestionBanks[moduleId]) return cachedQuestionBanks[moduleId];
        if (typeof QUIZ_DATA === 'undefined') return null;
        const questions = QUIZ_DATA[moduleId];
        if (!questions || !Array.isArray(questions) || questions.length === 0) return null; 
        cachedQuestionBanks[moduleId] = questions;
        return questions;
    }

    async function loadModuleContent(id) {
        if (!id || !moduleContent[id]) return;
        
        const num = parseInt(id.replace('module', ''));
        let moduleCategory = null;
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            if (num >= cat.range[0] && num <= cat.range[1]) {
                moduleCategory = cat;
                break;
            }
        }

        const isPremiumContent = moduleCategory && moduleCategory.isPremium;
        const userIsNotPremium = !currentUserData || currentUserData.status !== 'premium';

        if (isPremiumContent && userIsNotPremium) {
            renderPremiumLockScreen(moduleContent[id].title);
            return;
        }

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
        } catch(error) { console.error(error); }
        
        setTimeout(() => {
            loadingSpinner.classList.add('hidden');
            contentArea.classList.remove('hidden'); 

            let html = `
                <h3 class="flex items-center text-3xl mb-6 pb-4 border-b"><i class="${d.iconClass} mr-4 ${categoryColor} fa-fw"></i>${d.title}</h3>
                <div>${d.content}</div>
            `;

            // --- BLOQUEIO 2: BOTÃO DRIVE (FOTOS E VÍDEOS) ---
            if (d.driveLink) {
                if (userIsNotPremium) {
                    html += `
                    <div class="mt-10 mb-8">
                        <button onclick="document.getElementById('expired-modal').classList.add('show'); document.getElementById('name-modal-overlay').classList.add('show');" class="drive-button opacity-75 hover:opacity-100 relative overflow-hidden">
                            <div class="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                                <i class="fas fa-lock text-2xl mr-2"></i>
                            </div>
                            <span class="blur-[2px] flex items-center">
                                <i class="fab fa-google-drive mr-3"></i> VER FOTOS E VÍDEOS (PREMIUM)
                            </span>
                        </button>
                        <p class="text-xs text-center mt-2 text-gray-500"><i class="fas fa-lock text-yellow-500"></i> Recurso exclusivo para assinantes</p>
                    </div>
                    `;
                } else {
                    html += `
                    <div class="mt-10 mb-8">
                        <a href="${d.driveLink}" target="_blank" class="drive-button">
                            <i class="fab fa-google-drive"></i>
                            VER FOTOS E VÍDEOS DESTA MATÉRIA
                        </a>
                    </div>
                    `;
                }
            }

            if (allQuestions && allQuestions.length > 0) {
                const questionsToDisplay = 4;
                const count = Math.min(allQuestions.length, questionsToDisplay); 
                const shuffledQuestions = shuffleArray(allQuestions);
                const selectedQuestions = shuffledQuestions.slice(0, count);

                let quizHtml = `<div class="quiz-section-separator"></div>
                                <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Exercícios de Fixação</h3>`;
                
                selectedQuestions.forEach((q, index) => {
                    const questionNumber = index + 1;
                    quizHtml += `<div class="quiz-block" data-question-id="${q.id}">
                                    <p class="font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">${questionNumber}. ${q.question}</p>
                                    <div class="quiz-options-group space-y-2 mb-4">`;
                    for (const key in q.options) {
                        quizHtml += `<div class="quiz-option" data-module="${id}" data-question-id="${q.id}" data-answer="${key}">
                                        <span class="option-key">${key.toUpperCase()})</span> ${q.options[key]}
                                        <span class="ripple"></span>
                                    </div>`;
                    }
                    quizHtml += `</div><div id="feedback-${q.id}" class="feedback-area hidden"></div></div>`;
                });
                html += quizHtml;
            } else {
                if (!d.id.startsWith('module9')) {
                    html += `<div class="warning-box mt-8"><p><strong><i class="fas fa-exclamation-triangle mr-2"></i> Exercícios não encontrados.</strong></p></div>`;
                }
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

    function renderPremiumLockScreen(title) {
        contentArea.innerHTML = `
            <div class="text-center py-12 px-6">
                <div class="inline-block p-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
                    <i class="fas fa-lock text-5xl text-yellow-600 dark:text-yellow-500"></i>
                </div>
                <h2 class="text-3xl font-bold mb-4 text-gray-800 dark:text-white">Conteúdo Exclusivo</h2>
                <p class="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">
                    O módulo <strong>${title}</strong> faz parte do nosso pacote avançado. Assine agora para desbloquear Simulados, Bônus e muito mais.
                </p>
                <button id="premium-lock-btn" class="action-button pulse-button text-lg px-8 py-4">
                    <i class="fas fa-crown mr-2"></i> DESBLOQUEAR TUDO AGORA
                </button>
            </div>
        `;
        
        document.getElementById('premium-lock-btn').addEventListener('click', () => {
            document.getElementById('expired-modal').classList.add('show');
            document.getElementById('name-modal-overlay').classList.add('show');
        });
        
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
            feedbackContent = `<strong class="font-semibold text-green-700 dark:text-green-400"><i class="fas fa-check-circle mr-2"></i> Correto!</strong> ${explanationText}`;
            try { triggerSuccessParticles(e, o); } catch (err) {}
        } else {
            o.classList.add('incorrect');
            feedbackContent = `<strong class="font-semibold text-red-700 dark:text-red-400"><i class="fas fa-times-circle mr-2"></i> Incorreto.</strong> ${explanationText} <span class="text-sm italic block mt-1"> (Dica: A resposta correta foi destacada em verde.)</span>`;
        }
        if (feedbackArea) {
            feedbackArea.innerHTML = `<div class="explanation mt-2">${feedbackContent}</div>`;
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
        document.getElementById('home-breadcrumb')?.addEventListener('click', (e) => {
            e.preventDefault(); 
            goToHomePage();
        });
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
        if (contentArea) contentArea.innerHTML = getWelcomeContent();
        document.getElementById('module-nav')?.classList.add('hidden');
        document.querySelectorAll('.module-list-item.active').forEach(i => i.classList.remove('active'));
        currentModuleId = null;
        closeSidebar();
        
        const btn = document.getElementById('start-course');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                loadModuleContent('module1');
            });
        }
        updateBreadcrumbs();
    }

    function getWelcomeContent() {
        return `<div class="text-center py-8">
                        <div class="floating inline-block p-5 bg-red-100 dark:bg-red-900/50 rounded-full mb-6"><i class="fas fa-fire-extinguisher text-6xl text-red-600"></i></div>
                        <h2 class="text-4xl font-bold mb-4 text-blue-900 dark:text-white">Torne-se um Profissional de Elite</h2>
                        <p class="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">Bem-vindo ao <strong class="font-bold text-orange-500 dark:text-orange-400">Curso de Formação para Bombeiro Civil e Brigadista</strong>.</p>
                        <button id="start-course" class="action-button pulse text-lg"><i class="fas fa-play-circle mr-2"></i> Iniciar Curso Agora</button>
                    </div>`;
    }

    function setupProtection() {
        document.body.style.userSelect = 'none';
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
          if (e.ctrlKey || e.metaKey) {
            if (['c','a','x','v','s','p','u'].includes(e.key.toLowerCase())) e.preventDefault();
          }
          if (e.key === 'F12') e.preventDefault();
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
                        <div class="mb-4 relative"><input type="text" class="module-search w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700" placeholder="Buscar módulo..."><i class="fas fa-search absolute right-3 top-3.5 text-gray-400"></i></div>
                        <div class="module-accordion-container space-y-2">`;

        for (const k in moduleCategories) {
            // FILTRO REMOVIDO - TUDO APARECE AGORA
            
            const cat = moduleCategories[k];
            // MOSTRA CADEADO SE FOR PREMIUM E O USUÁRIO NÃO FOR PREMIUM
            const isLocked = cat.isPremium && (!currentUserData || currentUserData.status !== 'premium');
            const lockIcon = isLocked ? '<i class="fas fa-lock text-xs ml-2 text-yellow-500"></i>' : '';
            
            html += `<div><button class="accordion-button"><span><i class="${cat.icon} w-6 mr-2 text-gray-500"></i>${cat.title} ${lockIcon}</span><i class="fas fa-chevron-down"></i></button><div class="accordion-panel">`;
            for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                const m = moduleContent[`module${i}`];
                if (m) {
                    const isDone = Array.isArray(completedModules) && completedModules.includes(m.id);
                    // Adiciona cadeado pequeno também no item se estiver bloqueado
                    const itemLock = isLocked ? '<i class="fas fa-lock text-xs text-gray-400 ml-2"></i>' : '';
                    html += `<div class="module-list-item${isDone ? ' completed' : ''}" data-module="${m.id}">
                                <i class="${m.iconClass} module-icon"></i>
                                <span style="flex:1">${m.title} ${itemLock}</span>
                                ${isDone ? '<i class="fas fa-check-circle completion-icon" aria-hidden="true"></i>' : ''}
                             </div>`;
                }
            }
            html += `</div></div>`;
        }

        html += `</div>`;
        html += `<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 class="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center"><i class="fas fa-medal mr-2 text-yellow-500"></i> Conquistas por Área</h3>
                    <div id="achievements-grid" class="grid grid-cols-2 gap-4">`;
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
        nextModule.disabled = (n === totalModules);
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

        // 3. Admin Panel
        adminBtn?.addEventListener('click', window.openAdminPanel);
        const mobileAdminBtn = document.getElementById('mobile-admin-btn');
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
