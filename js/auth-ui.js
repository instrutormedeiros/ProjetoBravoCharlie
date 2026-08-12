(function () {
    'use strict';

    function createAuthUi() {
        let listenersReady = false;

        function setupAuthEventListeners() {
            if (listenersReady) return;
            listenersReady = true;

            const nameField = document.getElementById('name-field-container');
            const cpfField = document.getElementById('cpf-field-container');
            const phoneField = document.getElementById('phone-field-container');
            const phoneInput = document.getElementById('phone-input');
            const companyField = document.getElementById('company-field-container');
            const companyInput = document.getElementById('company-input');
            const courseField = document.getElementById('course-field-container');
            const courseSelect = document.getElementById('course-input');
            const nameInput = document.getElementById('name-input');
            const cpfInput = document.getElementById('cpf-input');
            const emailInput = document.getElementById('email-input');
            const passwordInput = document.getElementById('password-input');
            const passwordToggle = document.getElementById('toggle-password-visibility');
            const forgotPasswordButton = document.getElementById('forgot-password-button');
            const passwordResetModal = document.getElementById('password-reset-modal');
            const passwordResetOverlay = document.getElementById('password-reset-modal-overlay');
            const passwordResetEmail = document.getElementById('password-reset-email');
            const passwordResetFeedback = document.getElementById('password-reset-feedback');
            const closePasswordResetButton = document.getElementById('close-password-reset-modal');
            const sendPasswordResetButton = document.getElementById('send-password-reset-button');
            const feedback = document.getElementById('auth-feedback');
            const loginGroup = document.getElementById('login-button-group');
            const signupGroup = document.getElementById('signup-button-group');
            const authTitle = document.getElementById('auth-title');
            const authMsg = document.getElementById('auth-message');
            const btnShowLogin = document.getElementById('show-login-button');
            const btnShowSignup = document.getElementById('show-signup-button');
            const btnLogin = document.getElementById('login-button');
            const btnSignup = document.getElementById('signup-button');

            const showAuthFeedback = (message, type = 'info') => {
                if (!feedback) return;
                feedback.textContent = message;
                feedback.className = `auth-feedback auth-feedback-${type}`;
            };

            const getFriendlyAuthError = (error, fallback) => {
                const raw = String(error?.code || error?.message || error || '').toLowerCase();
                if (raw.includes('invalid_login_credentials') || raw.includes('invalid-credential') || raw.includes('wrong-password') || raw.includes('user-not-found')) {
                    return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
                }
                if (raw.includes('too-many-requests')) {
                    return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
                }
                if (raw.includes('network')) {
                    return 'Falha de conexão. Verifique sua internet e tente novamente.';
                }
                return fallback;
            };

            if (loginGroup && !loginGroup.classList.contains('hidden')) {
                courseField?.classList.add('hidden');
                nameField?.classList.add('hidden');
                cpfField?.classList.add('hidden');
                phoneField?.classList.add('hidden');
                companyField?.classList.add('hidden');
            }

            passwordInput?.addEventListener('keypress', function (event) {
                if (event.key !== 'Enter') return;
                if (!loginGroup?.classList.contains('hidden')) btnLogin?.click();
                else btnSignup?.click();
            });

            passwordToggle?.addEventListener('click', () => {
                if (!passwordInput) return;
                const shouldShow = passwordInput.type === 'password';
                passwordInput.type = shouldShow ? 'text' : 'password';
                passwordToggle.setAttribute('aria-label', shouldShow ? 'Ocultar senha' : 'Mostrar senha');
                passwordToggle.setAttribute('aria-pressed', String(shouldShow));
                const icon = passwordToggle.querySelector('i');
                icon?.classList.toggle('fa-eye', !shouldShow);
                icon?.classList.toggle('fa-eye-slash', shouldShow);
                passwordInput.focus();
            });

            const closePasswordResetModal = () => {
                passwordResetModal?.classList.remove('show');
                passwordResetOverlay?.classList.remove('show');
                if (passwordResetFeedback) passwordResetFeedback.textContent = '';
            };

            forgotPasswordButton?.addEventListener('click', () => {
                if (passwordResetEmail) passwordResetEmail.value = emailInput?.value?.trim() || '';
                if (passwordResetFeedback) passwordResetFeedback.textContent = '';
                passwordResetModal?.classList.add('show');
                passwordResetOverlay?.classList.add('show');
                setTimeout(() => passwordResetEmail?.focus(), 80);
            });

            closePasswordResetButton?.addEventListener('click', closePasswordResetModal);
            passwordResetOverlay?.addEventListener('click', closePasswordResetModal);

            sendPasswordResetButton?.addEventListener('click', async () => {
                const email = passwordResetEmail?.value?.trim();
                if (!email) {
                    if (passwordResetFeedback) {
                        passwordResetFeedback.textContent = 'Digite o e-mail cadastrado para receber o link.';
                        passwordResetFeedback.className = 'password-reset-feedback error';
                    }
                    return;
                }

                sendPasswordResetButton.disabled = true;
                sendPasswordResetButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                try {
                    if (!window.__fbAuth?.sendPasswordResetEmail) {
                        throw new Error('Serviço de redefinição ainda não carregou. Aguarde alguns segundos e tente novamente.');
                    }
                    window.__fbAuth.languageCode = 'pt_BR';
                    await window.__fbAuth.sendPasswordResetEmail(email);
                    if (passwordResetFeedback) {
                        passwordResetFeedback.textContent = 'Link enviado. Confira seu e-mail e siga as instruções para criar uma nova senha.';
                        passwordResetFeedback.className = 'password-reset-feedback success';
                    }
                } catch (error) {
                    if (passwordResetFeedback) {
                        passwordResetFeedback.textContent = 'Não consegui enviar agora. Confira o e-mail digitado e tente novamente.';
                        passwordResetFeedback.className = 'password-reset-feedback error';
                    }
                } finally {
                    sendPasswordResetButton.disabled = false;
                    sendPasswordResetButton.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar link de redefinição';
                }
            });

            btnShowSignup?.addEventListener('click', () => {
                loginGroup?.classList.add('hidden');
                signupGroup?.classList.remove('hidden');
                nameField?.classList.remove('hidden');
                cpfField?.classList.remove('hidden');
                phoneField?.classList.remove('hidden');
                companyField?.classList.remove('hidden');
                courseField?.classList.remove('hidden');
                if (authTitle) authTitle.textContent = 'Criar Nova Conta';
                if (authMsg) authMsg.textContent = 'Cadastre-se para o Período de Experiência.';
                passwordInput?.setAttribute('autocomplete', 'new-password');
                if (feedback) {
                    feedback.textContent = '';
                    feedback.className = 'auth-feedback';
                }
            });

            btnShowLogin?.addEventListener('click', () => {
                loginGroup?.classList.remove('hidden');
                signupGroup?.classList.add('hidden');
                nameField?.classList.add('hidden');
                cpfField?.classList.add('hidden');
                phoneField?.classList.add('hidden');
                companyField?.classList.add('hidden');
                courseField?.classList.add('hidden');
                if (authTitle) authTitle.textContent = 'Acesso ao Sistema';
                if (authMsg) authMsg.textContent = 'Acesso Restrito';
                passwordInput?.setAttribute('autocomplete', 'current-password');
                if (feedback) {
                    feedback.textContent = '';
                    feedback.className = 'auth-feedback';
                }
            });

            btnLogin?.addEventListener('click', async () => {
                const email = emailInput?.value || '';
                const password = passwordInput?.value || '';
                if (!email || !password) {
                    showAuthFeedback('Preencha e-mail e senha.', 'error');
                    return;
                }
                showAuthFeedback('Entrando...', 'info');
                try {
                    if (!window.FirebaseCourse?.signInWithEmail) {
                        throw new Error('Sistema de login ainda não carregou. Aguarde alguns segundos e tente novamente.');
                    }
                    localStorage.removeItem('my_session_id');
                    await window.FirebaseCourse.signInWithEmail(email, password);
                    showAuthFeedback('Verificando...', 'info');
                    storeLoginCredential(email, password);
                } catch (error) {
                    showAuthFeedback(getFriendlyAuthError(error, 'Não consegui entrar. Confira seus dados e tente novamente.'), 'error');
                }
            });

            btnSignup?.addEventListener('click', async () => {
                const phone = phoneInput?.value || '';
                const company = companyInput?.value || '';
                const courseType = courseSelect ? courseSelect.value : 'BC';
                const name = nameInput?.value || '';
                const email = emailInput?.value || '';
                const password = passwordInput?.value || '';
                const cpf = cpfInput?.value || '';

                if (!name || !email || !password || !cpf || !phone) {
                    showAuthFeedback('Todos os campos obrigatórios devem ser preenchidos.', 'error');
                    return;
                }
                showAuthFeedback('Criando conta...', 'info');
                try {
                    if (!window.FirebaseCourse?.signUpWithEmail) {
                        throw new Error('Sistema de cadastro ainda não carregou. Aguarde alguns segundos e tente novamente.');
                    }
                    await window.FirebaseCourse.signUpWithEmail(name, email, password, cpf, company, phone, courseType);
                    showAuthFeedback('Sucesso! Iniciando...', 'success');
                    storeLoginCredential(email, password);
                } catch (error) {
                    showAuthFeedback(getFriendlyAuthError(error, 'Não consegui criar a conta. Confira os dados e tente novamente.'), 'error');
                }
            });
        }

        async function storeLoginCredential(email, password) {
            if (!navigator.credentials || !window.PasswordCredential || !email || !password) return;
            try {
                const credential = new PasswordCredential({ id: email, password, name: email });
                await Promise.race([
                    navigator.credentials.store(credential),
                    new Promise(resolve => setTimeout(resolve, 1200))
                ]);
            } catch (error) {
                console.warn('Senha salva pelo navegador indisponivel:', error);
            }
        }

        return { setupAuthEventListeners };
    }

    window.PBC_CREATE_AUTH_UI = createAuthUi;
})();
