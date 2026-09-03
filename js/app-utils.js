(function () {
    'use strict';

    function normalizeSearchText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function onlyDigits(value) {
        return String(value || '').replace(/\D/g, '');
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeJsString(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ');
    }

    function toDateFromFirestore(value) {
        if (!value) return null;
        if (typeof value.toDate === 'function') return value.toDate();
        if (value.seconds) return new Date(value.seconds * 1000);
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function toAccessExpiryDate(value) {
        const date = toDateFromFirestore(value);
        if (!date) return null;
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
            date.setHours(23, 59, 59, 999);
        }
        return date;
    }

    function isPrivilegedAccess(user) {
        const email = normalizeSearchText(user?.email);
        return !!user && (
            user.isAdmin === true ||
            user.isManager === true ||
            normalizeSearchText(user.role) === 'admin' ||
            normalizeSearchText(user.courseType) === 'gestor' ||
            email === 'coordenadormedeiros@gmail.com'
        );
    }

    function isLifetimeAccess(user) {
        if (!user) return false;
        if (user.lifetimeAccess === true || user.acessoVitalicio === true || user.isLifetime === true) return true;
        const accessText = [
            user.planType,
            user.plan,
            user.accessType,
            user.subscriptionType,
            user.paymentPlan,
            user.subscriptionPlan,
            user.statusLabel
        ].map(normalizeSearchText).join(' ');
        return /\b(vitalicio|vitalicia|vital|permanente|lifetime)\b/.test(accessText);
    }

    function hasActivePlatformAccess(user, now = new Date()) {
        if (!user) return false;
        if (isPrivilegedAccess(user) || isLifetimeAccess(user)) return true;
        const status = normalizeSearchText(user.status);
        if (status === 'expirado' || status === 'cancelado' || status === 'bloqueado') return false;
        const expiry = toAccessExpiryDate(user.acesso_ate);
        if (!expiry) return false;
        return expiry.getTime() >= now.getTime();
    }

    function getPlatformAccessStatus(user, now = new Date()) {
        if (!user) return { active: false, reason: 'missing-user', expiry: null };
        if (isPrivilegedAccess(user)) return { active: true, reason: 'privileged', expiry: null };
        if (isLifetimeAccess(user)) return { active: true, reason: 'lifetime', expiry: null };
        const expiry = toAccessExpiryDate(user.acesso_ate);
        if (!expiry) return { active: false, reason: 'missing-expiry', expiry: null };
        if (expiry.getTime() < now.getTime()) return { active: false, reason: 'expired', expiry };
        return { active: true, reason: 'date-active', expiry };
    }

    function formatAdminDateTime(value) {
        const date = toDateFromFirestore(value);
        if (!date) return 'Não registrado';
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getAdminCreatedDateInfo(user) {
        const directDate = toDateFromFirestore(user?.createdAt) || toDateFromFirestore(user?.created_at_client) || toDateFromFirestore(user?.signup_at);
        if (directDate) return { date: directDate, inferred: false };

        const trialEnd = toDateFromFirestore(user?.acesso_ate);
        const isTrialLike = normalizeSearchText(user?.status) === 'trial' || normalizeSearchText(user?.planType).includes('degustacao');
        if (trialEnd && isTrialLike) {
            const inferredDate = new Date(trialEnd);
            inferredDate.setDate(inferredDate.getDate() - 30);
            return { date: inferredDate, inferred: true };
        }

        return { date: null, inferred: false };
    }

    function userMatchesSearch(user, searchTerm) {
        const term = normalizeSearchText(searchTerm);
        const termDigits = onlyDigits(searchTerm);

        if (!term && !termDigits) return true;

        const fields = [
            user?.name,
            user?.email,
            user?.cpf,
            user?.phone,
            user?.company,
            user?.courseType,
            user?.status,
            user?.planType
        ];

        const textMatch = term && fields.some(field => normalizeSearchText(field).includes(term));
        const digitMatch = termDigits && [user?.cpf, user?.phone].some(field => onlyDigits(field).includes(termDigits));

        return Boolean(textMatch || digitMatch);
    }

    window.PBC_APP_UTILS = {
        normalizeSearchText,
        onlyDigits,
        escapeHtml,
        escapeJsString,
        toDateFromFirestore,
        toAccessExpiryDate,
        isPrivilegedAccess,
        isLifetimeAccess,
        hasActivePlatformAccess,
        getPlatformAccessStatus,
        formatAdminDateTime,
        getAdminCreatedDateInfo,
        userMatchesSearch
    };
})();
