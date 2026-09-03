(function(window) {
    'use strict';

    window.PBC_CREATE_PAYMENT_MANAGER = function(deps = {}) {
        const showAppToast = deps.showAppToast || (() => {});
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const toDateFromFirestore = deps.toDateFromFirestore || (value => value ? new Date(value) : null);

        const subscriptionPrices = {
            regular: { monthly: '39,90', semester: '59,90', annual: '89,90', lifetime: '197,00' },
            coupon: { monthly: '29,90', semester: '49,90', annual: '69,90', lifetime: '149,90' }
        };

        function normalizeCouponCode(value) {
            return String(value || '').trim().toUpperCase();
        }

        function getCouponDate(value) {
            const date = toDateFromFirestore(value);
            return date && !Number.isNaN(date.getTime()) ? date : null;
        }

        function isCouponValid(coupon, now = new Date()) {
            if (!coupon || coupon.active === false) return false;
            const start = getCouponDate(coupon.startAt);
            const end = getCouponDate(coupon.endAt);
            if (start && now < start) return false;
            if (end && now > end) return false;
            return true;
        }

        function formatCouponDate(value) {
            const date = getCouponDate(value);
            if (!date) return 'Não informado';
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function openPaymentModal() {
            const expiredModal = document.getElementById('expired-modal');
            const loginModalOverlay = document.getElementById('name-modal-overlay');
            const loginModal = document.getElementById('name-prompt-modal');

            expiredModal?.classList.add('show');
            loginModalOverlay?.classList.add('show');
            setTimeout(() => {
                window.refreshPaymentCouponDisplay?.();
            }, 50);
            if (loginModal && loginModal.classList.contains('show')) {
                loginModal.classList.remove('show');
                loginModal.dataset.wasOpen = 'true';
            }
        }

        function openSubscriptionModalFromPremium() {
            openPaymentModal();
        }

        function copyPixKey(key) {
            navigator.clipboard.writeText(key).then(() => {
                showAppToast('Chave PIX copiada', key, 'success');
            }).catch(() => {
                prompt('Copie a chave manualmente:', key);
            });
        }

        function closePaymentModal() {
            if (document.body.classList.contains('access-expired-hard-lock')) {
                showAppToast('Acesso vencido', 'Escolha um plano para continuar usando a plataforma.', 'warning');
                return;
            }
            const expiredModal = document.getElementById('expired-modal');
            const loginModalOverlay = document.getElementById('name-modal-overlay');
            const loginModal = document.getElementById('name-prompt-modal');

            expiredModal?.classList.remove('show');
            if (loginModal && loginModal.dataset.wasOpen === 'true') {
                loginModal.classList.add('show');
                loginModal.dataset.wasOpen = 'false';
            } else if (document.body.getAttribute('data-app-ready') === 'true') {
                loginModalOverlay?.classList.remove('show');
            } else {
                loginModal?.classList.add('show');
            }
        }

        function setPaymentPrices(mode = 'regular', coupon = null) {
            const prices = mode === 'coupon' ? subscriptionPrices.coupon : subscriptionPrices.regular;
            const regular = subscriptionPrices.regular;
            ['monthly', 'semester', 'annual', 'lifetime'].forEach(plan => {
                const valueEl = document.querySelector(`[data-plan-price-value="${plan}"]`);
                const noteEl = document.querySelector(`[data-plan-price-note="${plan}"]`);
                const crossEl = document.querySelector(`[data-plan-cross-price="${plan}"]`);
                if (valueEl) valueEl.textContent = prices[plan];
                if (noteEl) noteEl.textContent = mode === 'coupon' ? 'Valor com cupom' : 'Preço oficial';
                if (crossEl) {
                    crossEl.textContent = `R$ ${regular[plan]}`;
                    crossEl.classList.toggle('hidden', mode !== 'coupon');
                }
            });
            document.body.classList.toggle('coupon-active', mode === 'coupon');
            const feedback = document.getElementById('payment-coupon-feedback');
            if (feedback) {
                feedback.classList.remove('coupon-feedback-error', 'coupon-feedback-success');
                if (mode === 'coupon') feedback.classList.add('coupon-feedback-success');
                feedback.innerHTML = mode === 'coupon'
                    ? `<i class="fas fa-circle-check"></i> Cupom <strong>${escapeHtml(coupon?.code || '')}</strong> aplicado. Condição especial liberada até ${formatCouponDate(coupon?.endAt)}.`
                    : 'Valores oficiais exibidos. Cupom válido libera uma condição especial por tempo limitado.';
            }
        }

        function setPaymentCouponError(message) {
            const feedback = document.getElementById('payment-coupon-feedback');
            if (!feedback) return;
            feedback.classList.remove('coupon-feedback-success');
            feedback.classList.add('coupon-feedback-error');
            feedback.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${escapeHtml(message)}`;
        }

        async function findCouponByCode(code) {
            const normalized = normalizeCouponCode(code);
            if (!normalized) return null;
            const db = window.__fbDB || window.fbDB;
            try {
                if (db && window.firebase) {
                    const doc = await db.collection('coupons').doc(normalized).get();
                    if (doc.exists) return { id: doc.id, ...doc.data() };
                }
            } catch (error) {
                console.warn('Não foi possível consultar cupom no Firebase:', error);
            }
            const local = JSON.parse(localStorage.getItem('pbc_coupons_v1') || '[]');
            return local.find(item => normalizeCouponCode(item.code) === normalized) || null;
        }

        window.openPaymentModal = openPaymentModal;
        window.closePaymentModal = closePaymentModal;
        window.openSubscriptionModalFromPremium = openSubscriptionModalFromPremium;
        window.copyPixKey = copyPixKey;

        window.applyPaymentCoupon = async function() {
            const input = document.getElementById('payment-coupon-input');
            const code = normalizeCouponCode(input?.value);
            if (!code) {
                showAppToast('Digite o cupom', 'Informe o código recebido pela sua turma.', 'warning');
                return;
            }
            const coupon = await findCouponByCode(code);
            if (!coupon) {
                setPaymentPrices('regular');
                setPaymentCouponError('Cupom inválido. Ele pode ter sido digitado errado ou não existir.');
                showAppToast('Cupom inválido', 'Confira se digitou exatamente como recebeu.', 'warning');
                return;
            }
            if (!isCouponValid(coupon)) {
                setPaymentPrices('regular');
                setPaymentCouponError('Cupom fora do prazo. Ele pode ainda não ter começado ou já estar expirado.');
                showAppToast('Cupom expirado ou fora do prazo', 'Confira a validade do cupom com a coordenação.', 'warning');
                return;
            }
            sessionStorage.setItem('pbc_active_coupon', JSON.stringify({
                code: coupon.code,
                endAt: getCouponDate(coupon.endAt)?.toISOString() || coupon.endAt
            }));
            if (input) input.value = coupon.code;
            setPaymentPrices('coupon', coupon);
            showAppToast('Cupom aplicado', 'Sua condição especial foi liberada.', 'success');
        };

        window.clearPaymentCoupon = function() {
            sessionStorage.removeItem('pbc_active_coupon');
            const input = document.getElementById('payment-coupon-input');
            if (input) input.value = '';
            setPaymentPrices('regular');
            showAppToast('Cupom removido', 'Os valores oficiais voltaram a ser exibidos.', 'info');
        };

        window.refreshPaymentCouponDisplay = async function() {
            const saved = JSON.parse(sessionStorage.getItem('pbc_active_coupon') || 'null');
            const input = document.getElementById('payment-coupon-input');
            if (!saved?.code) {
                setPaymentPrices('regular');
                return;
            }
            if (input) input.value = saved.code;
            const coupon = await findCouponByCode(saved.code);
            if (coupon && isCouponValid(coupon)) {
                setPaymentPrices('coupon', coupon);
            } else {
                sessionStorage.removeItem('pbc_active_coupon');
                if (input) input.value = '';
                setPaymentPrices('regular');
            }
        };

        function setupPaymentModalListeners() {
            document.getElementById('footer-subscribe-btn')?.addEventListener('click', openPaymentModal);
            document.getElementById('open-payment-login-btn')?.addEventListener('click', openPaymentModal);
            document.getElementById('payment-coupon-input')?.addEventListener('keypress', event => {
                if (event.key === 'Enter') window.applyPaymentCoupon?.();
            });
            document.getElementById('close-payment-modal-btn')?.addEventListener('click', closePaymentModal);
        }

        setupPaymentModalListeners();

        return {
            subscriptionPrices,
            normalizeCouponCode,
            getCouponDate,
            isCouponValid,
            formatCouponDate,
            findCouponByCode,
            setPaymentPrices,
            openPaymentModal,
            closePaymentModal,
            openSubscriptionModalFromPremium,
            copyPixKey
        };
    };
})(window);
