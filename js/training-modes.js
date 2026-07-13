(function () {
    'use strict';

    window.PBC_CREATE_TRAINING_MODES = function createTrainingModes(deps = {}) {
        const getContentArea = deps.getContentArea || (() => document.getElementById('content-area'));
        const getLoadingSpinner = deps.getLoadingSpinner || (() => document.getElementById('loading-spinner'));
        const getCompletedModules = deps.getCompletedModules || (() => []);
        const setCompletedModules = deps.setCompletedModules || (() => {});
        const getCurrentUserData = deps.getCurrentUserData || (() => null);
        const saveProgressToCloud = deps.saveProgressToCloud || (() => {});
        const updateProgress = deps.updateProgress || (() => {});
        const shuffleArray = deps.shuffleArray || ((items) => [...items].sort(() => Math.random() - 0.5));
        const getQuizData = deps.getQuizData || (() => window.QUIZ_DATA || {});
        const loadModuleContent = deps.loadModuleContent || (() => {});
        const confetti = deps.confetti || window.confetti;

        const contentArea = getContentArea();
        const loadingSpinner = getLoadingSpinner();

        let simuladoTimerInterval = null;
        let simuladoTimeLeft = 0;
        let activeSimuladoQuestions = [];
        let userAnswers = {};
        let currentSimuladoQuestionIndex = 0;
        let activeSimuladoModuleData = null;

        let survivalLives = 3;
        let survivalScore = 0;
        let survivalQuestions = [];
        let currentSurvivalIndex = 0;
        let survivalStreak = 0;
        let survivalBestStreak = 0;

        function clearSimuladoTimer() {
            if (simuladoTimerInterval) clearInterval(simuladoTimerInterval);
            simuladoTimerInterval = null;
        }

  // --- FUNÇÃO 5: BANCO DE QUESTÕES (VERSÃO DEBUG / BLINDADA) ---
async function generateSimuladoQuestions(config) {
    console.log("Iniciando geração de simulado...");
    const finalExamQuestions = [];
    const globalSeenSignatures = new Set(); // Rastreia Texto + Opções para unicidade absoluta

    const map = {
        'rh': [1, 2, 3, 4, 5],
        'legislacao': [6, 7, 8, 9, 10],
        'salvamento': [11, 12, 13, 14, 15],
        'pci': [16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
        'aph_novo': [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
    };

    for (const [catKey, qtyNeeded] of Object.entries(config.distribution)) {
        let pool = [];
        const targetModules = map[catKey] || [];

        // 1. Coleta TUDO
        targetModules.forEach(num => {
            const modId = `module${num}`;
            if (window.QUIZ_DATA && window.QUIZ_DATA[modId]) {
                pool.push(...window.QUIZ_DATA[modId]);
            }
        });

        console.log(`Categoria ${catKey}: ${pool.length} questões encontradas no total.`);

        // 2. Embaralha MUITO BEM
        pool = shuffleArray(pool); // Mistura 1
        pool = shuffleArray(pool); // Mistura 2 (Garantia)

        // 3. Seleciona ÚNICAS
        let addedCount = 0;
        for (const q of pool) {
            if (addedCount >= qtyNeeded) break;

            // Assinatura única: Texto da pergunta + Texto da primeira opção (para diferenciar perguntas parecidas)
            const signature = (q.question + (q.options['a'] || '')).replace(/\s+/g, '').toLowerCase();

            if (!globalSeenSignatures.has(signature)) {
                finalExamQuestions.push(q);
                globalSeenSignatures.add(signature);
                addedCount++;
            }
        }
        console.log(`Categoria ${catKey}: ${addedCount} questões únicas adicionadas.`);
    }
    
    // Embaralha o resultado final
    return shuffleArray(finalExamQuestions);
}
  
// --- CARREGAMENTO DE MÓDULOS (ROTEADOR PRINCIPAL) ---
// === LÓGICA: MODO SOBREVIVÊNCIA ===
async function initSurvivalGame() {
    survivalLives = 3;
    survivalScore = 0;
    currentSurvivalIndex = 0;
    survivalStreak = 0;
    survivalBestStreak = 0;
    survivalQuestions = [];

    // Coleta todas as questões disponíveis no app
    const allQs = [];
    for(let i=1; i<=52; i++) { // Módulos de conteúdo
        const modId = `module${i}`;
        const quizData = getQuizData();
            if(quizData[modId]) allQs.push(...quizData[modId]);
    }
    survivalQuestions = shuffleArray(allQs);

    renderSurvivalScreen();
}

function renderSurvivalScreen() {
    if(survivalLives <= 0) {
        // Game Over
        localStorage.setItem('lastSurvivalScore', survivalScore);
        contentArea.innerHTML = `
            <div class="survival-result-panel animate-slide-in">
                <div class="bonus-mode-icon danger"><i class="fas fa-heart-crack"></i></div>
                <span>Fim da tentativa</span>
                <h2>Modo Sobrevivência encerrado</h2>
                <p>Sua pontuação final foi</p>
                <strong>${survivalScore}</strong>
                <p>Melhor sequência: <b>${survivalBestStreak}</b> acertos seguidos.</p>
                <button id="retry-survival" class="action-button pulse-button">Tentar Novamente</button>
            </div>
        `;
        document.getElementById('retry-survival').addEventListener('click', initSurvivalGame);
        return;
    }

    const q = survivalQuestions[currentSurvivalIndex];
    if(!q) {
        contentArea.innerHTML = `<h2 class="text-center text-2xl">Você zerou o banco de questões! Incrível!</h2>`;
        return;
    }

    let hearts = '';
    for(let i=0; i<survivalLives; i++) hearts += '<i class="fas fa-heart text-red-600 text-2xl mx-1 survival-life-heart"></i>';
    const level = survivalScore >= 250 ? 'Elite' : survivalScore >= 150 ? 'Avançado' : survivalScore >= 70 ? 'Operacional' : 'Recruta';
    const progress = Math.min(100, (currentSurvivalIndex / Math.max(survivalQuestions.length, 1)) * 100);
    const multiplier = survivalStreak >= 8 ? 'x3' : survivalStreak >= 4 ? 'x2' : 'x1';

    contentArea.innerHTML = `
        <div class="survival-arena">
            <div class="survival-status-bar survival-status-v2">
                <div class="survival-hearts">${hearts}</div>
                <div><small>Nível</small><strong>${level}</strong></div>
                <div><small>Pontos</small><strong>${survivalScore}</strong></div>
                <div><small>Sequência</small><strong>${survivalStreak}</strong></div>
                <div><small>Bônus</small><strong>${multiplier}</strong></div>
            </div>
            <div class="survival-progress-track"><span style="width:${progress}%"></span></div>
            <div class="survival-question-card survival-question-v2 animate-fade-in">
                <span>Ocorrência relâmpago ${currentSurvivalIndex + 1}</span>
                <p>${q.question}</p>
                <div class="survival-options-grid">
                    ${Object.keys(q.options).map(key => `
                        <button class="survival-option" data-key="${key}">
                            <span>${key.toUpperCase()}</span> ${q.options[key]}
                        </button>
                    `).join('')}
                </div>
                <div id="survival-feedback" class="survival-feedback-v2 hidden"></div>
            </div>
        </div>
    `;

    document.querySelectorAll('.survival-option').forEach(btn => {
        btn.addEventListener('click', (e) => handleSurvivalAnswer(e, q));
    });
}

function handleSurvivalAnswer(e, q) {
    const selected = e.currentTarget.dataset.key;
    const isCorrect = selected === q.answer;
    const btns = document.querySelectorAll('.survival-option');
    
    btns.forEach(b => {
        b.disabled = true;
        if(b.dataset.key === q.answer) b.classList.add('bg-green-200', 'dark:bg-green-900', 'border-green-500');
        else if(b.dataset.key === selected && !isCorrect) b.classList.add('bg-red-200', 'dark:bg-red-900', 'border-red-500');
    });

    const feedback = document.getElementById('survival-feedback');
    if(isCorrect) {
        survivalStreak++;
        survivalBestStreak = Math.max(survivalBestStreak, survivalStreak);
        const bonus = survivalStreak >= 8 ? 30 : survivalStreak >= 4 ? 20 : 10;
        survivalScore += bonus;
        if (feedback) {
            feedback.className = 'survival-feedback-v2 success';
            feedback.innerHTML = `<strong><i class="fas fa-check-circle"></i> Decisão correta</strong><span>+${bonus} pontos. Sequência atual: ${survivalStreak}.</span>`;
        }
        if(typeof confetti === 'function') confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    } else {
        survivalLives--;
        survivalStreak = 0;
        if (feedback) {
            feedback.className = 'survival-feedback-v2 danger';
            feedback.innerHTML = `<strong><i class="fas fa-circle-xmark"></i> Conduta incorreta</strong><span>A resposta correta era ${String(q.answer || '').toUpperCase()}. Você perdeu uma vida.</span>`;
        }
        navigator.vibrate?.(200);
    }

    setTimeout(() => {
        currentSurvivalIndex++;
        renderSurvivalScreen();
    }, 1500);
}

// === LÓGICA: RPG (SIMULADOR) ===
function makeRPGScenario({ id, title, summary, risk, icon, start, scenes }) {
    return { id, title, summary, risk, icon, start, scenes };
}

function getRPGScenarios() {
    const finalWin = (text) => ({ text, type: 'win', options: [{ text: 'Voltar ao menu de ocorrências', next: 'exit' }] });
    const fail = (text, retry) => ({ text, type: 'death', options: [{ text: 'Reavaliar decisão', next: retry }] });
    return {
        warehouse: makeRPGScenario({
            id: 'warehouse',
            title: 'Incêndio em Galpão Industrial',
            summary: 'Fumaça pulsando, porta quente e possível vítima no interior.',
            risk: 'Backdraft',
            icon: 'fas fa-fire',
            start: 'start',
            scenes: {
                start: {
                    text: 'Você chega em um galpão industrial. Há fumaça negra pulsando pelas frestas, porta quente e tinta borbulhando. Qual sua primeira decisão?',
                    options: [
                        { text: 'Abrir a porta imediatamente para ventilar.', next: 'fail_backdraft' },
                        { text: 'Isolar, resfriar porta, posicionar lateralmente e fazer abertura controlada.', next: 'inside' },
                        { text: 'Entrar sozinho para ganhar tempo.', next: 'fail_solo' }
                    ]
                },
                fail_backdraft: fail('<strong>RISCO CRÍTICO.</strong><br>A abertura sem controle alimentou o ambiente e gerou condição de backdraft. Ventilação sem leitura de fumaça é decisão perigosa.', 'start'),
                fail_solo: fail('<strong>FALHA OPERACIONAL.</strong><br>Entrada isolada cria nova vítima. A prioridade é equipe, comunicação, rota de fuga e controle de cena.', 'start'),
                inside: {
                    text: 'A visibilidade é baixa. Você ouve gemido ao fundo, mas percebe estalos no teto central. Como avança?',
                    options: [
                        { text: 'Avançar pelo centro para chegar rápido.', next: 'fail_collapse' },
                        { text: 'Contornar pela parede, mantendo orientação e comunicação.', next: 'victim' }
                    ]
                },
                fail_collapse: fail('<strong>COLAPSO ESTRUTURAL.</strong><br>Área central instável não deve ser cruzada sem avaliação. A parede ajuda orientação e reduz exposição.', 'inside'),
                victim: {
                    text: 'Você encontra vítima inconsciente e pesada. O alarme de ar toca. O que faz?',
                    options: [
                        { text: 'Arrastar sozinho mesmo com pouco ar.', next: 'fail_air' },
                        { text: 'Acionar prioridade, pedir apoio e preparar extração em dupla.', next: 'win' }
                    ]
                },
                fail_air: fail('<strong>CONSUMO DE AR.</strong><br>O esforço sozinho aumentou o consumo e comprometeu sua saída. Segurança da equipe vem antes da pressa.', 'victim'),
                win: finalWin('<strong>MISSÃO CUMPRIDA.</strong><br>Você controlou abertura, preservou orientação, acionou apoio e retirou a vítima com segurança.')
            }
        }),
        car: makeRPGScenario({
            id: 'car',
            title: 'Acidente Veicular com Vítima Presa',
            summary: 'Colisão, combustível no chão e curiosos próximos.',
            risk: 'Trauma',
            icon: 'fas fa-car-burst',
            start: 'start',
            scenes: {
                start: {
                    text: 'Você chega em uma colisão. Há vítima presa, cheiro de combustível e curiosos filmando perto da via. Primeira ação?',
                    options: [
                        { text: 'Puxar a vítima para fora antes que piore.', next: 'fail_pull' },
                        { text: 'Sinalizar, isolar, desligar riscos, acionar apoio e avaliar segurança.', next: 'assessment' },
                        { text: 'Focar em discutir com curiosos.', next: 'fail_crowd' }
                    ]
                },
                fail_pull: fail('<strong>RISCO DE LESÃO.</strong><br>Remoção sem estabilização pode agravar trauma. Primeiro cena, suporte e avaliação.', 'start'),
                fail_crowd: fail('<strong>PRIORIDADE ERRADA.</strong><br>Controle de público é necessário, mas sem abandonar sinalização, riscos e suporte à vítima.', 'start'),
                assessment: {
                    text: 'A vítima está consciente, dor cervical e perna presa. Qual conduta mantém segurança?',
                    options: [
                        { text: 'Manter alinhamento, conversar, monitorar e aguardar desencarceramento.', next: 'win' },
                        { text: 'Dar água para acalmar.', next: 'fail_water' }
                    ]
                },
                fail_water: fail('<strong>CONDUTA INADEQUADA.</strong><br>Em trauma e possível procedimento, não ofereça líquidos. Monitore e mantenha comunicação.', 'assessment'),
                win: finalWin('<strong>BOA CONDUTA.</strong><br>Você controlou cena, protegeu a vítima e preservou segurança até o apoio especializado.')
            }
        }),
        confined: makeRPGScenario({
            id: 'confined',
            title: 'Espaço Confinado',
            summary: 'Trabalhador inconsciente dentro de reservatório.',
            risk: 'Atmosfera',
            icon: 'fas fa-dungeon',
            start: 'start',
            scenes: {
                start: {
                    text: 'Um trabalhador está inconsciente dentro de um reservatório. Colegas gritam para você entrar logo. O que faz?',
                    options: [
                        { text: 'Entrar imediatamente prendendo a respiração.', next: 'fail_entry' },
                        { text: 'Isolar, impedir novas entradas, acionar equipe especializada e monitorar atmosfera.', next: 'control' }
                    ]
                },
                fail_entry: fail('<strong>NOVA VÍTIMA.</strong><br>Espaço confinado pode ter atmosfera letal. Entrada sem medição e plano de resgate é extremamente perigosa.', 'start'),
                control: {
                    text: 'Um colega tenta entrar para salvar o amigo. Sua decisão?',
                    options: [
                        { text: 'Bloquear entrada, explicar o risco e organizar ponto de comando.', next: 'win' },
                        { text: 'Deixar entrar porque ele conhece o local.', next: 'fail_second' }
                    ]
                },
                fail_second: fail('<strong>EFEITO DOMINÓ.</strong><br>Resgates improvisados em espaço confinado costumam gerar múltiplas vítimas.', 'control'),
                win: finalWin('<strong>COMANDO CORRETO.</strong><br>Você evitou novas vítimas, preservou cena e acionou resposta adequada.')
            }
        }),
        mall: makeRPGScenario({
            id: 'mall',
            title: 'Mal Súbito em Shopping',
            summary: 'Pessoa cai, público se aproxima e familiares entram em pânico.',
            risk: 'PCR',
            icon: 'fas fa-heart-pulse',
            start: 'start',
            scenes: {
                start: {
                    text: 'Uma pessoa cai no corredor. Está inconsciente e há muita gente em volta. Qual ação inicial?',
                    options: [
                        { text: 'Afastar curiosos, avaliar responsividade e respiração, pedir DEA/192.', next: 'cpr' },
                        { text: 'Levantar a pessoa para acordar.', next: 'fail_move' },
                        { text: 'Jogar água no rosto.', next: 'fail_water' }
                    ]
                },
                fail_move: fail('<strong>RISCO.</strong><br>Movimentação sem avaliação pode piorar lesões e atrasa conduta crítica.', 'start'),
                fail_water: fail('<strong>MITO PERIGOSO.</strong><br>Água não resolve inconsciência e pode trazer risco de aspiração.', 'start'),
                cpr: {
                    text: 'A pessoa não respira normalmente. O DEA está chegando. Qual prioridade?',
                    options: [
                        { text: 'Iniciar compressões e alternar com equipe quando possível.', next: 'win' },
                        { text: 'Esperar o DEA chegar sem compressões.', next: 'fail_wait' }
                    ]
                },
                fail_wait: fail('<strong>TEMPO É VIDA.</strong><br>Compressões precoces aumentam chance de sobrevivência.', 'cpr'),
                win: finalWin('<strong>RESPOSTA FORTE.</strong><br>Você organizou cena, acionou ajuda, iniciou RCP e integrou o DEA.')
            }
        }),
        gas: makeRPGScenario({
            id: 'gas',
            title: 'Vazamento de GLP',
            summary: 'Odor forte, cozinha fechada e risco de ignição.',
            risk: 'Explosão',
            icon: 'fas fa-burn',
            start: 'start',
            scenes: {
                start: {
                    text: 'Você sente odor forte de gás em uma cozinha fechada. Um funcionário quer acender a luz para enxergar. O que você faz?',
                    options: [
                        { text: 'Acender a luz rapidamente.', next: 'fail_spark' },
                        { text: 'Evitar acionamentos elétricos, ventilar naturalmente, isolar e fechar registro se seguro.', next: 'control' }
                    ]
                },
                fail_spark: fail('<strong>IGNIÇÃO.</strong><br>Interruptores podem gerar centelha. Em vazamento, evite acionamentos elétricos.', 'start'),
                control: {
                    text: 'O registro fica próximo ao ponto de vazamento. Como proceder?',
                    options: [
                        { text: 'Avaliar se é seguro, usar rota de fuga e acionar apoio se houver risco.', next: 'win' },
                        { text: 'Correr até o registro sem avaliar concentração.', next: 'fail_rush' }
                    ]
                },
                fail_rush: fail('<strong>EXPOSIÇÃO DESNECESSÁRIA.</strong><br>Ação rápida sem leitura de risco pode colocar você dentro da zona perigosa.', 'control'),
                win: finalWin('<strong>CENA CONTROLADA.</strong><br>Você evitou fontes de ignição, isolou e reduziu risco com procedimento seguro.')
            }
        }),
        aggression: makeRPGScenario({
            id: 'aggression',
            title: 'Agressão em Evento',
            summary: 'Briga perto da saída, público comprimindo e risco de tumulto.',
            risk: 'Multidão',
            icon: 'fas fa-people-arrows',
            start: 'start',
            scenes: {
                start: {
                    text: 'Duas pessoas brigam perto da saída e o público começa a se aglomerar. Qual sua melhor primeira ação?',
                    options: [
                        { text: 'Entrar no meio sozinho para separar.', next: 'fail_solo' },
                        { text: 'Acionar apoio, abrir corredor de segurança e orientar afastamento do público.', next: 'control' },
                        { text: 'Gritar para intimidar todos.', next: 'fail_escalate' }
                    ]
                },
                fail_solo: fail('<strong>RISCO PESSOAL.</strong><br>Entrar sozinho em conflito ativo pode aumentar vítimas e perder controle da cena.', 'start'),
                fail_escalate: fail('<strong>ESCALADA.</strong><br>Tom agressivo aumenta tensão. Controle profissional pede comando claro e apoio.', 'start'),
                control: {
                    text: 'Uma vítima cai e relata dor no braço. A briga foi contida. O que priorizar?',
                    options: [
                        { text: 'Avaliar vítima, manter área isolada, registrar e acionar suporte conforme gravidade.', next: 'win' },
                        { text: 'Mandar levantar para liberar a passagem.', next: 'fail_victim' }
                    ]
                },
                fail_victim: fail('<strong>ATENDIMENTO FRÁGIL.</strong><br>Queda com dor exige avaliação e registro. Pressa sem avaliação prejudica segurança.', 'control'),
                win: finalWin('<strong>GESTÃO PROFISSIONAL.</strong><br>Você controlou público, preservou equipe, atendeu vítima e documentou o ocorrido.')
            }
        })
    };
}

async function initRPGGame(rpgData) {
    renderRPGScene(rpgData.start, rpgData);
}

function renderRPGScene(sceneId, rpgData) {
    const scene = rpgData.scenes[sceneId];
    if(!scene) return; 

    let html = `
        <div class="max-w-2xl mx-auto animate-fade-in">
            <div class="rpg-scene-panel">
                ${scene.image ? `<img src="${scene.image}" class="w-full h-48 object-cover">` : ''}
                <div class="rpg-scene-body">
                    <span><i class="fas fa-radio"></i> ${rpgData.title || 'Decisão operacional'}</span>
                    <p>${scene.text}</p>
                    <div class="rpg-choice-stack">
    `;

    scene.options.forEach(opt => {
        html += `
            <button class="rpg-choice-btn w-full text-left p-4 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all rounded shadow-sm mb-2" data-next="${opt.next}">
                <i class="fas fa-chevron-right text-blue-500 mr-2"></i> ${opt.text}
            </button>
        `;
    });

    html += `</div></div></div></div>`;
    contentArea.innerHTML = html;

    if(scene.type === 'death') {
        contentArea.querySelector('.rpg-scene-panel')?.classList.add('danger');
    } else if(scene.type === 'win') {
        contentArea.querySelector('.rpg-scene-panel')?.classList.add('success');
        if(typeof confetti === 'function') confetti();
    }

    document.querySelectorAll('.rpg-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const next = btn.dataset.next;
            if(next === 'exit') loadModuleContent('module61'); 
            else renderRPGScene(next, rpgData);
        });
    });
}

// === LÓGICA: CARTEIRINHA DIGITAL ===
function renderDigitalID() {
    const currentUserData = getCurrentUserData();
    if (!currentUserData) return;
    
    const container = document.getElementById('id-card-container');
    if (!container) return;

    const savedPhoto = localStorage.getItem('user_profile_pic');
    const defaultPhoto = "https://raw.githubusercontent.com/instrutormedeiros/ProjetoBravoCharlie/refs/heads/main/assets/img/LOGO_QUADRADA.png"; 
    const currentPhoto = savedPhoto || defaultPhoto;

    const validUntil = new Date(currentUserData.acesso_ate).toLocaleDateString('pt-BR');
    const statusColor = currentUserData.status === 'premium' ? 'text-yellow-400' : 'text-gray-400';
    
    container.innerHTML = `
        <div class="relative w-full max-w-md bg-gradient-card rounded-xl overflow-hidden shadow-2xl text-white font-sans transform transition hover:scale-[1.01] duration-300">
            <div class="card-shine"></div>
            <div class="bg-red-700 p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="bg-white p-1 rounded-full">
                        <img src="https://raw.githubusercontent.com/instrutormedeiros/ProjetoBravoCharlie/refs/heads/main/assets/img/LOGO_QUADRADA.png" class="w-10 h-10 object-cover">
                    </div>
                    <div>
                        <h3 class="font-bold text-sm uppercase tracking-wider">Bombeiro Civil</h3>
                        <p class="text-[10px] text-red-200">Identificação de Aluno</p>
                    </div>
                </div>
                <i class="fas fa-wifi text-white/50 rotate-90"></i>
            </div>
            <div class="p-6 relative z-10">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex items-center gap-4">
                        <div class="relative group cursor-pointer" onclick="document.getElementById('profile-pic-input').click()" title="Clique para alterar a foto">
                            <div class="w-20 h-20 rounded-lg border-2 border-white/30 overflow-hidden bg-gray-800">
                                <img id="id-card-photo" src="${currentPhoto}" class="w-full h-full object-cover">
                            </div>
                            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <i class="fas fa-camera text-white"></i>
                            </div>
                            <input type="file" id="profile-pic-input" class="hidden" accept="image/*" onchange="window.updateProfilePic(this)">
                        </div>
                        <div>
                            <p class="text-xs text-gray-400 uppercase mb-1">Nome do Aluno</p>
                            <h2 class="text-lg font-bold text-white tracking-wide leading-tight max-w-[150px] break-words">${currentUserData.name}</h2>
                        </div>
                    </div>
                    <div class="bg-white p-1 rounded">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUserData.email}" class="w-14 h-14">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase">CPF</p>
                        <p class="font-mono text-sm">${currentUserData.cpf || '000.000.000-00'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase">Matrícula</p>
                        <p class="font-mono text-sm">BC-${Math.floor(Math.random()*10000)}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase">Válido Até</p>
                        <p class="font-bold text-green-400 text-sm">${validUntil}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase">Status</p>
                        <p class="font-bold text-sm uppercase flex items-center gap-1 ${statusColor}">
                            <i class="fas fa-star text-xs"></i> ${currentUserData.status || 'Trial'}
                        </p>
                    </div>
                </div>
            </div>
            <div class="bg-black/30 p-3 text-center border-t border-white/10">
                <p class="text-[9px] text-gray-500">Uso pessoal e intransferível. Toque na foto para alterar.</p>
            </div>
        </div>
        <div class="text-center mt-6">
            <button onclick="window.print()" class="text-sm text-blue-500 hover:underline"><i class="fas fa-print"></i> Imprimir Carteirinha</button>
        </div>
    `;
}

window.updateProfilePic = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoUrl = e.target.result;
            const idCardPhoto = document.getElementById('id-card-photo');
            const profilePhoto = document.getElementById('student-profile-photo-img');
            const profileInitial = document.getElementById('student-profile-photo-initial');
            if (idCardPhoto) idCardPhoto.src = photoUrl;
            if (profilePhoto) {
                profilePhoto.src = photoUrl;
                profilePhoto.classList.remove('hidden');
            }
            if (profileInitial) profileInitial.classList.add('hidden');
            localStorage.setItem('user_profile_pic', photoUrl);
        };
        reader.readAsDataURL(input.files[0]);
    }
};

   // === FUNÇÕES SIMULADO (NORMAL - SEM MODO FOCO) ===
