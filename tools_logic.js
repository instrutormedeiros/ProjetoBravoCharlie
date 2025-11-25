/* === LÓGICA DAS FERRAMENTAS (TOOLS) - VERSÃO FINAL AJUSTADA === */

(function(){
    window.ToolsApp = window.ToolsApp || {};

    // --- 1. MARCADOR DE PONTO (4 BATIDAS) ---
    window.ToolsApp.renderPonto = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-clock"></i> Marcador de Ponto</h3>
                <div class="grid grid-cols-2 gap-2 mb-4">
                    <button onclick="ToolsApp.addPonto('Entrada')" class="bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-500"><i class="fas fa-sign-in-alt"></i> Entrada</button>
                    <button onclick="ToolsApp.addPonto('Saída Almoço')" class="bg-yellow-600 text-white py-2 rounded font-bold text-xs hover:bg-yellow-500"><i class="fas fa-utensils"></i> Sai Almoço</button>
                    <button onclick="ToolsApp.addPonto('Volta Almoço')" class="bg-yellow-500 text-white py-2 rounded font-bold text-xs hover:bg-yellow-400"><i class="fas fa-undo"></i> Volta Almoço</button>
                    <button onclick="ToolsApp.addPonto('Saída')" class="bg-red-600 text-white py-2 rounded font-bold text-xs hover:bg-red-500"><i class="fas fa-sign-out-alt"></i> Saída</button>
                </div>
                <div class="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
                    <table class="w-full text-xs text-left">
                        <thead><tr><th class="p-2">Data/Hora</th><th class="p-2">Tipo</th><th class="p-2">Ação</th></tr></thead>
                        <tbody id="ponto-list"></tbody>
                    </table>
                </div>
                <div class="mt-2 text-right">
                    <button onclick="ToolsApp.clearPonto()" class="text-xs text-red-500 underline hover:text-red-400">Limpar Histórico</button>
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
        if(points.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">Nenhum registro.</td></tr>'; return; }

        tbody.innerHTML = points.map(p => {
            let color = 'text-gray-700';
            if(p.type.includes('Entrada')) color = 'text-green-600';
            if(p.type.includes('Saída')) color = 'text-red-600';
            if(p.type.includes('Almoço')) color = 'text-yellow-600';
            return `<tr class="border-b dark:border-gray-700"><td class="p-2">${p.date}</td><td class="p-2 font-bold ${color}">${p.type}</td><td class="p-2"><button onclick="ToolsApp.removePonto(${p.id})" class="text-red-400"><i class="fas fa-times"></i></button></td></tr>`;
        }).join('');
    };

    window.ToolsApp.removePonto = function(id) {
        let points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points = points.filter(p => p.id !== id);
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        ToolsApp.updatePontoList();
    };
    window.ToolsApp.clearPonto = function() {
        if(confirm("Limpar todo o histórico de ponto?")) { localStorage.removeItem('tool_ponto'); ToolsApp.updatePontoList(); }
    };

    // --- 2. ESCALA DE SERVIÇO (COM LÓGICA DE FOLGÃO SEMANAL) ---
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
                        <label class="flex items-center cursor-pointer" title="Trabalha 3 dias na semana (ex: Seg, Qua, Sex) e folga Domingo">
                            <input type="checkbox" id="escala-folgao" class="mr-2" ${escalaConfig.folgao ? 'checked' : ''}>
                            <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Com Folgão (Ciclo 3x1)?</span>
                        </label>
                        <button onclick="ToolsApp.calcEscala()" class="bg-blue-600 text-white py-1 px-3 rounded font-bold text-xs hover:bg-blue-500">Gerar</button>
                    </div>
                </div>
                <div id="escala-result" class="grid grid-cols-7 gap-1 text-center text-xs mb-2"></div>
                <div class="text-right"><button onclick="ToolsApp.clearEscala()" class="text-xs text-red-500 underline">Limpar Escala</button></div>
            </div>
        `;
        container.innerHTML += html;
        if(escalaConfig.start) setTimeout(ToolsApp.calcEscala, 100);
    };

    window.ToolsApp.calcEscala = function() {
        const type = document.getElementById('escala-type').value;
        const startStr = document.getElementById('escala-start').value;
        const useFolgao = document.getElementById('escala-folgao').checked;

        if(!startStr) { document.getElementById('escala-result').innerHTML = '<p class="col-span-7 text-gray-400 py-4">Selecione a data.</p>'; return; }

        localStorage.setItem('tool_escala_config', JSON.stringify({ type, start: startStr, folgao: useFolgao }));

        const startDate = new Date(startStr);
        startDate.setHours(12,0,0,0); 
        const resultDiv = document.getElementById('escala-result');
        resultDiv.innerHTML = '';
        const weeks = ['D','S','T','Q','Q','S','S'];
        weeks.forEach(d => resultDiv.innerHTML += `<div class="font-bold p-1 text-gray-400">${d}</div>`);

        const today = new Date(); today.setHours(12,0,0,0);
        for(let i=0; i<today.getDay(); i++) resultDiv.innerHTML += `<div></div>`; // Espaço vazio inicial

        for (let i = 0; i < 35; i++) {
            const current = new Date(today);
            current.setDate(today.getDate() + i);
            const diffDays = Math.floor((current - startDate) / (1000 * 60 * 60 * 24));
            
            let isWork = false;
            if (diffDays >= 0) {
                if (type === '24x48') {
                    isWork = (diffDays % 3) === 0;
                } else {
                    if (useFolgao) {
                        // LÓGICA FOLGÃO SEMANAL (Ciclo de 7 dias: Trab Dia 0, 2, 4. Folga 1, 3, 5, 6)
                        // Isso simula Seg, Qua, Sex (Trabalho) -> Sáb, Dom (Folga)
                        // Baseado na data de início como dia 0 do ciclo.
                        const cycleDay = diffDays % 7;
                        // Trabalha no dia 0, 2 e 4 do ciclo iniciado na data selecionada
                        if (cycleDay === 0 || cycleDay === 2 || cycleDay === 4) isWork = true;
                    } else {
                        isWork = (diffDays % 2) === 0;
                    }
                }
            }
            const dayClass = isWork ? 'bg-red-600 text-white font-bold' : 'bg-gray-100 dark:bg-gray-800 text-gray-400';
            const borderClass = i === 0 ? 'border-2 border-blue-500' : '';
            resultDiv.innerHTML += `<div class="p-1 rounded flex items-center justify-center h-10 ${dayClass} ${borderClass}"><span>${current.getDate()}</span></div>`;
        }
    };
    window.ToolsApp.clearEscala = function() {
        localStorage.removeItem('tool_escala_config');
        document.getElementById('escala-start').value = '';
        document.getElementById('escala-result').innerHTML = '';
    };

    // --- 3. PLANEJADOR ---
    window.ToolsApp.renderPlanner = function(container) {
        const notes = localStorage.getItem('tool_planner') || '';
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-book-open"></i> Planejador</h3>
                <textarea id="planner-text" class="w-full h-32 p-2 border rounded bg-white dark:bg-gray-700 text-sm mb-2" placeholder="Metas de estudo...">${notes}</textarea>
                <button onclick="ToolsApp.savePlanner()" class="bg-green-600 text-white px-4 py-1 rounded text-sm w-full">Salvar</button>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.savePlanner = function() {
        localStorage.setItem('tool_planner', document.getElementById('planner-text').value);
        alert("Planejamento salvo!");
    };

    // --- 4. HIDRATAÇÃO (PERSONALIZÁVEL) ---
    window.ToolsApp.renderWater = function(container) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v3')) || { date: today, count: 0, goal: 3000 };
        if(data.date !== today) { data.date = today; data.count = 0; }

        const percent = Math.min((data.count / data.goal) * 100, 100);
        let html = `
            <div class="tool-card text-center">
                <h3 class="tool-title"><i class="fas fa-tint text-blue-500"></i> Hidratação</h3>
                <div class="flex justify-center items-center gap-2 text-xs mb-2 text-gray-500">
                    Meta: <input type="number" value="${data.goal}" onchange="ToolsApp.setWaterGoal(this.value)" class="w-16 border rounded text-center dark:bg-gray-700"> ml
                </div>
                <div class="water-glass mb-2 bg-blue-100 rounded-b-lg border-2 border-blue-500 relative h-24 w-16 mx-auto overflow-hidden">
                    <div id="water-fill" class="absolute bottom-0 left-0 w-full bg-blue-500 transition-all duration-500" style="height: ${percent}%"></div>
                </div>
                <p class="font-bold text-xl mb-3"><span id="water-count">${data.count}</span> ml</p>
                <div class="flex justify-center gap-2">
                    <input type="number" id="water-add-input" placeholder="ml" class="w-16 border rounded text-center dark:bg-gray-700 text-sm">
                    <button onclick="ToolsApp.addWaterCustom()" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">+</button>
                    <button onclick="ToolsApp.resetWater()" class="text-gray-400 px-2"><i class="fas fa-undo"></i></button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.setWaterGoal = function(val) {
        let data = JSON.parse(localStorage.getItem('tool_water_v3'));
        data.goal = parseInt(val);
        localStorage.setItem('tool_water_v3', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };
    window.ToolsApp.addWaterCustom = function() {
        const val = parseInt(document.getElementById('water-add-input').value);
        if(!val) return;
        let data = JSON.parse(localStorage.getItem('tool_water_v3'));
        data.count += val;
        localStorage.setItem('tool_water_v3', JSON.stringify(data));
        document.getElementById('water-add-input').value = '';
        ToolsApp.updateWaterUI(data);
    };
    window.ToolsApp.resetWater = function() {
        let data = JSON.parse(localStorage.getItem('tool_water_v3'));
        data.count = 0;
        localStorage.setItem('tool_water_v3', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };
    window.ToolsApp.updateWaterUI = function(data) {
        document.getElementById('water-count').innerText = data.count;
        document.getElementById('water-fill').style.height = Math.min((data.count / data.goal) * 100, 100) + '%';
    };

    // --- 5. ANOTAÇÕES (MANTIDO) ---
    window.ToolsApp.renderNotes = function(container) {
        // ... (Mesma lógica simples de notas do arquivo anterior) ...
        // Para economizar espaço, vou assumir que você manteve ou quer o padrão.
        // Vou reincluir para garantir funcionalidade completa.
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-sticky-note"></i> Notas</h3>
                <div class="flex gap-2 mb-2">
                    <input type="text" id="note-input" class="flex-1 p-2 rounded border bg-white dark:bg-gray-700 text-sm" placeholder="Nova nota...">
                    <button onclick="ToolsApp.addNote()" class="bg-yellow-500 text-white px-3 rounded"><i class="fas fa-plus"></i></button>
                </div>
                <ul id="notes-list" class="space-y-2 max-h-40 overflow-y-auto"></ul>
            </div>`;
        container.innerHTML += html;
        setTimeout(ToolsApp.updateNotesList, 100);
    };
    window.ToolsApp.addNote = function() {
        const input = document.getElementById('note-input'); if(!input.value) return;
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        notes.unshift({ txt: input.value, date: new Date().toLocaleDateString() });
        localStorage.setItem('tool_quicknotes', JSON.stringify(notes)); input.value = ''; ToolsApp.updateNotesList();
    };
    window.ToolsApp.updateNotesList = function() {
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        const ul = document.getElementById('notes-list'); if(ul) ul.innerHTML = notes.map((n, i) => `<li class="bg-yellow-50 dark:bg-gray-600 p-2 rounded flex justify-between text-xs"><span>${n.txt}</span> <button onclick="ToolsApp.delNote(${i})" class="text-red-500"><i class="fas fa-times"></i></button></li>`).join('');
    };
    window.ToolsApp.delNote = function(i) {
        let notes = JSON.parse(localStorage.getItem('tool_quicknotes')); notes.splice(i, 1);
        localStorage.setItem('tool_quicknotes', JSON.stringify(notes)); ToolsApp.updateNotesList();
    };

    // --- 6. PAINEL SAÚDE (IMC EM CM) ---
    window.ToolsApp.renderHealth = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-heartbeat text-red-500"></i> Saúde (IMC)</h3>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <input type="number" id="health-weight" placeholder="Peso (kg)" class="p-2 border rounded dark:bg-gray-700 text-sm">
                    <input type="number" id="health-height" placeholder="Altura (cm)" class="p-2 border rounded dark:bg-gray-700 text-sm">
                </div>
                <button onclick="ToolsApp.calcIMC()" class="w-full bg-red-500 text-white py-2 rounded font-bold text-sm">Calcular</button>
                <div id="health-result" class="text-center font-bold text-sm mt-2 h-6"></div>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.calcIMC = function() {
        const w = parseFloat(document.getElementById('health-weight').value);
        const h_cm = parseFloat(document.getElementById('health-height').value);
        if(!w || !h_cm) return;
        const h_m = h_cm / 100; // Converte CM para Metros
        const imc = (w / (h_m * h_m)).toFixed(1);
        
        let status = ''; let color = '';
        if(imc < 18.5) { status = 'Abaixo peso'; color = 'text-yellow-500'; }
        else if(imc < 24.9) { status = 'Normal'; color = 'text-green-600'; }
        else if(imc < 29.9) { status = 'Sobrepeso'; color = 'text-orange-500'; }
        else { status = 'Obesidade'; color = 'text-red-600'; }
        
        document.getElementById('health-result').innerHTML = `<span class="${color}">IMC: ${imc} (${status})</span>`;
    };

})();
