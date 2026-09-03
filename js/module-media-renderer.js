(function(window) {
    'use strict';

    window.PBC_CREATE_MODULE_MEDIA_RENDERER = function(deps = {}) {
        const moduleMediaAssets = deps.moduleMediaAssets || {};
        const assetUrl = deps.assetUrl || (value => value);
        const isDriveFile = deps.isDriveFile || (() => false);
        const drivePreviewUrl = deps.drivePreviewUrl || (value => value);
        const driveOpenUrl = deps.driveOpenUrl || (value => value);
        const driveThumbnailUrl = deps.driveThumbnailUrl || (value => value);
        const isYouTubeUrl = deps.isYouTubeUrl || (() => false);
        const youtubeEmbedUrl = deps.youtubeEmbedUrl || (value => value);
        const getCurrentUserData = deps.getCurrentUserData || (() => null);

        function getModuleMediaAssets(id) {
            return moduleMediaAssets[id] || null;
        }

        function getVideoEmbedHtml(url) {
            if (isYouTubeUrl(url)) {
                return `
                    <iframe class="lesson-youtube-frame lesson-drive-video" src="${youtubeEmbedUrl(url)}" title="Vídeo da aula" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                `;
            }
            if (isDriveFile(url)) {
                return `
                    <iframe class="lesson-drive-frame lesson-drive-video" src="${drivePreviewUrl(url)}" title="Vídeo da aula" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>
                    <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link lesson-drive-open-link">
                        <i class="fas fa-up-right-from-square"></i> Abrir vídeo no Drive
                    </a>
                `;
            }
            return `<video controls preload="metadata" playsinline src="${assetUrl(url)}"></video>`;
        }

        function getPodcastEmbedHtml(url) {
            if (isYouTubeUrl(url)) {
                return `
                    <iframe class="lesson-youtube-frame lesson-drive-video lesson-youtube-podcast" src="${youtubeEmbedUrl(url)}" title="Podcast da aula" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                `;
            }
            if (isDriveFile(url)) {
                return `
                    <iframe class="lesson-drive-frame lesson-drive-audio" src="${drivePreviewUrl(url)}" title="Podcast da aula" allow="autoplay"></iframe>
                    <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link lesson-drive-open-link">
                        <i class="fas fa-up-right-from-square"></i> Abrir podcast no Drive
                    </a>
                `;
            }
            return `<audio controls preload="metadata" src="${assetUrl(url)}"></audio>`;
        }

        function getImageEmbedHtml(url) {
            if (isDriveFile(url)) {
                return `
                    <div class="lesson-image-preview lesson-drive-image-preview">
                        <iframe src="${drivePreviewUrl(url)}" title="Infográfico do módulo" loading="lazy"></iframe>
                    </div>
                    <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link lesson-drive-open-link">
                        <i class="fas fa-up-right-from-square"></i> Abrir infográfico
                    </a>
                `;
            }
            return `
                <div class="lesson-image-preview">
                    <img src="${driveThumbnailUrl(url)}" alt="Infográfico do módulo" loading="lazy">
                </div>
            `;
        }

        function getPdfEmbedHtml(url) {
            return `
                <div class="lesson-pdf-preview">
                    <iframe src="${drivePreviewUrl(url)}" title="Slides do módulo" allow="autoplay"></iframe>
                </div>
                <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link">
                    <i class="fas fa-up-right-from-square"></i> Abrir slides em tela cheia
                </a>
            `;
        }

        function hasPremiumMediaAccess() {
            const currentUserData = getCurrentUserData();
            if (typeof window.hasActivePlatformAccess === 'function') return window.hasActivePlatformAccess(currentUserData);
            return currentUserData?.status === 'premium' || currentUserData?.isAdmin === true || currentUserData?.isManager === true;
        }

        function getLockedMediaHtml(typeLabel, icon) {
            return `
                <div class="lesson-premium-locked-box" aria-label="${typeLabel} bloqueado para assinantes">
                    <div class="lesson-premium-blur">
                        <i class="fas ${icon}"></i>
                        <span>${typeLabel}</span>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                    <div class="lesson-premium-lock-overlay">
                        <span><i class="fas fa-lock"></i> Exclusivo para assinantes</span>
                        <strong>Desbloqueie este material premium</strong>
                        <button type="button" onclick="openSubscriptionModalFromPremium()">
                            <i class="fas fa-gem"></i> Assinar e liberar
                        </button>
                    </div>
                </div>
            `;
        }

        function getPremiumResultsProofHtml() {
            return `
                <div class="lesson-premium-proof" aria-label="Resultados de alunos assinantes">
                    <article><strong>+80%</strong><span>maior taxa de aprovação entre alunos assinantes</span></article>
                    <article><strong>+60%</strong><span>mais probabilidade de notas máximas em provas</span></article>
                    <article><strong>+35%</strong><span>mais chances em entrevistas mantendo a assinatura após o curso</span></article>
                </div>
            `;
        }

        function getModuleMediaHtml(id, title) {
            const media = getModuleMediaAssets(id);
            if (!media) return '';
            const unlocked = hasPremiumMediaAccess();

            return `
                <section class="lesson-media-suite ${unlocked ? 'premium-unlocked' : 'premium-locked'}" aria-label="Materiais da aula">
                    <div class="lesson-media-heading">
                        <span><i class="fas fa-layer-group"></i> Materiais premium da aula</span>
                        <h4>${unlocked ? 'Revise a aula com vídeo, podcast e slides' : 'Materiais premium disponíveis para assinantes'}</h4>
                        <p>${unlocked ? `Conteúdo complementar organizado para reforçar ${title.replace(/^\d+\.\s*/, '')} depois da leitura e dos exercícios.` : 'Os materiais aparecem aqui para você saber o que está disponível. A reprodução é liberada automaticamente para alunos assinantes.'}</p>
                    </div>
                    ${getPremiumResultsProofHtml()}
                    <div class="lesson-media-grid">
                        <article class="lesson-media-card lesson-video-card">
                            <div class="lesson-media-card-title">
                                <i class="fas fa-circle-play"></i>
                                <div>
                                    <strong>Vídeo da aula</strong>
                                    <span>Explicação completa em formato visual</span>
                                </div>
                            </div>
                            ${unlocked ? getVideoEmbedHtml(media.video) : getLockedMediaHtml('Vídeo da aula', 'fa-circle-play')}
                        </article>
                        <article class="lesson-media-card lesson-podcast-card">
                            <div class="lesson-media-card-title">
                                <i class="fas fa-podcast"></i>
                                <div>
                                    <strong>Podcast da aula</strong>
                                    <span>Resumo para ouvir no deslocamento</span>
                                </div>
                            </div>
                            ${unlocked ? getPodcastEmbedHtml(media.podcast) : getLockedMediaHtml('Podcast da aula', 'fa-podcast')}
                        </article>
                        <article class="lesson-media-card lesson-image-card">
                            <div class="lesson-media-card-title">
                                <i class="fas fa-chart-simple"></i>
                                <div>
                                    <strong>Infográfico</strong>
                                    <span>Mapa visual dos pontos principais</span>
                                </div>
                            </div>
                            ${unlocked ? getImageEmbedHtml(media.image) : getLockedMediaHtml('Infográfico premium', 'fa-chart-simple')}
                        </article>
                        <article class="lesson-media-card lesson-pdf-card">
                            <div class="lesson-media-card-title">
                                <i class="fas fa-file-powerpoint"></i>
                                <div>
                                    <strong>Slides da apresentação</strong>
                                    <span>Material para leitura e revisão</span>
                                </div>
                            </div>
                            ${unlocked ? getPdfEmbedHtml(media.pdf) : getLockedMediaHtml('Slides da apresentação', 'fa-file-powerpoint')}
                        </article>
                    </div>
                </section>
            `;
        }

        return {
            getModuleMediaAssets,
            getModuleMediaHtml
        };
    };
})(window);