async function startSimuladoMode(moduleData) {
    activeSimuladoModuleData = moduleData;
    // Pausar áudio se estiver tocando (Pedido 2 - parte A)
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    loadingSpinner.classList.remove('hidden');
    contentArea.classList.add('hidden');

    // Gera questões sem repetição
    activeSimuladoQuestions = await generateSimuladoQuestions(moduleData.simuladoConfig);
    userAnswers = {};
    simuladoTimeLeft = moduleData.simuladoConfig.timeLimit * 60; 
    currentSimuladoQuestionIndex = 0;

    // --- 4. TIMER STICKY (HTML ATUALIZADO) ---
    contentArea.innerHTML = `
        <div class="simulado-pro-page">
            
            <div id="simulado-timer-bar" class="simulado-floating-timer">
                <i class="fas fa-clock text-orange-500"></i>
                <span id="timer-display" class="timer-text mx-2">--:--</span>
                <div class="h-4 w-px bg-gray-600 mx-2"></div>
                <span class="text-xs text-gray-300">Questão <span id="q-current">1</span>/${activeSimuladoQuestions.length}</span>
                <span id="sim-answer-status" class="sim-answer-status"><i class="fas fa-circle"></i> Aguardando resposta</span>
            </div>
            
            <div class="simulado-pro-hero">
                 <span><i class="fas fa-clipboard-check"></i> Simulados por Matéria</span>
                 <h3>
                    ${moduleData.title}
                 </h3>
                 <p>Modo prova com tempo, navegação por questão e gabarito comentado ao final.</p>
            </div>

            <div id="question-display-area" class="simulado-question-container"></div>
            
            <div class="simulado-nav-row">
                <button id="sim-prev-btn" class="action-button bg-gray-600" style="visibility: hidden;">
                    <i class="fas fa-arrow-left mr-2"></i> Anterior
                </button>
                <button id="sim-next-btn" class="action-button">
                    Próxima <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `;
    // --- FIM HTML SIMULADO ---
    
    contentArea.classList.remove('hidden');
    loadingSpinner.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    showSimuladoQuestion(currentSimuladoQuestionIndex);
    startTimer(moduleData.id);

    document.getElementById('sim-next-btn').addEventListener('click', () => navigateSimulado(1, moduleData.id));
    document.getElementById('sim-prev-btn').addEventListener('click', () => navigateSimulado(-1, moduleData.id));
}

