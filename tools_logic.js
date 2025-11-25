/* === LÓGICA DAS FERRAMENTAS (TOOLS) - VERSÃO REFINADA V4 === */

(function(){
    window.ToolsApp = window.ToolsApp || {};

    // =================================================================
    // 1. PONTO ELETRÔNICO (AGRUPADO POR DIA + SOMA DE HORAS)
    // =================================================================
    window.ToolsApp.renderPonto = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-clock"></i> Ponto Eletrônico</h3>
                
                <div class="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <label class="text-xs font-bold text-gray-500 block mb-1">Data/Hora Manual (Opcional)</label>
                    <input type="datetime-local" id="ponto-custom-time" class="w-full p-2 rounded border text-sm dark:bg-gray-700 dark:text-white mb-2">
                </div>

                <div class="grid grid-cols-2 gap-2 mb-4">
                    <button onclick="ToolsApp.addPonto('Entrada')" class="bg-green-600 text-white py-3 rounded font-bold text-xs hover:bg-green-500 shadow border-b-4 border-green-800 active:border-0 active:translate-y-1"><i class="fas fa-sign-in-alt"></i> ENTRADA</button>
                    <button onclick="ToolsApp.addPonto('Saída Almoço')" class="bg-yellow-600 text-white py-3 rounded font-bold text-xs hover:bg-yellow-500 shadow border-b-4 border-yellow-800 active:border-0 active:translate-y-1"><i class="fas fa-utensils"></i> SAI ALMOÇO</button>
                    <button onclick="ToolsApp.addPonto('Volta Almoço')" class="bg-yellow-500 text-white py-3 rounded font-bold text-xs hover:bg-yellow-400 shadow border-b-4 border-yellow-700 active:border-0 active:translate-y-1"><i class="fas fa-undo"></i> VOLTA ALMOÇO</button>
                    <button onclick="ToolsApp.addPonto('Saída')" class="bg-red-600 text-white py-3 rounded font-bold text-xs hover:bg-red-500 shadow border-b-4 border-red-800 active:border-0 active:translate-y-1"><i class="fas fa-sign-out-alt"></i> SAÍDA</button>
                </div>
                
                <div class="max-h-96 overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-0 custom-scrollbar">
                    <div id="ponto-list" class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800"></div>
                </div>
                <div class="mt-3 text-right">
                    <button onclick="ToolsApp.clearPonto()" class="text-xs text-red-500 hover:text-red-700 font-bold"><i class="fas fa-trash-alt mr-1"></i> Zerar Tudo</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        setTimeout(ToolsApp.updatePontoList, 100);
    };

    window.ToolsApp.addPonto = function(type) {
        const customInput = document.getElementById('ponto-custom-time').value;
        let dateObj = customInput ? new Date(customInput) : new Date();
        
        // Timestamp para ordenação precisa
        const entry = { 
            id: Date.now(), 
            type: type, 
            iso: dateObj.toISOString(),
            timestamp: dateObj.getTime()
        };
        
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points.push(entry);
        // Ordena do mais novo para o mais antigo
        points.sort((a, b) => b.timestamp - a.timestamp);
        
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        document.getElementById('ponto-custom-time').value = '';
        ToolsApp.updatePontoList();
    };

    // Função auxiliar para calcular horas trabalhadas no dia
    function calculateDailyHours(dayPoints) {
        // Ordena crescente para cálculo (Manhã -> Noite)
        const sorted = [...dayPoints].sort((a, b) => a.timestamp - b.timestamp);
        let totalMs = 0;
        let openEntry = null;

        sorted.forEach(p => {
            if (p.type === 'Entrada' || p.type === 'Volta Almoço') {
                openEntry = p.timestamp;
            } else if ((p.type === 'Saída' || p.type === 'Saída Almoço') && openEntry) {
                totalMs += (p.timestamp - openEntry);
                openEntry = null;
            }
        });

        if (totalMs === 0) return "--:--";

        const h = Math.floor(totalMs / 3600000);
        const m = Math.floor((totalMs % 3600000) / 60000);
        return `${h}h ${m < 10 ? '0'+m : m}m`;
    }

    window.ToolsApp.updatePontoList = function() {
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        const container = document.getElementById('ponto-list');
        if(!container) return;
        
        if(points.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-gray-400 italic text-sm">Nenhum registro de ponto.</div>';
            return;
        }

        // Agrupar por Data (YYYY-MM-DD)
        const grouped = {};
        points.forEach(p => {
            const dateKey = new Date(p.iso).toLocaleDateString('pt-BR');
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(p);
        });

        let html = '';
        // Itera pelas datas (chaves)
        Object.keys(grouped).forEach(dateStr => {
            const dayPoints = grouped[dateStr];
            const dailyTotal = calculateDailyHours(dayPoints);
            
            html += `
                <div class="bg-gray-50 dark:bg-gray-800/50">
                    <div class="p-2 px-3 bg-gray-100 dark:bg-gray-800 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                        <span class="font-bold text-sm text-gray-700 dark:text-gray-200"><i class="far fa-calendar-alt mr-1"></i> ${dateStr}</span>
                        <span class="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">Total: ${dailyTotal}</span>
                    </div>
                    <div class="divide-y divide-gray-100 dark:divide-gray-700">
            `;

            dayPoints.forEach(p => {
                const timeStr = new Date(p.iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                let typeColor = 'text-gray-600';
                let icon = 'fa-circle';
                
                if(p.type === 'Entrada') { typeColor = 'text-green-600'; icon = 'fa-sign-in-alt'; }
                if(p.type === 'Saída') { typeColor = 'text-red-600'; icon = 'fa-sign-out-alt'; }
                if(p.type.includes('Almoço')) { typeColor = 'text-yellow-600'; icon = 'fa-utensils'; }

                html += `
                    <div class="flex justify-between items-center p-2 px-4 hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-center gap-3">
                            <span class="font-mono text-sm font-bold text-gray-500 dark:text-gray-400">${timeStr}</span>
                            <span class="text-xs font-bold uppercase ${typeColor} flex items-center gap-1">
                                <i class="fas ${icon} text-[10px]"></i> ${p.type}
                            </span>
                        </div>
                        <button onclick="ToolsApp.removePonto(${p.id})" class="text-gray-300 hover:text-red-500 px-2"><i class="fas fa-times"></i></button>
                    </div>
                `;
            });

            html += `</div></div>`; // Fecha grupo
        });

        container.innerHTML = html;
    };

    window.ToolsApp.removePonto = function(id) {
        let points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points = points.filter(p => p.id !== id);
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        ToolsApp.updatePontoList();
    };
    window.ToolsApp.clearPonto = function() {
        if(confirm('Apagar todo o histórico de pontos?')) { localStorage.removeItem('tool_ponto'); ToolsApp.updatePontoList(); }
    };


    // =================================================================
    // 2. ESCALA DE SERVIÇO (CALENDÁRIO + FOLGÃO + NAVEGAÇÃO)
    // =================================================================
    window.ToolsApp.renderEscala = function(container) {
        const cfg = JSON.parse(localStorage.getItem('tool_escala_v3')) || { type: '12x36', start: '', folgaoDay: 'none' };
        
        // Estado local para navegação de mês (não salvo no storage)
        window.currentEscalaView = new Date(); 

        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-calendar-alt"></i> Escala de Serviço</h3>
                
                <div class="flex flex-col gap-3 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] uppercase font-bold text-gray-500">Escala</label>
                            <select id="escala-type" class="w-full p-2 rounded border bg-white dark:bg-gray-700 dark:text-white text-sm">
                                <option value="12x36" ${cfg.type === '12x36' ? 'selected' : ''}>12x36 (Dia Sim/Dia Não)</option>
                                <option value="24x48" ${cfg.type === '24x48' ? 'selected' : ''}>24x48 (1x3)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] uppercase font-bold text-gray-500">1º Dia Trabalhado</label>
                            <input type="date" id="escala-start" value="${cfg.start}" class="w-full p-2 rounded border bg-white dark:bg-gray-700 dark:text-white text-sm">
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] uppercase font-bold text-gray-500">Folgão (A cada 15 dias)</label>
                        <select id="escala-folgao" class="w-full p-2 rounded border bg-white dark:bg-gray-700 dark:text-white text-sm">
                            <option value="none" ${cfg.folgaoDay === 'none' ? 'selected' : ''}>Não tenho folgão</option>
                            <option value="0" ${cfg.folgaoDay === '0' ? 'selected' : ''}>Domingo</option>
                            <option value="6" ${cfg.folgaoDay === '6' ? 'selected' : ''}>Sábado</option>
                        </select>
                        <p class="text-[10px] text-gray-400 mt-1">* Se o plantão cair neste dia, ele será pulado (Folga Extra).</p>
                    </div>
                    <button onclick="ToolsApp.saveEscalaConfig()" class="bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-500 shadow mt-1">SALVAR & GERAR</button>
                </div>
                
                <!-- Navegação do Calendário -->
                <div class="flex justify-between items-center mb-2 px-2">
                    <button onclick="ToolsApp.changeEscalaMonth(-1)" class="text-gray-500 hover:text-blue-500"><i class="fas fa-chevron-left"></i></button>
                    <span id="escala-month-label" class="font-bold text-gray-700 dark:text-white uppercase text-sm">Mês</span>
                    <button onclick="ToolsApp.changeEscalaMonth(1)" class="text-gray-500 hover:text-blue-500"><i class="fas fa-chevron-right"></i></button>
                </div>

                <div class="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700 shadow-inner">
                    <div id="escala-result" class="grid grid-cols-7 gap-1 text-center text-xs"></div>
                </div>
            </div>
        `;
        container.innerHTML += html;
        if(cfg.start) setTimeout(ToolsApp.renderEscalaCalendar, 100);
    };

    window.ToolsApp.saveEscalaConfig = function() {
        const type = document.getElementById('escala-type').value;
        const startStr = document.getElementById('escala-start').value;
        const folgaoDay = document.getElementById('escala-folgao').value;

        if(!startStr) { alert('Selecione o primeiro dia trabalhado.'); return; }

        localStorage.setItem('tool_escala_v3', JSON.stringify({ type, start: startStr, folgaoDay }));
        ToolsApp.renderEscalaCalendar();
    };

    window.ToolsApp.changeEscalaMonth = function(delta) {
        if(!window.currentEscalaView) window.currentEscalaView = new Date();
        window.currentEscalaView.setMonth(window.currentEscalaView.getMonth() + delta);
        ToolsApp.renderEscalaCalendar();
    };

    window.ToolsApp.renderEscalaCalendar = function() {
        const cfg = JSON.parse(localStorage.getItem('tool_escala_v3'));
        if(!cfg || !cfg.start) return;

        const resultDiv = document.getElementById('escala-result');
        const monthLabel = document.getElementById('escala-month-label');
        
        const viewDate = window.currentEscalaView || new Date();
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        monthLabel.textContent = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        resultDiv.innerHTML = '';

        // Cabeçalho
        const weeks = ['D','S','T','Q','Q','S','S'];
        weeks.forEach(d => resultDiv.innerHTML += `<div class="font-bold p-1 text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-1">${d}</div>`);

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Espaços vazios antes do dia 1
        for(let i=0; i<firstDayOfMonth; i++) resultDiv.innerHTML += `<div></div>`;

        // Dados da configuração
        const startDate = new Date(cfg.start + 'T12:00:00'); // Fix timezone issue
        const folgaoTargetDay = cfg.folgaoDay === 'none' ? -1 : parseInt(cfg.folgaoDay);
        const cycleStep = cfg.type === '12x36' ? 2 : 3;

        // Renderiza dias
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayDate = new Date(year, month, day, 12, 0, 0);
            let cellClass = 'bg-gray-100 dark:bg-gray-800 text-gray-400';
            let content = day;
            let title = '';

            // Cálculo do Plantão
            const diffTime = currentDayDate - startDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays % cycleStep === 0) {
                // Teoricamente é dia de trabalho
                // Verificar Folgão (A cada 15 dias aproximado / Alternado)
                // Lógica Simplificada Robusta: Se cair no dia da semana do folgão, verificar se é o ciclo de folga.
                // Na 12x36, se trabalha D-S-T-Q... você trabalha no dia da semana específico a cada 14 dias.
                // Ex: Trab Sábado dia 1. Trab Sábado dia 15.
                // O usuário quer "Folgão a cada 15 dias". Isso significa pular UM SIM e UM NÃO?
                // Ou pular sempre que cair no dia?
                // Normalmente, "Folgão" significa que você tem uma folga extra no dia que cairia seu plantão no fds.
                // Se a escala cai no Sábado a cada 14 dias, e você folga a cada 15 (ou seja, 2 semanas), 
                // significa que você SEMPRE folga nesse dia da semana específico quando cair?
                // Vamos assumir a regra mais benéfica: Se cair no dia do Folgão, é Folga.
                
                if (folgaoTargetDay !== -1 && currentDayDate.getDay() === folgaoTargetDay) {
                     // Aqui entra a lógica da "alternância" se necessário.
                     // Mas pela descrição "Folgão é a cada 15 dias", e a escala 12x36 cai no mesmo dia da semana a cada 14 dias,
                     // implica que praticamente todo plantão de Sábado vira folga, ou é alternado.
                     // Vou implementar: Se cair no dia, vira OFF.
                     cellClass = 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold border border-green-500';
                     title = 'Folgão';
                } else {
                    cellClass = 'bg-red-600 text-white font-bold shadow-md rounded-lg transform scale-90';
                    title = 'Plantão';
                }
            }

            // Destaque para o dia de hoje
            const today = new Date();
            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                cellClass += ' ring-2 ring-blue-500 ring-offset-1';
            }

            resultDiv.innerHTML += `<div class="p-1 flex items-center justify-center h-10 cursor-default ${cellClass}" title="${title}">${content}</div>`;
        }
    };


    // =================================================================
    // 3. HIDRATAÇÃO (DESIGN JARRA + BONS HÁBITOS)
    // =================================================================
    window.ToolsApp.renderWater = function(container) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v4')) || { date: today, count: 0, goal: 3000 };
        if(data.date !== today) { data.date = today; data.count = 0; }

        const percent = Math.min((data.count / data.goal) * 100, 100);

        let html = `
            <div class="tool-card text-center">
                <h3 class="tool-title"><i class="fas fa-tint text-blue-500"></i> Hidratação</h3>
                
                <div class="flex justify-center items-center gap-2 text-xs mb-4 text-gray-500">
                    Meta Diária: <input type="number" value="${data.goal}" onchange="ToolsApp.setWaterGoal(this.value)" class="w-16 border rounded text-center dark:bg-gray-700 p-1 font-bold"> ml
                </div>

                <!-- NOVA JARRA CSS -->
                <div class="relative mx-auto mb-6" style="width: 100px; height: 140px;">
                    <div class="water-jar">
                        <div id="water-level" class="water-level" style="height: ${percent}%"></div>
                        <div class="glass-reflection"></div>
                    </div>
                    <!-- Alça da Jarra -->
                    <div class="water-handle"></div>
                    
                    <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                         <span class="text-xl font-extrabold text-blue-900 dark:text-white drop-shadow-md bg-white/50 dark:bg-black/50 px-2 rounded backdrop-blur-sm" id="water-display">${data.count}</span>
                         <span class="text-xs ml-1 font-bold text-gray-600 dark:text-gray-300 mt-2">ml</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-3 px-2 mb-3">
                    <button onclick="ToolsApp.addWater(250)" class="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 py-2 rounded-lg font-bold hover:bg-blue-200 transition-colors text-xs shadow-sm"><i class="fas fa-glass-whiskey"></i> +250</button>
                    <button onclick="ToolsApp.addWater(500)" class="bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors text-xs shadow-md pulse-button"><i class="fas fa-bottle-water"></i> +500</button>
                    <button onclick="ToolsApp.addWater(-250)" class="bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors text-xs">-250</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    };

    window.ToolsApp.addWater = function(val) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v4')) || { date: today, count: 0, goal: 3000 };
        data.count += parseInt(val);
        if(data.count < 0) data.count = 0;
        localStorage.setItem('tool_water_v4', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };

    window.ToolsApp.setWaterGoal = function(val) {
        let data = JSON.parse(localStorage.getItem('tool_water_v4'));
        data.goal = parseInt(val);
        localStorage.setItem('tool_water_v4', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };

    window.ToolsApp.updateWaterUI = function(data) {
        document.getElementById('water-display').innerText = data.count;
        const percent = Math.min((data.count / data.goal) * 100, 100);
        document.getElementById('water-level').style.height = percent + '%';
    };

    // 4. IMC (Mantido igual, apenas renderização)
    window.ToolsApp.renderHealth = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-heartbeat text-red-500"></i> Calculadora IMC</h3>
                <div class="flex gap-2 mb-3">
                    <div class="flex-1">
                        <label class="text-[10px] uppercase font-bold text-gray-500">Peso (KG)</label>
                        <input type="number" id="imc-weight" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white text-center font-bold" placeholder="80">
                    </div>
                    <div class="flex-1">
                        <label class="text-[10px] uppercase font-bold text-gray-500">Altura (CM)</label>
                        <input type="number" id="imc-height" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white text-center font-bold" placeholder="175">
                    </div>
                </div>
                <button onclick="ToolsApp.calcIMC()" class="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-2 rounded font-bold shadow hover:opacity-90 transition-transform active:scale-95">CALCULAR</button>
                <div id="imc-result" class="mt-3 text-center h-8 font-bold text-sm text-gray-600 dark:text-gray-300"></div>
            </div>
        `;
        container.innerHTML += html;
    };

    window.ToolsApp.calcIMC = function() {
        const w = parseFloat(document.getElementById('imc-weight').value);
        const h_cm = parseFloat(document.getElementById('imc-height').value);
        if(!w || !h_cm) { document.getElementById('imc-result').innerHTML = '<span class="text-red-500">Preencha os campos!</span>'; return; }
        const h_m = h_cm / 100;
        const imc = (w / (h_m * h_m)).toFixed(1);
        let msg = '', color = '';
        if(imc < 18.5) { msg = 'Abaixo do peso'; color = 'text-blue-500'; }
        else if(imc < 24.9) { msg = 'Peso ideal'; color = 'text-green-500'; }
        else if(imc < 29.9) { msg = 'Sobrepeso'; color = 'text-yellow-600'; }
        else { msg = 'Obesidade'; color = 'text-red-600'; }
        document.getElementById('imc-result').innerHTML = `<span class="${color}">IMC ${imc}: ${msg}</span>`;
    };

    // 5. Notas Rápidas (Mantido)
    window.ToolsApp.renderNotes = function(c) {
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes'))||[];
        c.innerHTML += `<div class="tool-card"><h3 class="tool-title"><i class="fas fa-sticky-note text-yellow-500"></i> Notas Rápidas</h3><div class="flex gap-2 mb-2"><input id="n-in" class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white text-sm" placeholder="Lembrete..."><button onclick="ToolsApp.addN()" class="bg-yellow-500 hover:bg-yellow-600 px-3 rounded text-white shadow"><i class="fas fa-plus"></i></button></div><ul id="n-list" class="space-y-1 max-h-32 overflow-y-auto custom-scrollbar"></ul></div>`;
        setTimeout(ToolsApp.updN,100);
    };
    window.ToolsApp.addN=function(){const v=document.getElementById('n-in').value;if(v){const n=JSON.parse(localStorage.getItem('tool_quicknotes'))||[];n.unshift(v);localStorage.setItem('tool_quicknotes',JSON.stringify(n));document.getElementById('n-in').value='';ToolsApp.updN();}};
    window.ToolsApp.updN=function(){const n=JSON.parse(localStorage.getItem('tool_quicknotes'))||[];const l=document.getElementById('n-list');if(l)l.innerHTML=n.map((x,i)=>`<li class="bg-yellow-50 dark:bg-gray-700 border-l-4 border-yellow-400 p-2 text-xs flex justify-between items-center rounded shadow-sm"><span class="dark:text-gray-200">${x}</span><button onclick="ToolsApp.delN(${i})" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></li>`).join('');};
    window.ToolsApp.delN=function(i){const n=JSON.parse(localStorage.getItem('tool_quicknotes'));n.splice(i,1);localStorage.setItem('tool_quicknotes',JSON.stringify(n));ToolsApp.updN();};

    // 6. Planejador (Mantido)
    window.ToolsApp.renderPlanner = function(c) {
       const t=localStorage.getItem('tool_planner')||'';
       c.innerHTML+=`<div class="tool-card"><h3 class="tool-title"><i class="fas fa-book text-indigo-500"></i> Planejador</h3><textarea id="pl-t" class="w-full h-24 p-2 border rounded dark:bg-gray-700 dark:text-white text-xs resize-none" placeholder="Escreva suas metas...">${t}</textarea><button onclick="localStorage.setItem('tool_planner',document.getElementById('pl-t').value);alert('Salvo!')" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-1 rounded text-xs mt-2 font-bold shadow">Salvar</button></div>`;
    };

})();
