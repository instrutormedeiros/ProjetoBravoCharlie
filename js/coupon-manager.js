(function(window) {
    'use strict';

    window.PBC_CREATE_COUPON_MANAGER = function(deps = {}) {
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const showAppToast = deps.showAppToast || (() => {});
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const escapeJsString = deps.escapeJsString || (value => String(value ?? ''));
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const subscriptionPrices = deps.subscriptionPrices || {
            regular: { monthly: '39,90', semester: '59,90', annual: '89,90', lifetime: '197,00' },
            coupon: { monthly: '29,90', semester: '49,90', annual: '69,90', lifetime: '149,90' }
        };
        const normalizeCouponCode = deps.normalizeCouponCode || (value => String(value || '').trim().toUpperCase());
        const getCouponDate = deps.getCouponDate || (value => {
            if (!value) return null;
            const date = value?.toDate ? value.toDate() : new Date(value);
            return date && !Number.isNaN(date.getTime()) ? date : null;
        });
        const isCouponValid = deps.isCouponValid || ((coupon, now = new Date()) => {
            if (!coupon || coupon.active === false) return false;
            const start = getCouponDate(coupon.startAt);
            const end = getCouponDate(coupon.endAt);
            if (start && now < start) return false;
            if (end && now > end) return false;
            return true;
        });
        const formatCouponDate = deps.formatCouponDate || (value => {
            const date = getCouponDate(value);
            if (!date) return 'Não informado';
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        });

        let instructorCouponsCache = [];

        function getLocalDateTimeValue(date = new Date()) {
            const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return local.toISOString().slice(0, 16);
        }

        function setupInstructorCouponDefaults() {
            const startInput = document.getElementById('instructor-coupon-start');
            const endInput = document.getElementById('instructor-coupon-end');
            if (startInput && !startInput.value) startInput.value = getLocalDateTimeValue();
            if (endInput && !endInput.value) {
                const end = new Date();
                end.setDate(end.getDate() + 7);
                endInput.value = getLocalDateTimeValue(end);
            }
        }

        async function loadCouponsFromStorage() {
            const db = window.__fbDB || window.fbDB;
            try {
                if (db && window.firebase) {
                    const snapshot = await db.collection('coupons').get();
                    const coupons = [];
                    snapshot.forEach(doc => coupons.push({ id: doc.id, ...doc.data() }));
                    instructorCouponsCache = coupons.sort((a, b) => {
                        const da = getCouponDate(b.createdAt)?.getTime() || getCouponDate(b.startAt)?.getTime() || 0;
                        const dbb = getCouponDate(a.createdAt)?.getTime() || getCouponDate(a.startAt)?.getTime() || 0;
                        return da - dbb;
                    });
                    return instructorCouponsCache;
                }
            } catch (error) {
                console.warn('Não foi possível carregar cupons do Firebase:', error);
            }
            instructorCouponsCache = JSON.parse(localStorage.getItem('pbc_coupons_v1') || '[]');
            return instructorCouponsCache;
        }

        function renderInstructorCoupons() {
            const list = document.getElementById('instructor-coupon-list');
            if (!list) return;
            const coupons = instructorCouponsCache || [];
            if (!coupons.length) {
                list.innerHTML = `
                    <div class="instructor-coupon-empty">
                        <i class="fas fa-ticket"></i>
                        <span>Nenhum cupom criado ainda.</span>
                    </div>
                `;
                return;
            }
            const now = new Date();
            list.innerHTML = coupons.map(coupon => {
                const valid = isCouponValid(coupon, now);
                const future = getCouponDate(coupon.startAt) && now < getCouponDate(coupon.startAt);
                const statusLabel = valid ? 'Ativo' : future ? 'Agendado' : 'Expirado';
                return `
                    <article class="instructor-coupon-item ${valid ? 'active' : ''}">
                        <div>
                            <strong>${escapeHtml(coupon.code || '')}</strong>
                            <span>${formatCouponDate(coupon.startAt)} até ${formatCouponDate(coupon.endAt)}</span>
                        </div>
                        <div class="instructor-coupon-actions">
                            <em>${statusLabel}</em>
                            <button type="button" onclick="deleteInstructorCoupon('${escapeJsString(coupon.id || coupon.code)}')" title="Remover cupom"><i class="fas fa-trash"></i></button>
                        </div>
                    </article>
                `;
            }).join('');
        }

        async function refreshInstructorCoupons() {
            await loadCouponsFromStorage();
            renderInstructorCoupons();
        }

        async function saveInstructorCoupon() {
            if (!isInstructorAdmin()) return;
            const codeInput = document.getElementById('instructor-coupon-code');
            const startInput = document.getElementById('instructor-coupon-start');
            const endInput = document.getElementById('instructor-coupon-end');
            const code = normalizeCouponCode(codeInput?.value);
            const startValue = startInput?.value;
            const endValue = endInput?.value;

            if (!code) {
                showAppToast('Cupom sem nome', 'Digite o nome do cupom, por exemplo TURM@B10.', 'warning');
                return;
            }
            if (!startValue || !endValue) {
                showAppToast('Prazo incompleto', 'Defina quando o cupom começa e quando termina.', 'warning');
                return;
            }

            const startDate = new Date(startValue);
            const endDate = new Date(endValue);
            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
                showAppToast('Prazo inválido', 'A data final precisa ser depois da data inicial.', 'warning');
                return;
            }

            const coupon = {
                id: code,
                code,
                active: true,
                discountType: 'special_prices',
                specialPrices: subscriptionPrices.coupon,
                oldPrices: subscriptionPrices.coupon,
                regularPrices: subscriptionPrices.regular,
                startAt: startDate.toISOString(),
                endAt: endDate.toISOString(),
                createdAtLocal: new Date().toISOString(),
                createdBy: getCurrentUserData()?.uid || null,
                createdByName: getCurrentUserData()?.name || 'Instrutor Medeiros'
            };

            const db = window.__fbDB || window.fbDB;
            try {
                if (db && window.firebase) {
                    await db.collection('coupons').doc(code).set({
                        ...coupon,
                        startAt: firebase.firestore.Timestamp.fromDate(startDate),
                        endAt: firebase.firestore.Timestamp.fromDate(endDate),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } else {
                    const local = JSON.parse(localStorage.getItem('pbc_coupons_v1') || '[]').filter(item => item.id !== code);
                    local.unshift(coupon);
                    localStorage.setItem('pbc_coupons_v1', JSON.stringify(local));
                }
                if (codeInput) codeInput.value = '';
                await refreshInstructorCoupons();
                showAppToast('Cupom criado', `${code} está pronto para o prazo definido.`, 'success');
            } catch (error) {
                console.error(error);
                showAppToast('Erro ao criar cupom', 'Não consegui salvar o cupom agora.', 'error');
            }
        }

        async function deleteInstructorCoupon(couponId) {
            if (!isInstructorAdmin() || !couponId) return;
            if (!confirm(`Remover o cupom ${couponId}?`)) return;
            const db = window.__fbDB || window.fbDB;
            try {
                if (db && window.firebase) {
                    await db.collection('coupons').doc(couponId).delete();
                } else {
                    const local = JSON.parse(localStorage.getItem('pbc_coupons_v1') || '[]').filter(item => item.id !== couponId);
                    localStorage.setItem('pbc_coupons_v1', JSON.stringify(local));
                }
                await refreshInstructorCoupons();
                showAppToast('Cupom removido', 'Ele não poderá mais ser aplicado.', 'success');
            } catch (error) {
                console.error(error);
                showAppToast('Erro ao remover', 'Não consegui remover o cupom agora.', 'error');
            }
        }

        window.saveInstructorCoupon = saveInstructorCoupon;
        window.deleteInstructorCoupon = deleteInstructorCoupon;

        return {
            setupInstructorCouponDefaults,
            refreshInstructorCoupons,
            saveInstructorCoupon,
            deleteInstructorCoupon
        };
    };
})(window);
