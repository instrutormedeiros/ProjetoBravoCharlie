(function(window) {
    'use strict';

    window.PBC_CREATE_LIBRARY_MANAGER = function(deps = {}) {
        const moduleContent = deps.moduleContent || window.moduleContent || {};
        const moduleMediaAssets = deps.moduleMediaAssets || window.PBC_MODULE_MEDIA_ASSETS || {};
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const isInstructorAdmin = deps.isInstructorAdmin || (() => false);
        const premiumLibraryCategories = deps.premiumLibraryCategories || window.PBC_PREMIUM_LIBRARY_CATEGORIES || [];
        const courseHandbookDownloads = deps.courseHandbookDownloads || window.PBC_COURSE_HANDBOOK_DOWNLOADS || [];

        function getLibraryItems() {
            const items = [];
            Object.keys(moduleMediaAssets || {}).forEach(id => {
                const module = moduleContent[id];
                const media = moduleMediaAssets[id];
                if (!module || !media) return;
                items.push({ moduleId: id, title: module.title, type: 'Vídeo', icon: 'fa-circle-play', url: media.video });
                items.push({ moduleId: id, title: module.title, type: 'Podcast', icon: 'fa-podcast', url: media.podcast });
                items.push({ moduleId: id, title: module.title, type: 'Infográfico', icon: 'fa-chart-simple', url: media.image });
                items.push({ moduleId: id, title: module.title, type: 'Slides', icon: 'fa-file-powerpoint', url: media.pdf });
            });
            return items;
        }

        function getVisibleHandbooks(userData = getCurrentUserData()) {
            const userType = userData?.courseType || 'BC';
            const items = courseHandbookDownloads.filter(item => item.courseType === userType || isInstructorAdmin(userData));
            return items.length ? items : courseHandbookDownloads.filter(item => item.courseType === 'BC');
        }

        return {
            getLibraryItems,
            getVisibleHandbooks,
            premiumLibraryCategories,
            courseHandbookDownloads
        };
    };
})(window);
