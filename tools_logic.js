/* === LÓGICA DAS FERRAMENTAS (TOOLS) - VERSÃO 2.0 === */

(function(){
    window.ToolsApp = window.ToolsApp || {};

    // --- 1. MARCADOR DE PONTO (4 BATIDAS) ---
    window.ToolsApp.renderPonto = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-clock"></i> Marcador de Ponto</h3>
                <div class="grid grid-cols-2 gap-2 mb-4">
                    <button onclick="ToolsApp.addPonto('Entrada')" class="bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-500"><i class="fas fa-sign-in-alt"></i> Entrada</button>
                    <button onclick="ToolsApp.addPonto('Almoço (Saída)')" class="bg-yellow-600 text-white py-2 rounded font-bold text-xs hover:bg-yellow-500"><i class="fas fa-utensils"></i> Sai Almoço</button>
                    <button onclick="ToolsApp.addPonto('Almoço (Volta)')" class="bg-yellow-500 text-white py-2 rounded font-bold text-xs hover:bg-yellow-400"><i class="fas fa-undo"></i> Volta Almoço</button>
                    <button onclick="ToolsApp.addPonto('Saída')" class="bg-red-600 text-white py-2 rounded font-bold text-xs hover:bg-red-500"><i class="fas fa-sign-out-alt"></i> Saída</button>
                </div>
                <div class="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
                    <table class="w-full text-xs text-left">
                        <thead><tr><th class="p-2">Data/Hora</th><th class="p-2">Tipo</th><th class="p-2">Ação</th></tr></thead>
                        <tbody id="ponto-list"></tbody>
                    </table>
                </div>
                <div class="mt-2 text-right">
                    <button onclick="ToolsApp.clearPonto()" class="text-xs text-red-500 underline hover:text-red-400">Limpar Histórico Completo</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        setTimeout(ToolsApp.updatePontoList, 100);
    };

    window.ToolsApp.addPonto = function(type) {
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        points.unshift({ id: Date.now(), type: type, date: dateStr });
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        ToolsApp.updatePontoList();
    };

    window.ToolsApp.updatePontoList = function() {
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        const tbody = document.getElementById('ponto-list');
        if(!tbody) return;
        
        if(points.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">Nenhum registro.</td></tr>';
            return;
        }

        tbody.innerHTML = points.map(p => {
            let colorClass = 'text-gray-700 dark:text-gray-300';
            if(p.type.includes('Entrada')) colorClass = 'text-green-600';
            if(p.type.includes('Saída') && !p.type.includes('Almoço')) colorClass = 'text-red-600';
            if(p.type.includes('Almoço')) colorClass = 'text-yellow-600';

            return `
            <tr class="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                <td class="p-2">${p.date}</td>
                <td class="p-2 font-bold ${colorClass}">${p.type}</td>
                <td class="p-2"><button onclick="ToolsApp.removePonto(${p.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button></td>
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
        if(confirm('Tem certeza que deseja apagar TODO o histórico de pontos?')) { 
            localStorage.removeItem('tool_ponto'); 
            ToolsApp.updatePontoList(); 
        }
    };

    // --- 2. ESCALA DE SERVIÇO (COM FOLGÃO) ---
    window.ToolsApp.renderEscala = function(container) {
        const escalaConfig = JSON.parse(localStorage.getItem('tool_escala_config')) || { type: '12x36', start: '', folgao: false };
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-calendar-alt"></i> Escala de Serviço</h3>
                <div class="flex flex-col gap-2 mb-4">
                    <div class="flex gap-2">
                        <div class="flex-1">
                            <label class="text-xs font-bold text-gray-500">Tipo</label>
                            <select id="escala-type" class="w-full p-2 rounded border bg-white dark:bg-gray-700 text-sm">
                                <option value="12x36" ${escalaConfig.type === '12x36' ? 'selected' : ''}>12x36</option>
                                <option value="24x48" ${escalaConfig.type === '24x48' ? 'selected' : ''}>24x48</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="text-xs font-bold text-gray-500">1º Plantão</label>
                            <input type="date" id="escala-start" value="${escalaConfig.start}" class="w-full p-2 rounded border bg-white dark:bg-gray-700 text-sm">
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="escala-folgao" class="mr-2" ${escalaConfig.folgao ? 'checked' : ''}>
                            <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Aplicar Folgão (Domingo Off)?</span>
                        </label>
                        <button onclick="ToolsApp.calcEscala()" class="bg-blue-600 text-white py-1 px-3 rounded font-bold text-xs hover:bg-blue-500">Gerar</button>
                    </div>
                </div>
                <div id="escala-result" class="grid grid-cols-7 gap-1 text-center text-xs mb-2"></div>
                <div class="text-right">
                     <button onclick="ToolsApp.clearEscala()" class="text-xs text-red-500 underline hover:text-red-400">Limpar Escala</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        if(escalaConfig.start) setTimeout(ToolsApp.calcEscala, 100);
    };

    window.ToolsApp.calcEscala = function() {
        const type = document.getElementById('escala-type').value;
        const startStr = document.getElementById('escala-start').value;
        const useFolgao = document.getElementById('escala-folgao').checked;

        if(!startStr) {
            document.getElementById('escala-result').innerHTML = '<p class="col-span-7 text-gray-400 py-4">Selecione a data do seu primeiro plantão.</p>';
            return;
        }

        localStorage.setItem('tool_escala_config', JSON.stringify({ type, start: startStr, folgao: useFolgao }));

        const startDate = new Date(startStr);
        startDate.setHours(12,0,0,0); 
        
        const resultDiv = document.getElementById('escala-result');
        resultDiv.innerHTML = '';

        const daysToShow = 35; // 5 semanas
        const weeks = ['D','S','T','Q','Q','S','S'];
        weeks.forEach(d => resultDiv.innerHTML += `<div class="font-bold p-1 text-gray-400">${d}</div>`);

        const today = new Date();
        today.setHours(12,0,0,0);
        
        // Ajuste para começar o calendário visualmente no dia certo da semana
        const currentDayOfWeek = today.getDay(); 
        for(let i=0; i<currentDayOfWeek; i++) {
            resultDiv.innerHTML += `<div></div>`;
        }

        for (let i = 0; i < daysToShow; i++) {
            const current = new Date(today);
            current.setDate(today.getDate() + i);
            
            let isWork = false;
            const diffTime = current - startDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                if (type === '24x48') {
                    // 1 trabalha, 2 folga (ciclo de 3 dias)
                    isWork = (diffDays % 3) === 0;
                } else {
                    // 12x36 PADRÃO (1 trabalha, 1 folga - ciclo de 2 dias)
                    if (!useFolgao) {
                        isWork = (diffDays % 2) === 0;
                    } else {
                        // Lógica do Folgão Dominical (Ciclo Semanal Fixo)
                        // Assumindo padrão: Seg(T), Ter(F), Qua(T), Qui(F), Sex(T), Sab(F), Dom(Folgão)
                        // Isso reseta a contagem a cada semana para garantir o domingo livre?
                        // Não, a lógica do usuário é: "Trabalha Seg, Qua, Sex. Domingo é folga para não bater 48h".
                        // Isso significa que ele trabalha Dias da Semana Alternados, mas pula o Domingo.
                        
                        const dayOfWeek = current.getDay(); // 0 = Domingo, 1 = Seg...
                        
                        // Se for domingo, é SEMPRE folga no modo Folgão
                        if (dayOfWeek === 0) {
                            isWork = false;
                        } else {
                            // Nos outros dias, segue a lógica 12x36 baseada no dia de início
                            // MAS, precisamos garantir que a "sequência" não quebre.
                            // Se ele trabalha Seg, Qua, Sex -> Sáb é folga normal. Dom é folga extra. Seg volta a trabalhar.
                            
                            // Simplificação: Dias ímpares a partir do início são trabalho?
                            // Vamos checar se o dia da semana bate com a escala desejada (Seg/Qua/Sex ou Ter/Qui/Sab)
                            
                            const startDayOfWeek = startDate.getDay(); // Dia que começou (ex: 1-Segunda)
                            
                            // Se começou dia par (ex: Segunda=1), trabalha em dias ímpares? Não.
                            // Vamos comparar a paridade do dia da semana.
                            // Se startDay=1 (Seg), trabalha em dias onde (currentDay - startDay) % 2 == 0
                            
                            // Ex: Start Seg(1). Current Seg(1) -> 0%2=0 (Trab). Current Ter(2) -> 1%2!=0 (Folga). Current Qua(3) -> 2%2=0 (Trab).
                            
                            const deltaDays = Math.abs(dayOfWeek - startDayOfWeek);
                            if (deltaDays % 2 === 0) {
                                isWork = true;
                            }
                        }
                    }
                }
            }

            const dayClass = isWork ? 'bg-red-600 text-white font-bold shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-400';
            const borderClass = i === 0 ? 'border-2 border-blue-500' : ''; // Hoje
            const folgaoClass = (useFolgao && current.getDay() === 0) ? 'bg-green-100 dark:bg-green-900 text-green-600' : '';

            resultDiv.innerHTML += `
                <div class="p-1 rounded flex flex-col items-center justify-center h-10 ${dayClass} ${borderClass} ${!isWork ? folgaoClass : ''}">
                    <span>${current.getDate()}</span>
                </div>
            `;
        }
    };

    window.ToolsApp.clearEscala = function() {
        localStorage.removeItem('tool_escala_config');
        document.getElementById('escala-type').value = '12x36';
        document.getElementById('escala-start').value = '';
        document.getElementById('escala-folgao').checked = false;
        document.getElementById('escala-result').innerHTML = '';
    };

    // --- 3. PLANEJADOR ---
    window.ToolsApp.renderPlanner = function(container) {
        const notes = localStorage.getItem('tool_planner') || '';
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-book-open"></i> Planejador de Estudos</h3>
                <p class="text-sm text-gray-500 mb-2">Defina suas metas e horários.</p>
                <textarea id="planner-text" class="w-full h-32 p-2 border rounded bg-white dark:bg-gray-700 text-sm" placeholder="Ex: Segunda: Estudar APH (2h)">${notes}</textarea>
                <button onclick="ToolsApp.savePlanner()" class="mt-2 bg-green-600 text-white px-4 py-1 rounded text-sm font-bold hover:bg-green-500 w-full">Salvar Planejamento</button>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.savePlanner = function() {
        const text = document.getElementById('planner-text').value;
        localStorage.setItem('tool_planner', text);
        // Feedback visual rápido
        const btn = document.querySelector('button[onclick="ToolsApp.savePlanner()"]');
        const originalText = btn.innerText;
        btn.innerText = "Salvo!";
        btn.classList.add('bg-green-800');
        setTimeout(() => { btn.innerText = originalText; btn.classList.remove('bg-green-800'); }, 1500);
    };

    // --- 4. HIDRATAÇÃO (PERSONALIZÁVEL) ---
    window.ToolsApp.renderWater = function(container) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v2')) || { date: today, count: 0, goal: 3000 };
        
        if(data.date !== today) { data.date = today; data.count = 0; } // Reseta o contador, mantém a meta

        const percent = Math.min((data.count / data.goal) * 100, 100);

        let html = `
            <div class="tool-card text-center">
                <h3 class="tool-title"><i class="fas fa-tint text-blue-500"></i> Hidratação</h3>
                
                <div class="flex justify-between items-center mb-2 text-xs text-gray-500">
                    <span>Meta Diária:</span>
                    <input type="number" id="water-goal-input" value="${data.goal}" class="w-16 border rounded text-center dark:bg-gray-700" onchange="ToolsApp.updateWaterGoal(this.value)">
                    <span>ml</span>
                </div>

                <div class="water-glass mb-2 bg-blue-100 rounded-b-lg border-2 border-blue-500 relative h-24 w-16 mx-auto overflow-hidden">
                    <div id="water-fill" class="absolute bottom-0 left-0 w-full bg-blue-500 transition-all duration-500" style="height: ${percent}%"></div>
                </div>
                
                <p class="font-bold text-xl mb-3"><span id="water-count">${data.count}</span> / <span id="water-goal-display">${data.goal}</span> ml</p>
                
                <div class="flex flex-col gap-2">
                    <div class="flex justify-center gap-2">
                        <button onclick="ToolsApp.addWater(250)" class="bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">+250ml</button>
                        <button onclick="ToolsApp.addWater(500)" class="bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700">+500ml</button>
                    </div>
                    <div class="flex justify-center gap-2">
                        <input type="number" id="water-custom" placeholder="Qtd ML" class="w-20 p-1 text-sm border rounded dark:bg-gray-700">
                        <button onclick="ToolsApp.addWaterCustom()" class="bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-500">Add</button>
                        <button onclick="ToolsApp.resetWater()" class="text-gray-400 hover:text-red-500 px-2"><i class="fas fa-undo"></i></button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    };

    window.ToolsApp.addWater = function(amount) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v2')) || { date: today, count: 0, goal: 3000 };
        
        data.count += parseInt(amount);
        if(data.count < 0) data.count = 0;
        
        localStorage.setItem('tool_water_v2', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };

    window.ToolsApp.addWaterCustom = function() {
        const val = document.getElementById('water-custom').value;
        if(val) {
            ToolsApp.addWater(val);
            document.getElementById('water-custom').value = '';
        }
    };

    window.ToolsApp.updateWaterGoal = function(newGoal) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v2')) || { date: today, count: 0, goal: 3000 };
        data.goal = parseInt(newGoal);
        localStorage.setItem('tool_water_v2', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };

    window.ToolsApp.resetWater = function() {
        if(confirm('Zerar contador de hoje?')) {
            const today = new Date().toLocaleDateString();
            let data = JSON.parse(localStorage.getItem('tool_water_v2'));
            data.count = 0;
            localStorage.setItem('tool_water_v2', JSON.stringify(data));
            ToolsApp.updateWaterUI(data);
        }
    };

    window.ToolsApp.updateWaterUI = function(data) {
        document.getElementById('water-count').innerText = data.count;
        document.getElementById('water-goal-display').innerText = data.goal;
        const percent = Math.min((data.count / data.goal) * 100, 100);
        document.getElementById('water-fill').style.height = percent + '%';
    };

    // --- 5. ANOTAÇÕES (MANTIDO IGUAL, JÁ ESTAVA OK) ---
    window.ToolsApp.renderNotes = function(container) {
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-sticky-note"></i> Notas Rápidas</h3>
                <div class="flex gap-2 mb-2">
                    <input type="text" id="note-input" class="flex-1 p-2 rounded border bg-white dark:bg-gray-700 text-sm" placeholder="Nova anotação...">
                    <button onclick="ToolsApp.addNote()" class="bg-yellow-500 text-white px-3 rounded hover:bg-yellow-600"><i class="fas fa-plus"></i></button>
                </div>
                <ul id="notes-list" class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar"></ul>
            </div>
        `;
        container.innerHTML += html;
        setTimeout(ToolsApp.updateNotesList, 100);
    };
    window.ToolsApp.addNote = function() {
        const input = document.getElementById('note-input');
        if(!input.value) return;
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        notes.unshift({ txt: input.value, date: new Date().toLocaleDateString() });
        localStorage.setItem('tool_quicknotes', JSON.stringify(notes));
        input.value = '';
        ToolsApp.updateNotesList();
    };
    window.ToolsApp.updateNotesList = function() {
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        const ul = document.getElementById('notes-list');
        if(!ul) return;
        if(notes.length === 0) { ul.innerHTML = '<li class="text-center text-gray-400 text-xs p-2">Nenhuma nota.</li>'; return; }
        
        ul.innerHTML = notes.map((n, i) => `
            <li class="bg-yellow-50 dark:bg-gray-600 p-2 rounded flex justify-between items-center text-sm border border-yellow-200 dark:border-gray-500">
                <span class="dark:text-white">${n.txt} <small class="text-gray-400 block text-[10px]">${n.date}</small></span>
                <button onclick="ToolsApp.delNote(${i})" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>
            </li>
        `).join('');
    };
    window.ToolsApp.delNote = function(index) {
        let notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        notes.splice(index, 1);
        localStorage.setItem('tool_quicknotes', JSON.stringify(notes));
        ToolsApp.updateNotesList();
    };

    // --- 6. PAINEL SAÚDE (IMC EM CM) ---
    window.ToolsApp.renderHealth = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-heartbeat text-red-500"></i> Saúde (IMC)</h3>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label class="text-xs text-gray-500">Peso (kg)</label>
                        <input type="number" id="health-weight" placeholder="Ex: 80" class="w-full p-2 border rounded dark:bg-gray-700">
                    </div>
                    <div>
                        <label class="text-xs text-gray-500">Altura (cm)</label>
                        <input type="number" id="health-height" placeholder="Ex: 175" class="w-full p-2 border rounded dark:bg-gray-700">
                    </div>
                </div>
                <button onclick="ToolsApp.calcIMC()" class="w-full bg-red-500 text-white py-2 rounded font-bold mb-2 hover:bg-red-600">Calcular IMC</button>
                <div id="health-result" class="text-center font-bold text-lg h-8"></div>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.calcIMC = function() {
        const w = parseFloat(document.getElementById('health-weight').value);
        const h_cm = parseFloat(document.getElementById('health-height').value);
        
        if(!w || !h_cm) return;
        
        const h_m = h_cm / 100; // Converte cm para metros
        const imc = (w / (h_m * h_m)).toFixed(1);
        
        let status = '';
        let color = '';
        
        if(imc < 18.5) { status = 'Abaixo do peso'; color = 'text-yellow-500'; }
        else if(imc < 24.9) { status = 'Peso normal'; color = 'text-green-600'; }
        else if(imc < 29.9) { status = 'Sobrepeso'; color = 'text-orange-500'; }
        else { status = 'Obesidade'; color = 'text-red-600'; }
        
        document.getElementById('health-result').innerHTML = `<span class="${color}">IMC: ${imc} (${status})</span>`;
    };

})();