// --- FUNÇÃO AUXILIAR: EXIBIR QUESTÃO (CORRIGIDA - USO DE INDEX) ---
function showSimuladoQuestion(index) {
    const q = activeSimuladoQuestions[index];
    const container = document.getElementById('question-display-area');
    
    // CORREÇÃO: Usa o INDEX para recuperar a resposta, não o ID
    // Isso impede que a resposta da Q1 apareça na Q3 se elas tiverem o mesmo ID
    const savedAnswer = userAnswers[index] || null; 
    
    let html = `
        <div class="simulado-question-card animate-slide-in">
            <div class="simulado-question-title">
                <div>${String(index + 1).padStart(2, '0')}</div>
                <p>
                    ${q.question}
                </p>
            </div>
            <div class="simulado-options-stack">
    `;
    
    for (const key in q.options) {
        const isSelected = savedAnswer === key ? 'selected' : '';
        // CORREÇÃO: Passamos o INDEX na função onclick
        html += `
            <div class="quiz-card-option ${isSelected}" onclick="selectSimuladoOption(${index}, '${key}', this)">
                <div class="quiz-letter-box">${key.toUpperCase()}</div>
                <div class="font-medium flex-1">${q.options[key]}</div>
            </div>
        `;
    }
    html += `</div></div>`;
    container.innerHTML = html;

    document.getElementById('q-current').innerText = index + 1;
    
    const prevBtn = document.getElementById('sim-prev-btn');
    const nextBtn = document.getElementById('sim-next-btn');
    
    prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    if (index === activeSimuladoQuestions.length - 1) {
        nextBtn.innerHTML = '<i class="fas fa-check-double mr-2"></i> ENTREGAR';
        nextBtn.className = "sim-nav-btn sim-submit-btn";
    } else {
        nextBtn.innerHTML = 'Próxima <i class="fas fa-arrow-right ml-2"></i>';
        nextBtn.className = "sim-nav-btn sim-next-btn";
    }
    updateSimuladoSelectionStatus(savedAnswer);
}

