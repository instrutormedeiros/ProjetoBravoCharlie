/* === LÓGICA DAS FERRAMENTAS (TOOLS) - VERSÃO FINAL CORRIGIDA === */

(function(){
    window.ToolsApp = window.ToolsApp || {};

    // --- 1. MARCADOR DE PONTO (COM ESCOLHA DE HORA) ---
    window.ToolsApp.renderPonto = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-clock"></i> Ponto Eletrônico</h3>
                
                <div class="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <label class="text-xs font-bold text-gray-500 block mb-1">Escolher Data/Hora (Opcional)</label>
                    <input type="datetime-local" id="ponto-custom-time" class="w-full p-2 rounded border text-sm dark:bg-gray-700 mb-2">
                    <p class="text-[10px] text-gray-400">* Se deixar vazio, usa a hora atual.</p>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-4">
                    <button onclick="ToolsApp.addPonto('Entrada')" class="bg-green-600 text-white py-3 rounded font-bold text-xs hover:bg-green-500 shadow border-b-4 border-green-800 active:border-0 active:translate-y-1"><i class="fas fa-sign-in-alt"></i> ENTRADA</button>
                    <button onclick="ToolsApp.addPonto('Saída Almoço')" class="bg-yellow-600 text-white py-3 rounded font-bold text-xs hover:bg-yellow-500 shadow border-b-4 border-yellow-800 active:border-0 active:translate-y-1"><i class="fas fa-utensils"></i> SAI ALMOÇO</button>
                    <button onclick="ToolsApp.addPonto('Volta Almoço')" class="bg-yellow-500 text-white py-3 rounded font-bold text-xs hover:bg-yellow-400 shadow border-b-4 border-yellow-700 active:border-0 active:translate-y-1"><i class="fas fa-undo"></i> VOLTA ALMOÇO</button>
                    <button onclick="ToolsApp.addPonto('Saída')" class="bg-red-600 text-white py-3 rounded font-bold text-xs hover:bg-red-500 shadow border-b-4 border-red-800 active:border-0 active:translate-y-1"><i class="fas fa-sign-out-alt"></i> SAÍDA</button>
                </div>
                
                <div class="max-h-56 overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-0">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-gray-100 dark:bg-gray-800 sticky top-0"><tr><th class="p-2">Data/Hora</th><th class="p-2">Tipo</th><th class="p-2 text-right">Apagar</th></tr></thead>
                        <tbody id="ponto-list" class="divide-y divide-gray-100 dark:divide-gray-800"></tbody>
                    </table>
                </div>
                <div class="mt-3 text-right">
                    <button onclick="ToolsApp.clearPonto()" class="text-xs text-red-500 hover:text-red-700 font-bold"><i class="fas fa-trash-alt mr-1"></i> Zerar Histórico</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        setTimeout(ToolsApp.updatePontoList, 100);
    };

    window.ToolsApp.addPonto = function(type) {
        const customInput = document.getElementById('ponto-custom-time').value;
        let dateObj = new Date();
        
        if (customInput) {
            dateObj = new Date(customInput);
        }

        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points.unshift({ id: Date.now(), type: type, date: dateStr });
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        
        // Limpa o input após usar
        document.getElementById('ponto-custom-time').value = '';
        ToolsApp.updatePontoList();
    };

    window.ToolsApp.updatePontoList = function() {
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        const tbody = document.getElementById('ponto-list');
        if(!tbody) return;
        
        if(points.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400 italic">Nenhum registro.</td></tr>';
            return;
        }

        tbody.innerHTML = points.map(p => {
            let colorClass = 'text-gray-700';
            if(p.type === 'Entrada') colorClass = 'text-green-600 font-bold';
            if(p.type === 'Saída') colorClass = 'text-red-600 font-bold';
            if(p.type.includes('Almoço')) colorClass = 'text-yellow-600 font-bold';

            return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td class="p-2 text-gray-600 dark:text-gray-300">${p.date}</td>
                <td class="p-2 ${colorClass}">${p.type}</td>
                <td class="p-2 text-right"><button onclick="ToolsApp.removePonto(${p.id})" class="text-gray-300 hover:text-red-500"><i class="fas fa-times"></i></button></td>
            </tr>
            `;
        }).join('');
    };

    window.ToolsApp.removePonto = function(id) {
        let points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points = points.filter(p => p.id !== id);
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        ToolsApp.updatePontoList();
    };
    window.ToolsApp.clearPonto = function() {
        if(confirm('Apagar todo o histórico?')) { localStorage.removeItem('tool_ponto'); ToolsApp.updatePontoList(); }
    };

    // --- 2. ESCALA DE SERVIÇO (LÓGICA DO FOLGÃO CORRIGIDA) ---
    window.ToolsApp.renderEscala = function(container) {
        const cfg = JSON.parse(localStorage.getItem('tool_escala_v2')) || { type: '12x36', start: '', folgaoDay: 'none' };
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-calendar-alt"></i> Escala de Serviço</h3>
                <div class="flex flex-col gap-3 mb-4">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] uppercase font-bold text-gray-500">Tipo</label>
                            <select id="escala-type" class="w-full p-2 rounded border bg-white dark:bg-gray-700 text-sm">
                                <option value="12x36" ${cfg.type === '12x36' ? 'selected' : ''}>12x36</option>
                                <option value="24x48" ${cfg.type === '24x48' ? 'selected' : ''}>24x48</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] uppercase font-bold text-gray-500">1º Plantão</label>
                            <input type="date" id="escala-start" value="${cfg.start}" class="w-full p-2 rounded border bg-white dark:bg-gray-700 text-sm">
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] uppercase font-bold text-gray-500">Dia do Folgão (Zerar Hora)</label>
                        <select id="escala-folgao" class="w-full p-2 rounded border bg-white dark:bg-gray-700 text-sm">
                            <option value="none" ${cfg.folgaoDay === 'none' ? 'selected' : ''}>Sem Folgão (Padrão)</option>
                            <option value="0" ${cfg.folgaoDay === '0' ? 'selected' : ''}>Domingo (Lei das 36h)</option>
                            <option value="6" ${cfg.folgaoDay === '6' ? 'selected' : ''}>Sábado</option>
                        </select>
                        <p class="text-[10px] text-gray-400 mt-1">* Pula o plantão se cair neste dia.</p>
                    </div>
                    <button onclick="ToolsApp.calcEscala()" class="bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-500 shadow mt-1">GERAR ESCALA</button>
                </div>
                
                <div class="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    <div id="escala-result" class="grid grid-cols-7 gap-1 text-center text-xs"></div>
                </div>
                <div class="text-right mt-2">
                     <button onclick="ToolsApp.clearEscala()" class="text-xs text-red-500 underline">Limpar</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        if(cfg.start) setTimeout(ToolsApp.calcEscala, 100);
    };

    window.ToolsApp.calcEscala = function() {
        const type = document.getElementById('escala-type').value;
        const startStr = document.getElementById('escala-start').value;
        const folgaoDayStr = document.getElementById('escala-folgao').value;
        const folgaoDay = folgaoDayStr === 'none' ? -1 : parseInt(folgaoDayStr);

        if(!startStr) { document.getElementById('escala-result').innerHTML = '<p class="col-span-7 text-gray-400 py-4">Selecione a data.</p>'; return; }

        localStorage.setItem('tool_escala_v2', JSON.stringify({ type, start: startStr, folgaoDay: folgaoDayStr }));

        const resultDiv = document.getElementById('escala-result');
        resultDiv.innerHTML = '';
        const weeks = ['D','S','T','Q','Q','S','S'];
        weeks.forEach(d => resultDiv.innerHTML += `<div class="font-bold p-1 text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-1">${d}</div>`);

        // Configuração Inicial
        let currentDate = new Date();
        currentDate.setHours(12,0,0,0); // Hoje
        
        // Ajuste visual para começar no dia certo da semana
        for(let i=0; i<currentDate.getDay(); i++) resultDiv.innerHTML += `<div></div>`;

        // Algoritmo de Previsão
        // Precisamos simular dia a dia a partir da data de INÍCIO (startStr) até atingir os próximos 35 dias a partir de HOJE.
        
        let simDate = new Date(startStr);
        simDate.setHours(12,0,0,0);
        
        // Define a data limite (Hoje + 35 dias)
        let limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + 35);
        limitDate.setHours(12,0,0,0);

        // Mapa de dias de trabalho (timestamp -> true)
        const workDaysMap = {};
        const folgaoMap = {};
        
        // Simula 365 dias para frente para garantir cobertura
        let pointerDate = new Date(simDate);
        let safety = 0;
        
        while (pointerDate <= limitDate && safety < 500) {
            safety++;
            const ts = pointerDate.getTime();
            
            // Verifica se hoje é dia de folgão
            const dayOfWeek = pointerDate.getDay();
            if (folgaoDay !== -1 && dayOfWeek === folgaoDay) {
                // É dia de folgão! PULA este plantão.
                // O plantão NÃO acontece hoje.
                folgaoMap[ts] = true;
                // O próximo plantão será no próximo intervalo normal.
                // Na 12x36, se eu trabalharia Domingo (Folgão), eu folgo Dom, e meu próximo dia seria Segunda? Não.
                // Pela lógica 12x36: Trab Dom(X), Folga Seg, Trab Ter.
                // Então se Dom é folgão, eu folgo Dom, folgo Seg (folga normal da escala) e trabalho Terça.
                // Ou seja, o ciclo de "pula 1 dia" continua, apenas o dia de trabalho vira folga.
                
                // Mas na sua explicação: "recebo FOLGA no domingo, retornando apenas na TERÇA"
                // Isso é exatamente o comportamento padrão: Teria plantão Dom, mas folga. Seg é folga. Ter é Plantão.
                
                // Então a lógica é simples: O ciclo continua a cada 2 dias (12x36) ou 3 dias (24x48).
                // Se cair no dia proibido, marca como Folgão.
                
                // Salva no mapa como folgão
            } else {
                workDaysMap[ts] = true;
            }

            // Avança o ponteiro
            const step = (type === '12x36') ? 2 : 3;
            pointerDate.setDate(pointerDate.getDate() + step);
        }

        // Agora renderiza os próximos 35 dias a partir de HOJE
        for (let i = 0; i < 35; i++) {
            const renderDate = new Date(currentDate);
            renderDate.setDate(currentDate.getDate() + i);
            const ts = renderDate.getTime();

            let cellClass = 'bg-gray-100 dark:bg-gray-800 text-gray-400';
            let content = renderDate.getDate();

            if (workDaysMap[ts]) {
                cellClass = 'bg-red-600 text-white font-bold shadow-md';
            } else if (folgaoMap[ts]) {
                cellClass = 'bg-green-100 dark:bg-green-900 text-green-700 font-bold border border-green-500';
                content = 'OFF'; // Marca visual de Folgão
            }

            if (i === 0) cellClass += ' ring-2 ring-blue-500'; // Hoje

            resultDiv.innerHTML += `<div class="p-1 rounded flex items-center justify-center h-10 ${cellClass} text-xs">${content}</div>`;
        }
    };
    window.ToolsApp.clearEscala = function() {
        localStorage.removeItem('tool_escala_v2');
        document.getElementById('escala-start').value = '';
        document.getElementById('escala-result').innerHTML = '';
    };

    // --- 3. HIDRATAÇÃO (CORRIGIDO + e -) ---
    window.ToolsApp.renderWater = function(container) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v4')) || { date: today, count: 0, goal: 3000 };
        if(data.date !== today) { data.date = today; data.count = 0; }

        const percent = Math.min((data.count / data.goal) * 100, 100);

        let html = `
            <div class="tool-card text-center">
                <h3 class="tool-title"><i class="fas fa-tint text-blue-500"></i> Hidratação</h3>
                
                <div class="flex justify-center items-center gap-2 text-xs mb-3 text-gray-500">
                    Meta: <input type="number" value="${data.goal}" onchange="ToolsApp.setWaterGoal(this.value)" class="w-16 border rounded text-center dark:bg-gray-700 p-1"> ml
                </div>

                <div class="water-glass mb-3 bg-blue-50 dark:bg-gray-800 rounded-b-xl border-2 border-blue-400 relative h-28 w-20 mx-auto overflow-hidden shadow-inner">
                    <div id="water-fill" class="absolute bottom-0 left-0 w-full bg-blue-500 transition-all duration-500" style="height: ${percent}%"></div>
                    <div class="absolute inset-0 flex items-center justify-center z-10">
                         <span class="text-lg font-bold text-gray-700 dark:text-white drop-shadow-md" style="mix-blend-mode: difference;" id="water-display">${data.count}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-2 px-4">
                    <button onclick="ToolsApp.addWater(250)" class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold hover:bg-blue-200">+250</button>
                    <button onclick="ToolsApp.addWater(500)" class="bg-blue-600 text-white px-2 py-1 rounded font-bold hover:bg-blue-500 shadow">+500</button>
                    <button onclick="ToolsApp.addWater(-250)" class="bg-red-100 text-red-800 px-2 py-1 rounded font-bold hover:bg-red-200">-250</button>
                </div>
                
                <div class="flex justify-center mt-3 gap-2">
                    <input type="number" id="water-custom" placeholder="Outro" class="w-20 p-1 text-xs border rounded text-center dark:bg-gray-700">
                    <button onclick="ToolsApp.addCustomWater()" class="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300">OK</button>
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
    
    window.ToolsApp.addCustomWater = function() {
        const val = document.getElementById('water-custom').value;
        if(val) { ToolsApp.addWater(val); document.getElementById('water-custom').value = ''; }
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
        document.getElementById('water-fill').style.height = percent + '%';
    };

    // --- 4. IMC (EM CM) ---
    window.ToolsApp.renderHealth = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-heartbeat text-red-500"></i> Calculadora IMC</h3>
                <div class="flex gap-2 mb-3">
                    <div class="flex-1">
                        <label class="text-[10px] uppercase font-bold text-gray-500">Peso (KG)</label>
                        <input type="number" id="imc-weight" class="w-full p-2 border rounded dark:bg-gray-700 text-center font-bold" placeholder="80">
                    </div>
                    <div class="flex-1">
                        <label class="text-[10px] uppercase font-bold text-gray-500">Altura (CM)</label>
                        <input type="number" id="imc-height" class="w-full p-2 border rounded dark:bg-gray-700 text-center font-bold" placeholder="175">
                    </div>
                </div>
                <button onclick="ToolsApp.calcIMC()" class="w-full bg-red-500 text-white py-2 rounded font-bold shadow hover:bg-red-600 transition-transform active:scale-95">CALCULAR</button>
                <div id="imc-result" class="mt-3 text-center h-8 font-bold text-sm text-gray-600 dark:text-gray-300"></div>
            </div>
        `;
        container.innerHTML += html;
    };

    window.ToolsApp.calcIMC = function() {
        const w = parseFloat(document.getElementById('imc-weight').value);
        const h_cm = parseFloat(document.getElementById('imc-height').value);

        if(!w || !h_cm) {
            document.getElementById('imc-result').innerHTML = '<span class="text-red-500">Preencha os campos!</span>';
            return;
        }

        const h_m = h_cm / 100; // Converte CM para Metros
        const imc = (w / (h_m * h_m)).toFixed(1);
        
        let msg = ''; let color = '';
        if(imc < 18.5) { msg = 'Abaixo do peso'; color = 'text-blue-500'; }
        else if(imc < 24.9) { msg = 'Peso ideal'; color = 'text-green-500'; }
        else if(imc < 29.9) { msg = 'Sobrepeso'; color = 'text-yellow-600'; }
        else { msg = 'Obesidade'; color = 'text-red-600'; }

        document.getElementById('imc-result').innerHTML = `<span class="${color}">IMC ${imc}: ${msg}</span>`;
    };
    
    // --- 5. NOTAS e PLANEJADOR (MANTIDOS SIMPLES PARA ECONOMIZAR ESPAÇO) ---
    window.ToolsApp.renderNotes = function(c) { /* Mantido igual versões anteriores, não solicitado alteração */ 
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes'))||[];
        c.innerHTML += `<div class="tool-card"><h3 class="tool-title"><i class="fas fa-sticky-note"></i> Notas</h3><div class="flex gap-2 mb-2"><input id="n-in" class="flex-1 p-2 border rounded dark:bg-gray-700 text-sm"><button onclick="ToolsApp.addN()" class="bg-yellow-500 px-3 rounded text-white">+</button></div><ul id="n-list" class="space-y-1 max-h-32 overflow-y-auto"></ul></div>`;
        setTimeout(ToolsApp.updN,100);
    };
    window.ToolsApp.addN=function(){const v=document.getElementById('n-in').value;if(v){const n=JSON.parse(localStorage.getItem('tool_quicknotes'))||[];n.unshift(v);localStorage.setItem('tool_quicknotes',JSON.stringify(n));document.getElementById('n-in').value='';ToolsApp.updN();}};
    window.ToolsApp.updN=function(){const n=JSON.parse(localStorage.getItem('tool_quicknotes'))||[];const l=document.getElementById('n-list');if(l)l.innerHTML=n.map((x,i)=>`<li class="bg-yellow-50 dark:bg-gray-600 p-1 text-xs flex justify-between"><span>${x}</span><button onclick="ToolsApp.delN(${i})" class="text-red-500">x</button></li>`).join('');};
    window.ToolsApp.delN=function(i){const n=JSON.parse(localStorage.getItem('tool_quicknotes'));n.splice(i,1);localStorage.setItem('tool_quicknotes',JSON.stringify(n));ToolsApp.updN();};

    window.ToolsApp.renderPlanner = function(c) { /* Mantido igual */ 
       const t=localStorage.getItem('tool_planner')||'';
       c.innerHTML+=`<div class="tool-card"><h3 class="tool-title"><i class="fas fa-book"></i> Planejador</h3><textarea id="pl-t" class="w-full h-24 p-2 border rounded dark:bg-gray-700 text-xs">${t}</textarea><button onclick="localStorage.setItem('tool_planner',document.getElementById('pl-t').value);alert('Salvo!')" class="w-full bg-green-600 text-white py-1 rounded text-xs mt-2">Salvar</button></div>`;
    };

})();
