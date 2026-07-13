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
        formatAdminDateTime,
        getAdminCreatedDateInfo,
        userMatchesSearch
    };
})();
