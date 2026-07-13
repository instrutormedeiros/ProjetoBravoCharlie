(function(window) {
    'use strict';

    window.PBC_CREATE_NARRATED_AUDIO = function(deps = {}) {
        const moduleNarratedAudioAssets = deps.moduleNarratedAudioAssets || {};
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const driveDownloadUrl = deps.driveDownloadUrl || (value => value);
        const shouldPreloadNarratedAudioViaFetch = deps.shouldPreloadNarratedAudioViaFetch || (() => false);
        const resetLessonAudioPlayer = deps.resetLessonAudioPlayer || (() => {});

        function getModuleNarratedAudioAsset(id) {
            return moduleNarratedAudioAssets[id] || null;
        }

        function formatNarratedAudioTime(seconds) {
            const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
            const minutes = Math.floor(safeSeconds / 60);
            const remaining = String(safeSeconds % 60).padStart(2, '0');
            return `${minutes}:${remaining}`;
        }

        function getNarratedLessonAudioElement() {
            return document.getElementById('narrated-lesson-audio');
        }

        function updateNarratedLessonAudioUi() {
            const audio = getNarratedLessonAudioElement();
            if (!audio) return;
            const playIcon = document.getElementById('narrated-audio-play-icon');
            const playText = document.getElementById('narrated-audio-play-text');
            const current = document.getElementById('narrated-audio-current');
            const duration = document.getElementById('narrated-audio-duration');
            const progress = document.getElementById('narrated-audio-progress');
            const durationValue = Number.isFinite(audio.duration) ? audio.duration : 0;
            const progressValue = durationValue ? Math.min(100, Math.max(0, (audio.currentTime / durationValue) * 100)) : 0;

            if (playIcon) playIcon.className = audio.paused ? 'fas fa-play' : 'fas fa-pause';
            if (playText) playText.textContent = audio.paused ? 'Ouvir aula' : 'Pausar';
            if (current) current.textContent = formatNarratedAudioTime(audio.currentTime);
            if (duration) duration.textContent = durationValue ? formatNarratedAudioTime(durationValue) : '--:--';
            if (progress && document.activeElement !== progress) progress.value = String(progressValue);
        }

        function renderNarratedLessonAudioHtml(moduleId, moduleTitle) {
            const asset = getModuleNarratedAudioAsset(moduleId);
            if (!asset?.source) return '';
            const audioSrc = driveDownloadUrl(asset.source);
            return `
                <section class="narrated-audio-player" data-narrated-module="${escapeHtml(moduleId)}">
                    <div class="narrated-audio-head">
                        <div class="narrated-audio-icon"><i class="fas fa-microphone-lines"></i></div>
                        <div>
                            <span class="narrated-audio-eyebrow">Aula narrada por <b>Instrutor Medeiros</b></span>
                            <strong>${escapeHtml(asset.title || moduleTitle || 'Áudio da aula')}</strong>
                        </div>
                    </div>
                    <audio id="narrated-lesson-audio" preload="metadata" data-source="${escapeHtml(audioSrc)}"></audio>
                    <div class="narrated-audio-controls">
                        <button type="button" class="narrated-skip-btn" onclick="window.seekNarratedLessonAudio(-15)" title="Voltar 15 segundos">
                            <i class="fas fa-rotate-left"></i><span>15s</span>
                        </button>
                        <button type="button" class="narrated-play-btn" onclick="window.toggleNarratedLessonAudio()" title="Reproduzir ou pausar">
                            <i id="narrated-audio-play-icon" class="fas fa-play"></i>
                            <span id="narrated-audio-play-text">Ouvir aula</span>
                        </button>
                        <button type="button" class="narrated-skip-btn" onclick="window.seekNarratedLessonAudio(15)" title="Avançar 15 segundos">
                            <span>15s</span><i class="fas fa-rotate-right"></i>
                        </button>
                        <select id="narrated-audio-speed" class="narrated-speed-select" onchange="window.setNarratedLessonSpeed(this.value)" title="Velocidade">
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1.0x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2.0x</option>
                        </select>
                    </div>
                    <div class="narrated-audio-timeline">
                        <span id="narrated-audio-current">0:00</span>
                        <input id="narrated-audio-progress" type="range" min="0" max="100" value="0" step="0.1" oninput="window.scrubNarratedLessonAudio(this.value)" aria-label="Progresso do áudio">
                        <span id="narrated-audio-duration">--:--</span>
                    </div>
                    <p id="narrated-audio-status" class="narrated-audio-status">
                        <i class="fas fa-headphones"></i> Aula narrada pronta para ouvir.
                    </p>
                </section>
            `;
        }

        function waitForNarratedAudioReady(audio, timeoutMs = 12000) {
            if (!audio) return Promise.reject(new Error('Player não encontrado.'));
            if (audio.readyState >= 2) return Promise.resolve();

            return new Promise((resolve, reject) => {
                let done = false;
                const cleanup = () => {
                    audio.removeEventListener('canplay', onReady);
                    audio.removeEventListener('loadeddata', onReady);
                    audio.removeEventListener('error', onError);
                    clearTimeout(timer);
                };
                const finish = (callback) => {
                    if (done) return;
                    done = true;
                    cleanup();
                    callback();
                };
                const onReady = () => finish(resolve);
                const onError = () => finish(() => reject(new Error('O navegador não conseguiu preparar este áudio.')));
                const timer = setTimeout(() => finish(() => reject(new Error('Tempo esgotado ao carregar o áudio.'))), timeoutMs);

                audio.addEventListener('canplay', onReady, { once: true });
                audio.addEventListener('loadeddata', onReady, { once: true });
                audio.addEventListener('error', onError, { once: true });
            });
        }

        window.initNarratedLessonAudio = function() {
            const audio = getNarratedLessonAudioElement();
            if (!audio || audio.dataset.bound === 'true') return;
            audio.dataset.bound = 'true';
            const status = document.getElementById('narrated-audio-status');
            ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended'].forEach(eventName => {
                audio.addEventListener(eventName, updateNarratedLessonAudioUi);
            });
            audio.addEventListener('ended', () => {
                audio.currentTime = 0;
                updateNarratedLessonAudioUi();
            });
            audio.addEventListener('error', () => {
                if (status) {
                    status.classList.add('error');
                    status.innerHTML = '<i class="fas fa-circle-exclamation"></i> Não consegui preparar este áudio. Recarregue a página e tente novamente.';
                }
            });
            updateNarratedLessonAudioUi();
        };

        async function ensureNarratedLessonAudioSource(audio) {
            if (!audio) throw new Error('Player não encontrado.');
            if (audio.src && audio.dataset.ready === 'true') return;
            if (audio.dataset.loading === 'true') return;

            const source = audio.dataset.source;
            if (!source) throw new Error('Fonte do áudio não configurada.');
            const status = document.getElementById('narrated-audio-status');
            const playText = document.getElementById('narrated-audio-play-text');
            const playIcon = document.getElementById('narrated-audio-play-icon');

            audio.dataset.loading = 'true';
            if (playText) playText.textContent = 'Carregando...';
            if (playIcon) playIcon.className = 'fas fa-spinner fa-spin';
            if (status) {
                status.classList.remove('error');
                status.innerHTML = '<i class="fas fa-cloud-arrow-down"></i> Carregando a aula narrada com segurança...';
            }

            if (!shouldPreloadNarratedAudioViaFetch(source)) {
                if (audio.dataset.objectUrl) {
                    URL.revokeObjectURL(audio.dataset.objectUrl);
                    delete audio.dataset.objectUrl;
                }
                audio.src = source;
                audio.load();
                await waitForNarratedAudioReady(audio);
                audio.dataset.ready = 'true';
                audio.dataset.loading = 'false';
                if (status) {
                    status.classList.remove('error');
                    status.innerHTML = '<i class="fas fa-circle-check"></i> Aula carregada. Você pode pausar, avançar e voltar quando quiser.';
                }
                return;
            }

            const response = await fetch(source, { mode: 'cors', cache: 'force-cache' });
            if (!response.ok) throw new Error(`Não consegui baixar o áudio. Código ${response.status}.`);
            const blob = await response.blob();
            if (!blob.size) throw new Error('O arquivo de áudio veio vazio.');
            if (audio.dataset.objectUrl) URL.revokeObjectURL(audio.dataset.objectUrl);
            const objectUrl = URL.createObjectURL(blob);
            audio.dataset.objectUrl = objectUrl;
            audio.src = objectUrl;
            audio.load();
            await waitForNarratedAudioReady(audio);
            audio.dataset.ready = 'true';
            audio.dataset.loading = 'false';
            if (status) {
                status.classList.remove('error');
                status.innerHTML = '<i class="fas fa-circle-check"></i> Aula carregada. Agora você pode ouvir, pausar, avançar e voltar quando quiser.';
            }
        }

        window.toggleNarratedLessonAudio = async function() {
            const audio = getNarratedLessonAudioElement();
            if (!audio) return;
            try {
                if (window.speechSynthesis?.speaking || window.speechSynthesis?.paused) {
                    window.speechSynthesis.cancel();
                    resetLessonAudioPlayer();
                }
                if (audio.paused) {
                    await ensureNarratedLessonAudioSource(audio);
                    await audio.play();
                }
                else audio.pause();
                updateNarratedLessonAudioUi();
            } catch (error) {
                console.error('Erro ao tocar áudio narrado:', error);
                audio.dataset.loading = 'false';
                audio.dataset.ready = '';
                const status = document.getElementById('narrated-audio-status');
                if (status) {
                    status.classList.add('error');
                    status.innerHTML = '<i class="fas fa-circle-exclamation"></i> Não consegui iniciar este áudio. Recarregue a página e tente novamente.';
                }
                updateNarratedLessonAudioUi();
            }
        };

        window.seekNarratedLessonAudio = function(deltaSeconds) {
            const audio = getNarratedLessonAudioElement();
            if (!audio) return;
            const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
            const nextTime = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, audio.currentTime + Number(deltaSeconds || 0)));
            audio.currentTime = nextTime;
            updateNarratedLessonAudioUi();
        };

        window.scrubNarratedLessonAudio = function(percent) {
            const audio = getNarratedLessonAudioElement();
            if (!audio || !Number.isFinite(audio.duration) || !audio.duration) return;
            audio.currentTime = (Number(percent || 0) / 100) * audio.duration;
            updateNarratedLessonAudioUi();
        };

        window.setNarratedLessonSpeed = function(value) {
            const audio = getNarratedLessonAudioElement();
            if (!audio) return;
            audio.playbackRate = Number(value) || 1;
        };

        return {
            getNarratedLessonAudioElement,
            renderNarratedLessonAudioHtml,
            initNarratedLessonAudio: window.initNarratedLessonAudio
        };
    };
})(window);
