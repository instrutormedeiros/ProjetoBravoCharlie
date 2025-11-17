/* quizzes-adapter.js
   Adapta a estrutura unificada QUIZ_DATA para o formato esperado por app.js (window.questionBank).
   - Se QUIZ_DATA já estiver definido, copia imediatamente.
   - Se QUIZ_DATA for carregado depois (via lazy-load), faz polling por até 5s e adapta quando encontrado.
*/
(function(){
  function adapt(){
    try {
      if (typeof QUIZ_DATA !== 'undefined') {
        window.questionBank = window.questionBank || {};
        Object.keys(QUIZ_DATA).forEach(function(mid){
          // ensure consistent array format
          window.questionBank[mid] = QUIZ_DATA[mid];
        });
        // optional: expose flag
        window.__QUIZ_ADAPTER_LOADED = true;
        console.log('quizzes-adapter: QUIZ_DATA mapeado para window.questionBank.');
        return true;
      }
    } catch(e){ console.error('quizzes-adapter erro', e); }
    return false;
  }

  if (!adapt()) {
    var waited = 0;
    var interval = setInterval(function(){
      if (adapt() || (waited>5000)) {
        clearInterval(interval);
      }
      waited += 200;
    }, 200);
  }
})();