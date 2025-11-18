/* firebase-init.js
   Funções de autenticação e verificação de acesso para o Projeto Bravo Charlie.
*/

(function(){
  window.FirebaseCourse = window.FirebaseCourse || {};

  // --- 1. INICIALIZAÇÃO ---
  window.FirebaseCourse.init = function(config){
    if (!config || !window.firebase) {
      console.warn('Firebase não inicializado. Verifique as configurações.');
      return;
    }
    try {
      if (!firebase.apps.length) {
          firebase.initializeApp(config);
      }
      window.__fbAuth = firebase.auth();
      window.__fbDB = firebase.firestore();
      console.log('Firebase Iniciado com Sucesso.');
    } catch(e){
      console.error('Erro ao iniciar Firebase:', e);
    }
  };

  // --- 2. CADASTRO (com Trial de 30 dias) ---
  window.FirebaseCourse.signUpWithEmail = async function(name, email, password){
    if (!window.__fbAuth || !window.__fbDB) {
      throw new Error('Firebase não inicializado.');
    }

    // 1. Cria o usuário no Authentication
    const userCred = await __fbAuth.createUserWithEmailAndPassword(email, password);
    const uid = userCred.user.uid;
    
    // 2. Define a data de expiração (30 dias a partir de agora)
    const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 3. Cria o documento no Firestore
    await __fbDB.collection('users').doc(uid).set({
      name: name,
      email: email,
      status: 'trial', // 'trial', 'paid', 'expired'
      acesso_ate: trialEndDate.toISOString() // Salva como string
    });
    
    console.log(`Usuário ${uid} criado com trial até ${trialEndDate.toLocaleDateString()}.`);
    return { uid, acesso_ate: trialEndDate.toISOString() };
  };

  // --- 3. LOGIN ---
  window.FirebaseCourse.signInWithEmail = async function(email, password){
    if (!window.__fbAuth) throw new Error('Firebase não inicializado.');
    const userCred = await __fbAuth.signInWithEmailAndPassword(email, password);
    return userCred.user;
  };

  // --- 4. BUSCAR DADOS DO USUÁRIO ---
  window.FirebaseCourse.getUserDoc = async function(uid){
    if (!window.__fbDB) throw new Error('Firebase não inicializado.');
    const doc = await __fbDB.collection('users').doc(uid).get();
    if (!doc.exists) {
        throw new Error("Documento de usuário não encontrado no Firestore.");
    }
    return doc.data();
  };
  
  // --- 5. LOGOUT ---
  window.FirebaseCourse.signOutUser = async function() {
    if (!window.__fbAuth) return;
    await __fbAuth.signOut();
    console.log("Usuário deslogado.");
    window.location.reload(); // Recarrega a página para mostrar o login
  };

  // --- 6. O "PORTÃO" DE VERIFICAÇÃO (Função Principal) ---
  // Verifica a sessão (login persistente) e validade do acesso
  window.FirebaseCourse.checkAuth = function(onLoginSuccess) {
    if (!window.__fbAuth) {
        console.error("Auth não iniciado. Chamando checkAuth cedo demais.");
        return;
    }
    
    const loginModal = document.getElementById('name-prompt-modal');
    const loginOverlay = document.getElementById('name-modal-overlay');
    const expiredModal = document.getElementById('expired-modal');

    __fbAuth.onAuthStateChanged(async (user) => {
      if (user) {
        // --- USUÁRIO ESTÁ LOGADO ---
        console.log("Usuário logado:", user.uid);
        try {
          const userData = await FirebaseCourse.getUserDoc(user.uid);
          
          // Converte a string 'acesso_ate' do Firestore em Data
          const acessoAte = new Date(userData.acesso_ate);
          const hoje = new Date();

          if (acessoAte > hoje) {
            // --- ACESSO VÁLIDO ---
            console.log("Acesso válido até:", acessoAte.toLocaleDateString());
            // Chama a função (de app.js) para iniciar o curso
            onLoginSuccess(user, userData);
            
          } else {
            // --- ACESSO EXPIRADO ---
            console.warn("Acesso expirado em:", acessoAte.toLocaleDateString());
            if(expiredModal) expiredModal.classList.add('show');
            if(loginOverlay) loginOverlay.classList.add('show');
          }
          
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          alert(`Erro: ${error.message}. Faça login novamente.`);
          await FirebaseCourse.signOutUser(); // Desloga se houver erro
        }
        
      } else {
        // --- USUÁRIO ESTÁ DESLOGADO ---
        console.log("Nenhum usuário logado. Mostrando modal de login.");
        if(loginModal) loginModal.classList.add('show');
        if(loginOverlay) loginOverlay.classList.add('show');
      }
    });
  };

})();