// Função auxiliar para selecionar a opção visualmente
window.selectSimuladoOption = function(index, key, element) {
    // Remove seleção anterior
    const parent = element.parentElement;
    parent.querySelectorAll('.quiz-card-option').forEach(el => {
        el.classList.remove('selected', 'just-selected');
        el.querySelector('.sim-selected-check')?.remove();
    });
    // Adiciona à atual
    element.classList.add('selected');
    element.classList.add('just-selected');
    element.insertAdjacentHTML('beforeend', '<span class="sim-selected-check"><i class="fas fa-check"></i> Selecionada</span>');
    setTimeout(() => element.classList.remove('just-selected'), 650);
    // Salva resposta usando o ÍNDICE
    registerSimuladoAnswer(index, key);
    updateSimuladoSelectionStatus(key);
};

window.registerSimuladoAnswer = function(index, answer) {
    userAnswers[index] = answer; // Salva na posição 0, 1, 2...
};

function updateSimuladoSelectionStatus(answer) {
    const status = document.getElementById('sim-answer-status');
    if (!status) return;
    if (answer) {
        status.classList.add('answered');
        status.innerHTML = `<i class="fas fa-check-circle"></i> Resposta ${String(answer).toUpperCase()} selecionada`;
    } else {
        status.classList.remove('answered');
        status.innerHTML = '<i class="fas fa-circle"></i> Aguardando resposta';
    }
}

