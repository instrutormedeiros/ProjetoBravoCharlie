/* === LÓGICA DAS FERRAMENTAS (TOOLS) === */

(function(){
    window.ToolsApp = window.ToolsApp || {};

    // --- 1. MARCADOR DE PONTO ---
    window.ToolsApp.renderPonto = function(container) {
        const savedPoints = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-clock"></i> Marcador de Ponto</h3>
                <div class="flex gap-2 mb-4">
                    <button onclick="ToolsApp.addPonto('Entrada')" class="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-500">Entrada</button>
                    <button onclick="ToolsApp.addPonto('Saída')" class="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-500">Saída</button>
                </div>
                <div class="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
                    <table class="w-full text-sm text-left">
                        <thead><tr><th class="p-2">Data/Hora</th><th class="p-2">Tipo</th><th class="p-2">Ação</th></tr></thead>
                        <tbody id="ponto-list"></tbody>
                    </table>
                </div>
                <div class="mt-2 text-right">
                    <button onclick="ToolsApp.clearPonto()" class="text-xs text-red-500 underline">Limpar Histórico</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        setTimeout(ToolsApp.updatePontoList, 100);
    };

    window.ToolsApp.addPonto = function(type) {
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points.unshift({ id: Date.now(), type: type, date: new Date().toLocaleString() });
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        ToolsApp.updatePontoList();
    };

    window.ToolsApp.updatePontoList = function() {
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        const tbody = document.getElementById('ponto-list');
        if(!tbody) return;
        tbody.innerHTML = points.map(p => `
            <tr class="border-b dark:border-gray-700">
                <td class="p-2">${p.date}</td>
                <td class="p-2 font-bold ${p.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}">${p.type}</td>
                <td class="p-2"><button onclick="ToolsApp.removePonto(${p.id})" class="text-red-500"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    };

    window.ToolsApp.removePonto = function(id) {
        let points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points = points.filter(p => p.id !== id);
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        ToolsApp.updatePontoList();
    };
    window.ToolsApp.clearPonto = function() {
        if(confirm('Limpar tudo?')) { localStorage.removeItem('tool_ponto'); ToolsApp.updatePontoList(); }
    };

    // --- 2. ESCALA DE SERVIÇO ---
    window.ToolsApp.renderEscala = function(container) {
        const escalaConfig = JSON.parse(localStorage.getItem('tool_escala_config')) || { type: '12x36', start: '' };
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-calendar-alt"></i> Escala de Serviço</h3>
                <div class="flex gap-2 mb-4 items-end">
                    <div class="flex-1">
                        <label class="text-xs font-bold">Tipo</label>
                        <select id="escala-type" class="w-full p-2 rounded border bg-white dark:bg-gray-700">
                            <option value="12x36" ${escalaConfig.type === '12x36' ? 'selected' : ''}>12x36</option>
                            <option value="24x48" ${escalaConfig.type === '24x48' ? 'selected' : ''}>24x48</option>
                        </select>
                    </div>
                    <div class="flex-1">
                        <label class="text-xs font-bold">Data do Plantão</label>
                        <input type="date" id="escala-start" value="${escalaConfig.start}" class="w-full p-2 rounded border bg-white dark:bg-gray-700">
                    </div>
                    <button onclick="ToolsApp.calcEscala()" class="bg-blue-600 text-white py-2 px-4 rounded font-bold"><i class="fas fa-calculator"></i></button>
                </div>
                <div id="escala-result" class="grid grid-cols-7 gap-1 text-center text-xs"></div>
            </div>
        `;
        container.innerHTML += html;
        if(escalaConfig.start) setTimeout(ToolsApp.calcEscala, 100);
    };

    window.ToolsApp.calcEscala = function() {
        const type = document.getElementById('escala-type').value;
        const startStr = document.getElementById('escala-start').value;
        if(!startStr) return;

        localStorage.setItem('tool_escala_config', JSON.stringify({ type, start: startStr }));

        const startDate = new Date(startStr);
        // Corrige fuso horário (adiciona horas para garantir dia certo)
        startDate.setHours(12,0,0,0); 
        
        const resultDiv = document.getElementById('escala-result');
        resultDiv.innerHTML = '';

        // Mostra próximos 30 dias
        const daysToShow = 30;
        const interval = type === '12x36' ? 2 : 3; // 12x36 = trabalha dia sim dia não (2); 24x48 = 1 trab 2 folga (3)

        // Cabeçalho dias da semana
        const weeks = ['D','S','T','Q','Q','S','S'];
        weeks.forEach(d => resultDiv.innerHTML += `<div class="font-bold p-1">${d}</div>`);

        const today = new Date();
        today.setHours(12,0,0,0);

        // Preenche dias vazios até o dia da semana atual
        const currentDayOfWeek = today.getDay(); 
        for(let i=0; i<currentDayOfWeek; i++) {
            resultDiv.innerHTML += `<div></div>`;
        }

        for (let i = 0; i < daysToShow; i++) {
            const current = new Date(today);
            current.setDate(today.getDate() + i);
            
            // Calcula diferença em dias
            const diffTime = current - startDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            let isWork = false;
            if (diffDays >= 0) {
                isWork = (diffDays % interval) === 0;
            }

            const dayClass = isWork ? 'bg-red-600 text-white font-bold rounded' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 rounded';
            const borderClass = i === 0 ? 'border-2 border-blue-500' : '';

            resultDiv.innerHTML += `
                <div class="p-2 ${dayClass} ${borderClass} flex flex-col items-center justify-center h-10">
                    <span>${current.getDate()}</span>
                </div>
            `;
        }
    };

    // --- 3. PLANEJADOR ---
    window.ToolsApp.renderPlanner = function(container) {
        const notes = localStorage.getItem('tool_planner') || '';
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-book-open"></i> Planejador de Estudos</h3>
                <p class="text-sm text-gray-500 mb-2">Defina suas metas semanais.</p>
                <textarea id="planner-text" class="w-full h-32 p-2 border rounded bg-white dark:bg-gray-700 text-sm" placeholder="- Segunda: Estudar APH (2h)\n- Terça: Revisar NR-33\n- Quarta: Simulado">${notes}</textarea>
                <button onclick="ToolsApp.savePlanner()" class="mt-2 bg-green-600 text-white px-4 py-1 rounded text-sm">Salvar</button>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.savePlanner = function() {
        const text = document.getElementById('planner-text').value;
        localStorage.setItem('tool_planner', text);
        alert('Planejamento salvo!');
    };

    // --- 4. HIDRATAÇÃO ---
    window.ToolsApp.renderWater = function(container) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water')) || { date: today, count: 0 };
        
        if(data.date !== today) { data = { date: today, count: 0 }; } // Reseta se mudou o dia

        const percent = Math.min((data.count / 3000) * 100, 100);

        let html = `
            <div class="tool-card text-center">
                <h3 class="tool-title"><i class="fas fa-tint text-blue-500"></i> Hidratação</h3>
                <div class="water-glass mb-2 bg-blue-100 rounded-b-lg border-2 border-blue-500 relative h-24 w-16 mx-auto overflow-hidden">
                    <div id="water-fill" class="absolute bottom-0 left-0 w-full bg-blue-500 transition-all duration-500" style="height: ${percent}%"></div>
                </div>
                <p class="font-bold text-xl"><span id="water-count">${data.count}</span> / 3000 ml</p>
                <div class="flex justify-center gap-2 mt-3">
                    <button onclick="ToolsApp.addWater(250)" class="bg-blue-500 text-white px-3 py-1 rounded shadow">+250ml</button>
                    <button onclick="ToolsApp.addWater(-250)" class="bg-gray-400 text-white px-3 py-1 rounded shadow">-250ml</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.addWater = function(amount) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water')) || { date: today, count: 0 };
        
        data.count += amount;
        if(data.count < 0) data.count = 0;
        
        localStorage.setItem('tool_water', JSON.stringify(data));
        
        document.getElementById('water-count').innerText = data.count;
        document.getElementById('water-fill').style.height = Math.min((data.count / 3000) * 100, 100) + '%';
    };

    // --- 5. ANOTAÇÕES ---
    window.ToolsApp.renderNotes = function(container) {
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-sticky-note"></i> Notas Rápidas</h3>
                <div class="flex gap-2 mb-2">
                    <input type="text" id="note-input" class="flex-1 p-2 rounded border bg-white dark:bg-gray-700" placeholder="Nova anotação...">
                    <button onclick="ToolsApp.addNote()" class="bg-yellow-500 text-white px-3 rounded"><i class="fas fa-plus"></i></button>
                </div>
                <ul id="notes-list" class="space-y-2 max-h-40 overflow-y-auto"></ul>
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
        ul.innerHTML = notes.map((n, i) => `
            <li class="bg-yellow-100 dark:bg-gray-600 p-2 rounded flex justify-between items-center text-sm">
                <span>${n.txt} <small class="text-gray-500 block text-xs">${n.date}</small></span>
                <button onclick="ToolsApp.delNote(${i})" class="text-red-500"><i class="fas fa-times"></i></button>
            </li>
        `).join('');
    };
    window.ToolsApp.delNote = function(index) {
        let notes = JSON.parse(localStorage.getItem('tool_quicknotes')) || [];
        notes.splice(index, 1);
        localStorage.setItem('tool_quicknotes', JSON.stringify(notes));
        ToolsApp.updateNotesList();
    };

    // --- 6. PAINEL SAÚDE (IMC) ---
    window.ToolsApp.renderHealth = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-heartbeat text-red-500"></i> Saúde (IMC)</h3>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <input type="number" id="health-weight" placeholder="Peso (kg)" class="p-2 border rounded dark:bg-gray-700">
                    <input type="number" id="health-height" placeholder="Altura (m)" class="p-2 border rounded dark:bg-gray-700">
                </div>
                <button onclick="ToolsApp.calcIMC()" class="w-full bg-red-500 text-white py-2 rounded font-bold mb-2">Calcular IMC</button>
                <div id="health-result" class="text-center font-bold text-lg"></div>
            </div>
        `;
        container.innerHTML += html;
    };
    window.ToolsApp.calcIMC = function() {
        const w = parseFloat(document.getElementById('health-weight').value);
        const h = parseFloat(document.getElementById('health-height').value);
        if(!w || !h) return;
        const imc = (w / (h*h)).toFixed(1);
        let status = '';
        if(imc < 18.5) status = 'Abaixo do peso';
        else if(imc < 24.9) status = 'Peso normal';
        else if(imc < 29.9) status = 'Sobrepeso';
        else status = 'Obesidade';
        
        document.getElementById('health-result').innerHTML = `<span class="${imc > 25 ? 'text-orange-500' : 'text-green-500'}">IMC: ${imc} (${status})</span>`;
    };

})();