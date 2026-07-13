(function(window) {
    'use strict';

    window.PBC_CREATE_COURSE_NAVIGATION = function(deps = {}) {
        const moduleContent = deps.moduleContent || window.moduleContent || {};
        const moduleCategories = deps.moduleCategories || window.moduleCategories || {};
        const normalizeSearchText = deps.normalizeSearchText || (value => String(value || '').toLowerCase().trim());
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const getCompletedModules = deps.getCompletedModules || (() => []);
        const setCompletedModules = deps.setCompletedModules || (() => {});
        const getNotifiedAchievements = deps.getNotifiedAchievements || (() => []);
        const setNotifiedAchievements = deps.setNotifiedAchievements || (() => {});
        const getCurrentModuleId = deps.getCurrentModuleId || (() => null);
        const getTotalModules = deps.getTotalModules || (() => 0);
        const setTotalModules = deps.setTotalModules || (() => {});
        const getVisibleModuleIds = deps.getVisibleModuleIds || (() => []);
        const saveProgressToCloud = deps.saveProgressToCloud || (() => {});
        const showAppToast = deps.showAppToast || (() => {});
        const getAchievementModal = deps.getAchievementModal || (() => document.getElementById('achievement-modal'));
        const getAchievementOverlay = deps.getAchievementOverlay || (() => document.getElementById('achievement-overlay'));
        const confettiFn = deps.confetti || window.confetti;
        const loadModuleContent = (...args) => deps.loadModuleContent?.(...args);

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

        function populateModuleLists() {
            const moduleListHTML = getModuleListHTML();
            const desktopContainer = document.getElementById('desktop-module-container');
            const mobileContainer = document.getElementById('mobile-module-container');
            if (desktopContainer) desktopContainer.innerHTML = moduleListHTML;
            if (mobileContainer) mobileContainer.innerHTML = moduleListHTML;
        }

        // --- FUNÇÃO ATUALIZADA: LISTA DE MÓDULOS COM CONTADORES E SEGURANÇA ACL ---
        // --- FUNÇÃO ATUALIZADA: LISTA DE MÓDULOS COM SUPORTE A CATEGORIAS SP ---
        function getModuleListHTML() {
            let html = `
                <div class="module-sidebar-header">
                    <div>
                        <h2><i class="fas fa-list-ul"></i> Conteúdo do Curso</h2>
                        <p>Escolha uma aula ou continue pelo seu progresso.</p>
                    </div>
                </div>
                <div class="module-search-shell">
                    <i class="fas fa-search"></i>
                    <input type="text" class="module-search" placeholder="Buscar módulo...">
                    <button type="button" class="module-search-clear" title="Limpar busca"><i class="fas fa-times"></i></button>
                </div>
                <div class="module-search-meta">
                    <span class="module-search-count">Mostrando todos os módulos</span>
                </div>
                <div class="module-empty-state hidden">
                    <i class="fas fa-magnifying-glass"></i>
                    <strong>Nenhum módulo encontrado</strong>
                    <span>Tente buscar por outro termo.</span>
                </div>
                <div class="module-accordion-container space-y-2">
            `;
            
            for (const k in moduleCategories) {
                const cat = moduleCategories[k];
                const isLocked = cat.isPremium && (!getCurrentUserData() || getCurrentUserData().status !== 'premium');
                const lockIcon = isLocked ? '<i class="fas fa-lock text-xs ml-2 text-yellow-500"></i>' : '';
                
                // --- CÁLCULO DE CONTADORES ---
                let catTotal = 0;
                let catCompleted = 0;
                
                // Define quem é o usuário
                const userType = getCurrentUserData() ? (getCurrentUserData().courseType || 'BC') : 'BC';
                const isManager = getCurrentUserData() ? (getCurrentUserData().isAdmin || getCurrentUserData().courseType === 'GESTOR') : false;

                // Determina o prefixo baseado na categoria (SEGREDO AQUI)
                // Se a categoria tem isSP: true, buscamos sp_moduleX. Senão, moduleX.
                const prefix = cat.isSP ? 'sp_module' : 'module';

                for(let i = cat.range[0]; i <= cat.range[1]; i++) {
                    const mid = `${prefix}${i}`; // Monta o ID correto (ex: sp_module1 ou module1)

                    if(moduleContent[mid]) {
                        // ACL: Verifica se deve contar este módulo
                        const isSpContent = mid.startsWith('sp_');
                        let showIt = true;

                        if (!isManager) {
                            if (userType === 'BC' && isSpContent) showIt = false; 
                            if (userType === 'SP' && !isSpContent) showIt = false; 
                        }

                        if (showIt) {
                            catTotal++;
                            if(getCompletedModules().includes(mid)) catCompleted++;
                        }
                    }
                }

                // Se a categoria estiver vazia para este aluno, não desenha o botão dela
                if (catTotal === 0 && !isManager) continue; 

                const catPercent = catTotal ? Math.round((catCompleted / catTotal) * 100) : 0;
                html += `
                    <div class="module-category">
                        <button class="accordion-button">
                            <span><i class="${cat.icon} w-6 mr-2 text-gray-500"></i>${cat.title} ${lockIcon}</span>
                            <span class="module-count">${catCompleted}/${catTotal}</span>
                            <i class="fas fa-chevron-down"></i>
                            <span class="category-progress" style="width:${catPercent}%"></span>
                        </button>
                        <div class="accordion-panel">
                `;
                
                // --- GERAÇÃO DA LISTA DE MÓDULOS ---
                for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                    const mid = `${prefix}${i}`; // ID Correto
                    const m = moduleContent[mid];

                    if (m) {
                        // ACL: Verifica se deve exibir (Mesma lógica de cima)
                        const isSpContent = m.id.startsWith('sp_');
                        if (!isManager) {
                            if (userType === 'BC' && isSpContent) continue;
                            if (userType === 'SP' && !isSpContent) continue;
                        }

                        const isDone = Array.isArray(getCompletedModules()) && getCompletedModules().includes(m.id);
                        const itemLock = isLocked ? '<i class="fas fa-lock text-xs text-gray-400 ml-2"></i>' : '';
                        const moduleNumber = String(i).padStart(2, '0');
                        const statusLabel = isDone ? 'Concluído' : (isLocked ? 'Premium' : 'Disponível');
                        html += `
                            <div class="module-list-item${isDone ? ' completed' : ''}${isLocked ? ' locked' : ''}" data-module="${m.id}" data-status="${statusLabel}">
                                <span class="module-number">${moduleNumber}</span>
                                <i class="${m.iconClass} module-icon"></i>
                                <span class="module-item-title">${m.title} ${itemLock}</span>
                                <span class="module-status-pill">${statusLabel}</span>
                                ${isDone ? '<i class="fas fa-check-circle completion-icon" aria-hidden="true"></i>' : ''}
                            </div>
                        `;
                    }
                }
                html += `</div></div>`;
            }
            
            // Finaliza o HTML
            html += `</div>`;
            html += `<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"><h3 class="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center"><i class="fas fa-medal mr-2 text-yellow-500"></i> Conquistas por Área</h3><div id="achievements-grid" class="grid grid-cols-2 gap-4">`;
            
            for (const key in moduleCategories) {
                const cat = moduleCategories[key];
                let showAchievement = true;
                
                // Esconde conquista da área errada
                if (getCurrentUserData() && !getCurrentUserData().isAdmin && getCurrentUserData().courseType !== 'GESTOR') {
                    const type = getCurrentUserData().courseType || 'BC';
                    if (type === 'BC' && cat.isSP) showAchievement = false;
                    if (type === 'SP' && !cat.isSP) showAchievement = false;
                }

                if (showAchievement) {
                    const prefix = cat.isSP ? 'sp_module' : 'module';
                    let achTotal = 0;
                    let achDone = 0;
                    for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                        const mid = `${prefix}${i}`;
                        if (!moduleContent[mid]) continue;
                        achTotal++;
                        if (getCompletedModules().includes(mid)) achDone++;
                    }
                    const achPercent = achTotal ? Math.round((achDone / achTotal) * 100) : 0;
                    html += `
                        <div id="ach-cat-${key}" class="achievement-card" title="Conclua a área para ganhar: ${cat.achievementTitle}">
                            <div class="achievement-icon"><i class="${cat.icon}"></i></div>
                            <p class="achievement-title">${cat.achievementTitle}</p>
                            <div class="achievement-progress"><span style="width:${achPercent}%"></span></div>
                            <small>${achDone}/${achTotal} módulos</small>
                        </div>
                    `;
                }
            }
            html += `</div></div>`;
            return html;
        }

        function updateProgress() {
            const visibleIds = getVisibleModuleIds();
            if (visibleIds.length === 0) return;
            const visibleCompleted = visibleIds.filter(id => getCompletedModules().includes(id));
            const visibleTotal = visibleIds.length;
            setTotalModules(visibleTotal);
            const p = Math.min(100, (visibleCompleted.length / visibleTotal) * 100);
            const progressText = document.getElementById('progress-text');
            const completedCount = document.getElementById('completed-modules-count');
            const totalCount = document.getElementById('total-modules');
            const courseCount = document.getElementById('course-modules-count');
            if (progressText) progressText.textContent = `${p.toFixed(0)}%`;
            if (completedCount) completedCount.textContent = visibleCompleted.length;
            if (totalCount) totalCount.textContent = visibleTotal;
            if (courseCount) courseCount.textContent = visibleTotal;
            if (document.getElementById('progress-bar-minimal')) {
                document.getElementById('progress-bar-minimal').style.width = `${p}%`;
            }
            updateModuleListStyles();
            checkAchievements();
            // Atualiza contadores do sidebar
            populateModuleLists(); 
            
            if (!isPrivilegedUser() && visibleTotal > 0 && visibleCompleted.length === visibleTotal) showCongratulations();
        }

        function showCongratulations() {
            document.getElementById('congratulations-modal')?.classList.add('show');
            document.getElementById('modal-overlay')?.classList.add('show');
            if(typeof confettiFn === 'function') confettiFn({particleCount:150, spread:90, origin:{y:0.6},zIndex:200});
        }
        function showAchievementToast(title) {
            showAppToast('Módulo concluído', title, 'success');
        }
        function updateModuleListStyles() {
            document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('completed', getCompletedModules().includes(i.dataset.module)));
        }
        // --- FUNÇÃO CORRIGIDA: VERIFICAÇÃO DE CONQUISTAS (COM ACL) ---
        function isPrivilegedUser() {
            const user = getCurrentUserData();
            return Boolean(user?.isAdmin || user?.courseType === 'GESTOR');
        }

        function checkAchievements() {
            let newNotification = false;
            
            // 1. Identifica quem é o aluno
            const userType = getCurrentUserData() ? (getCurrentUserData().courseType || 'BC') : 'BC';
            const isManager = getCurrentUserData() ? (getCurrentUserData().isAdmin || getCurrentUserData().courseType === 'GESTOR') : false;

            for(const key in moduleCategories) {
                const cat = moduleCategories[key];
                
                // 2. ACL: Se a conquista não é do curso do aluno, PULA IMEDIATAMENTE
                // Isso impede que Bombeiro ganhe medalha de SP e vice-versa
                if (!isManager) {
                    if (userType === 'BC' && cat.isSP) continue; 
                    if (userType === 'SP' && !cat.isSP) continue;
                }

                let allComplete = true;
                
                // 3. Define o prefixo correto do ID (module ou sp_module)
                const prefix = cat.isSP ? 'sp_module' : 'module';

                // 4. Verifica módulo por módulo
                for(let i = cat.range[0]; i <= cat.range[1]; i++) {
                    const mid = `${prefix}${i}`;
                    
                    // Se o módulo não existe no banco OU o aluno não fez -> Incompleto
                    if (!moduleContent[mid] || !getCompletedModules().includes(mid)) {
                        allComplete = false; 
                        break;
                    }
                }

                // 5. Se completou tudo e ainda não foi notificado -> Solta os confetes
                if (allComplete && !isPrivilegedUser() && !getNotifiedAchievements().includes(key)) {
                    showAchievementModal(cat.achievementTitle, cat.icon);
                    const nextAchievements = [...getNotifiedAchievements(), key];
                    setNotifiedAchievements(nextAchievements);
                    newNotification = true;
                }
                
                // 6. Atualiza o visual (cadeado/cor) no painel de módulos
                document.querySelectorAll(`#ach-cat-${key}`).forEach(el => el.classList.toggle('unlocked', allComplete));
            }
            
            // Salva estado das notificações para não repetir
            if (newNotification) localStorage.setItem('gateBombeiroNotifiedAchievements_v3', JSON.stringify(getNotifiedAchievements()));
        }
        function showAchievementModal(title, iconClass) {
            const iconContainer = document.getElementById('ach-modal-icon-container');
            const titleEl = document.getElementById('ach-modal-title');
            if (!getAchievementModal() || !getAchievementOverlay() || !iconContainer || !titleEl) return;
            document.getElementById('modal-overlay')?.classList.remove('show');
            iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
            titleEl.textContent = title;
            const heading = getAchievementModal().querySelector('h2');
            if (heading) heading.textContent = 'Conquista desbloqueada!';
            getAchievementModal().classList.add('show');
            getAchievementOverlay().classList.add('show');
            if(typeof confettiFn === 'function') confettiFn({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 103 });
        }
        function hideAchievementModal() {
            [
                getAchievementModal(),
                getAchievementOverlay(),
                document.getElementById('achievement-modal'),
                document.getElementById('achievement-modal-overlay'),
                document.getElementById('modal-overlay')
            ].forEach(el => el?.classList.remove('show'));
        }
        window.closeAchievementModal = hideAchievementModal;

        function setupConcludeButtonListener() {
            if (!getCurrentModuleId()) return;
            const b = document.querySelector(`.conclude-button[data-module="${getCurrentModuleId()}"]`);
            if(b) {
                if (concludeButtonClickListener) b.removeEventListener('click', concludeButtonClickListener);
                if(getCompletedModules().includes(getCurrentModuleId())){
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
            if (id && !getCompletedModules().includes(id)) {
                const nextCompletedModules = [...getCompletedModules(), id];
                setCompletedModules(nextCompletedModules);
                localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(nextCompletedModules));
                
                // ADICIONADO: Salva no banco de dados agora
                saveProgressToCloud();

                updateProgress();
                b.disabled = true;
                b.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Concluído';
                showAchievementToast(moduleContent[id].title);
                if(typeof confettiFn === 'function') confettiFn({ particleCount: 60, spread: 70, origin: { y: 0.6 }, zIndex: 2000 });
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
            document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('active', i.dataset.module === getCurrentModuleId()));
        }
        // --- FUNÇÃO CORRIGIDA: ATUALIZAR ESTADO DOS BOTÕES (Navegação) ---
        function updateNavigationButtons() {
            const prevModule = document.getElementById('prev-module');
            const nextModule = document.getElementById('next-module');
            
            if (!prevModule || !nextModule) return;
            
            if (!getCurrentModuleId()) {
                 prevModule.disabled = true;
                 nextModule.disabled = true;
                 return;
            }
            
            // Lógica Híbrida: Detecta se é SP ou BC para extrair o número corretamente
            let n = 0;
            if (getCurrentModuleId().startsWith('sp_module')) {
                n = parseInt(getCurrentModuleId().replace('sp_module', ''));
            } else {
                n = parseInt(getCurrentModuleId().replace('module', ''));
            }

            // Bloqueia se for o primeiro (1) ou o último (getTotalModules())
            prevModule.disabled = (n <= 1);
            nextModule.disabled = (n >= getTotalModules()); 
        }

        function bindModuleSearchHandlers() {
            if (document.body.dataset.courseNavigationBound === 'true') return;
            document.body.dataset.courseNavigationBound = 'true';

            document.body.addEventListener('input', e => {
                if(e.target.matches('.module-search')) {
                    const s = normalizeSearchText(e.target.value);
                    const root = e.target.closest('#desktop-module-container, #mobile-module-container');
                    if (root) {
                        const accordionContainer = root.querySelector('.module-accordion-container');
                        const countEl = root.querySelector('.module-search-count');
                        const emptyEl = root.querySelector('.module-empty-state');
                        if (accordionContainer) {
                            let visibleCount = 0;
                            const allItems = accordionContainer.querySelectorAll('.module-list-item');
                            allItems.forEach(i => {
                                const text = normalizeSearchText(i.textContent);
                                const match = text.includes(s);
                                i.style.display = match ? 'flex' : 'none';
                                if (match) visibleCount++;
                                if(match && s.length > 0) {
                                    const panel = i.closest('.accordion-panel');
                                    const btn = panel.previousElementSibling;
                                    if(!btn.classList.contains('active')) {
                                        btn.classList.add('active');
                                        panel.style.maxHeight = panel.scrollHeight + "px";
                                    }
                                }
                            });
                            if (countEl) {
                                countEl.textContent = s.length > 0
                                    ? `${visibleCount} resultado${visibleCount === 1 ? '' : 's'} encontrado${visibleCount === 1 ? '' : 's'}`
                                    : 'Mostrando todos os módulos';
                            }
                            emptyEl?.classList.toggle('hidden', visibleCount > 0 || s.length === 0);
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

            document.body.addEventListener('click', e => {
                const clearBtn = e.target.closest('.module-search-clear');
                if (!clearBtn) return;
                const root = clearBtn.closest('#desktop-module-container, #mobile-module-container');
                const input = root?.querySelector('.module-search');
                if (!input) return;
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.focus();
            });
        }

        return {
            getCategoryColor,
            populateModuleLists,
            getModuleListHTML,
            updateProgress,
            updateModuleListStyles,
            checkAchievements,
            showAchievementModal,
            hideAchievementModal,
            setupConcludeButtonListener,
            updateActiveModuleInList,
            updateNavigationButtons,
            bindModuleSearchHandlers
        };
    };
})(window);