window.restartCurrentSimulado = function() {
    if (activeSimuladoModuleData) startSimuladoMode(activeSimuladoModuleData);
};

function navigateSimulado(direction, moduleId) {
    const newIndex = currentSimuladoQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < activeSimuladoQuestions.length) {
        currentSimuladoQuestionIndex = newIndex;
        showSimuladoQuestion(newIndex);
        window.scrollTo({ top: 100, behavior: 'smooth' });
    } else if (newIndex >= activeSimuladoQuestions.length) {
        showSimuladoSubmitConfirm(moduleId);
    }
}

function showSimuladoSubmitConfirm(moduleId) {
    document.getElementById('simulado-submit-modal')?.remove();
    const total = activeSimuladoQuestions.length;
    const answered = Object.keys(userAnswers).length;
    const pending = Math.max(0, total - answered);
    const modal = document.createElement('div');
    modal.id = 'simulado-submit-modal';
    modal.className = 'simulado-submit-modal';
    modal.innerHTML = `
        <div class="simulado-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="simulado-submit-title">
            <button class="simulado-submit-close" type="button" aria-label="Fechar" onclick="document.getElementById('simulado-submit-modal')?.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="simulado-submit-icon"><i class="fas fa-clipboard-check"></i></div>
            <span class="simulado-submit-kicker">Finalizar avaliação</span>
            <h3 id="simulado-submit-title">Entregar este simulado?</h3>
            <p>Você respondeu <strong>${answered}/${total}</strong> questões${pending ? ` e ainda tem <strong>${pending}</strong> sem resposta.` : '.'}</p>
            <div class="simulado-submit-actions">
                <button type="button" class="simulado-submit-secondary" data-simulado-submit-cancel>
                    <i class="fas fa-arrow-left"></i> Continuar revisando
                </button>
                <button type="button" class="simulado-submit-primary" data-simulado-submit-confirm>
                    <i class="fas fa-check-double"></i> Entregar agora
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('[data-simulado-submit-cancel]')?.addEventListener('click', () => modal.remove());
    modal.querySelector('[data-simulado-submit-confirm]')?.addEventListener('click', () => {
        modal.remove();
        finishSimulado(moduleId);
    });
}

window.registerSimuladoAnswer = function(qId, answer) {
    userAnswers[qId] = answer;
};

function startTimer(moduleId) {
    const display = document.getElementById('timer-display');
    simuladoTimerInterval = setInterval(() => {
        simuladoTimeLeft--;
        const m = Math.floor(simuladoTimeLeft / 60);
        const s = simuladoTimeLeft % 60;
        display.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        
        if (simuladoTimeLeft <= 0) {
            clearInterval(simuladoTimerInterval);
            alert("Tempo esgotado! O simulado será encerrado.");
            finishSimulado(moduleId);
        }
    }, 1000);
}

   // === FINALIZAÇÃO DO SIMULADO ===
function finishSimulado(moduleId) {
    clearInterval(simuladoTimerInterval);
    
    let correctCount = 0;
    const total = activeSimuladoQuestions.length;
    let feedbackHtml = '<div class="space-y-6 mt-8">';

    activeSimuladoQuestions.forEach((q, i) => {
        const selected = userAnswers[i]; // 'i' é o índice do loop (0, 1, 2...)
        const isCorrect = selected === q.answer;
        if(isCorrect) correctCount++;
        
        const boxClass = isCorrect ? 'feedback-correct' : 'feedback-wrong';
        const icon = isCorrect ? 'fa-check-circle' : 'fa-times-circle';
        const explanation = q.explanation || "Sem explicação disponível.";

        let optionsHtml = '';
        for (const key in q.options) {
            let rowClass = 'bg-gray-50 dark:bg-gray-800 text-gray-500'; 
            let iconStatus = '';

            if (key === q.answer) {
                rowClass = 'answer-row correct-ref'; 
                iconStatus = '<i class="fas fa-check text-green-500 float-right"></i>';
            } else if (key === selected && !isCorrect) {
                rowClass = 'answer-row user-wrong'; 
                iconStatus = '<i class="fas fa-times text-red-500 float-right"></i>';
            }

            optionsHtml += `
                <div class="${rowClass}">
                    <strong class="mr-2 uppercase">${key})</strong> ${q.options[key]} ${iconStatus}
                </div>
            `;
        }

        feedbackHtml += `
            <div class="feedback-box ${boxClass}">
                <div class="feedback-header">
                    <span>${i+1}. ${q.question}</span>
                    <i class="fas ${icon} text-xl"></i>
                </div>
                <div class="feedback-body bg-white dark:bg-gray-900">
                    <div class="mb-3 text-xs font-bold text-gray-400 uppercase">SUA RESPOSTA: <span class="${isCorrect ? 'text-green-500' : 'text-red-500'}">${selected ? selected.toUpperCase() : 'NENHUMA'}</span></div>
                    ${optionsHtml}
                    <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p class="text-xs font-bold text-blue-500 mb-1"><i class="fas fa-info-circle"></i> EXPLICAÇÃO:</p>
                        <p class="explanation-text">${explanation}</p>
                    </div>
                </div>
            </div>
        `;
    });
    feedbackHtml += '</div>';

    const score = (correctCount / total) * 10;
    const percentage = (correctCount / total) * 100;
    const note = score.toFixed(1).replace('.', ',');
    const unanswered = total - Object.keys(userAnswers).length;
    const wrongCount = total - correctCount;
    const resultTitle = score >= 9 ? 'Excelente resultado' : score >= 7 ? 'Bom resultado' : score >= 5 ? 'Você está no caminho' : 'Vamos reforçar e tentar de novo';
    const retryMessage = score >= 10 ? 'Nota 10. Agora revise o gabarito para consolidar.' : 'Vamos de novo? Dessa vez acredito que vai tirar 10.';

    const finalHtml = `
        <div class="simulado-result-page animate-slide-in">
            <section class="simulado-score-dashboard">
                <div class="simulado-score-main">
                    <span><i class="fas fa-chart-simple"></i> Resultado do simulado</span>
                    <h2>${resultTitle}</h2>
                    <p>${retryMessage}</p>
                    <div class="simulado-result-actions">
                        <button onclick="restartCurrentSimulado()" class="action-button">
                            <i class="fas fa-rotate-right mr-2"></i> Vamos de novo
                        </button>
                        <button onclick="goToStudentHome()" class="action-button ghost-action">
                            <i class="fas fa-house mr-2"></i> Ir para início
                        </button>
                    </div>
                </div>
                <div class="simulado-score-ring" style="--percentage: ${percentage}">
                    <strong>${note}</strong>
                    <span>de 10</span>
                </div>
            </section>

            <div class="simulado-result-metrics">
                <article><i class="fas fa-check"></i><span>Acertos</span><strong>${correctCount}/${total}</strong></article>
                <article><i class="fas fa-xmark"></i><span>Erros</span><strong>${wrongCount}</strong></article>
                <article><i class="fas fa-circle-question"></i><span>Sem resposta</span><strong>${unanswered}</strong></article>
                <article><i class="fas fa-percent"></i><span>Aproveitamento</span><strong>${percentage.toFixed(0)}%</strong></article>
            </div>

            <div class="simulado-answer-review">
                <h3><i class="fas fa-clipboard-check"></i> Gabarito detalhado</h3>
                ${feedbackHtml}
            </div>
        </div>
    `;
    
    contentArea.innerHTML = finalHtml;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!completedModules.includes(moduleId)) {
        completedModules.push(moduleId);
        localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
        
        // ADICIONADO: Salva no banco de dados
        saveProgressToCloud();
        
        updateProgress();
    }
}


        return {
            generateSimuladoQuestions,
            initSurvivalGame,
            getRPGScenarios,
            initRPGGame,
            startSimuladoMode,
            renderDigitalID,
            clearSimuladoTimer
        };
    };
})();
