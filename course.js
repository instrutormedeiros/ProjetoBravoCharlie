/* course.js - renders modules from data.js and integrates quizzes.js */
(function(){
  // DATA expected: MODULES variable from data.js (user-provided)
  if (typeof MODULES === 'undefined') {
    console.error('MODULES not found. Ensure data.js defines MODULES.');
    return;
  }

  const contentArea = document.getElementById('content-area');
  const desktopModuleContainer = document.getElementById('desktop-module-container');
  const mobileModuleContainer = document.getElementById('mobile-module-container');
  const welcome = document.getElementById('welcome-greeting');
  const totalModulesEl = document.getElementById('total-modules');
  const progressText = document.getElementById('progress-text');
  const completedCountEl = document.getElementById('completed-modules-count');

  let completed = JSON.parse(localStorage.getItem('bc_completed')||'[]');

  function saveCompleted(){
    localStorage.setItem('bc_completed', JSON.stringify(completed));
    if (completedCountEl) completedCountEl.textContent = completed.length;
    updateProgress();
  }

  function updateProgress(){
    const total = Object.keys(MODULES).length;
    const pct = Math.round((completed.length/total)*100);
    if (progressText) progressText.textContent = pct + '%';
    if (totalModulesEl) totalModulesEl.textContent = total;
  }

  function buildSidebar(){
    desktopModuleContainer.innerHTML = '';
    mobileModuleContainer && (mobileModuleContainer.innerHTML = '');

    // Group modules by category
    const cats = {};
    Object.keys(MODULES).forEach(key=>{
      const mod = MODULES[key];
      const cat = mod.category || 'Geral';
      if (!cats[cat]) cats[cat]=[];
      cats[cat].push({ key, title: mod.title });
    });

    Object.keys(cats).forEach(catName=>{
      const section = document.createElement('div');
      section.className = 'module-category mb-4';

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded';
      header.innerHTML = '<strong>'+catName+'</strong>';

      const list = document.createElement('div');
      list.className = 'mt-2 space-y-1';

      cats[catName].forEach(item=>{
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between';
        btn.textContent = item.title;
        btn.dataset.module = item.key;
        btn.addEventListener('click', ()=> loadModule(item.key));
        list.appendChild(btn);

        // mobile entry
        if (mobileModuleContainer){
          const a = document.createElement('a');
          a.className = 'block p-2 border-b';
          a.textContent = item.title;
          a.dataset.module = item.key;
          a.addEventListener('click', ()=> loadModule(item.key));
          mobileModuleContainer.appendChild(a);
        }
      });

      section.appendChild(header);
      section.appendChild(list);
      desktopModuleContainer.appendChild(section);
    });
  }

  function renderContent(modKey){
    const mod = MODULES[modKey];
    if (!mod) return;
    contentArea.innerHTML = '<h2 class="text-2xl font-bold mb-2">'+mod.title+'</h2>'+ (mod.content || '<p>Sem conteúdo.</p>');
    // render quiz if exists
    if (window.QUIZ_DATA && window.QUIZ_DATA[modKey]) {
      // render via simple function
      const quiz = window.QUIZ_DATA[modKey];
      const qContainer = document.createElement('div');
      qContainer.className = 'mt-6';
      quiz.forEach(q=>{
        const qBox = document.createElement('div');
        qBox.className = 'mb-4 p-3 border rounded';
        qBox.innerHTML = '<h4 class="font-semibold mb-2">'+(q.question||'')+'</h4>';
        const opts = document.createElement('div');
        Object.keys(q.options||{}).forEach(k=>{
          const label = document.createElement('label');
          label.className = 'block';
          label.innerHTML = '<input type="radio" name="'+q.id+'" value="'+k+'"> <span>'+k.toUpperCase()+'. '+q.options[k]+'</span>';
          opts.appendChild(label);
        });
        qBox.appendChild(opts);
        qContainer.appendChild(qBox);
      });
      contentArea.appendChild(qContainer);
    }
  }

  function loadModule(key){
    // mark as viewed
    if (!completed.includes(key)) {
      completed.push(key);
      saveCompleted();
    }
    renderContent(key);
  }

  window.startCourse = function(userData){
    if (welcome && userData && userData.name) welcome.textContent = 'Bem-vindo, '+userData.name;
    buildSidebar();
    updateProgress();
    // load last opened or first module
    const last = localStorage.getItem('bc_last_module') || Object.keys(MODULES)[0];
    loadModule(last);
  };

  // add reset progress control
  const resetBtn = document.createElement('button');
  resetBtn.className = 'action-button mt-4';
  resetBtn.textContent = 'Resetar progresso';
  resetBtn.addEventListener('click', ()=>{
    if (confirm('Resetar progresso?')){
      completed = [];
      saveCompleted();
      location.reload();
    }
  });
  document.addEventListener('DOMContentLoaded', ()=>{
    const side = document.querySelector('#desktop-module-container');
    side && side.parentNode && side.parentNode.appendChild(resetBtn);
  });

})();
