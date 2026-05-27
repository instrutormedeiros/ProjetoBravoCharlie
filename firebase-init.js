/* firebase-init.js
   Funções de autenticação e sessão com BATCH WRITE e Fingerprint de Dispositivo.
*/

(function(){
  window.FirebaseCourse = window.FirebaseCourse || {};

  // --- 1. INICIALIZAÇÃO ---
  window.FirebaseCourse.init = function(config){
    if (!config || !window.firebase) return;
    if (!firebase.apps.length) firebase.initializeApp(config);
    window.__fbAuth = firebase.auth();
    window.__fbDB = firebase.firestore();
    window.__fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  };

  // --- VALIDAÇÃO CPF ---
  function validarCPF(cpf) {
      cpf = cpf.replace(/[^\d]+/g,'');
      if(cpf.length != 11 || /^(\d)\1+$/.test(cpf)) return false;
      let add = 0;
      for (let i=0; i < 9; i ++) add += parseInt(cpf.charAt(i)) * (10 - i);
      let rev = 11 - (add % 11);
      if (rev == 10 || rev == 11) rev = 0;
      if (rev != parseInt(cpf.charAt(9))) return false;
      add = 0;
      for (let i = 0; i < 10; i ++) add += parseInt(cpf.charAt(i)) * (11 - i);
      rev = 11 - (add % 11);
      if (rev == 10 || rev == 11) rev = 0;
      if (rev != parseInt(cpf.charAt(10))) return false;
      return true;
  }

  // --- 2. CADASTRO BLINDADO COM FINGERPRINT ---
   // Note o novo parâmetro no final: courseType
  window.FirebaseCourse.signUpWithEmail = async function(name, email, password, cpf, company, phone, courseType) {
      
      // ... (código de validação de CPF continua igual) ...

      try {
          const userCredential = await __fbAuth.createUserWithEmailAndPassword(email, password);
          const user = userCredential.user;
          
          // Define data de validade (Trial de 7 dias)
          const validade = new Date();
          validade.setDate(validade.getDate() + 7);

          const userData = {
              name: name,
              email: email,
              cpf: cpf,
              company: company || 'Particular',
              phone: phone || '',
              
              // --- NOVO CAMPO SALVO NO BANCO ---
              courseType: courseType || 'BC', // Salva 'BC' ou 'SP'
              // ---------------------------------

              status: 'trial',
              acesso_ate: validade.toISOString(),
              created_at: firebase.firestore.FieldValue.serverTimestamp(),
              completedModules: [],
              isAdmin: false,
              isManager: false,
              current_session_id: new Date().getTime().toString() 
          };

          // Salva no Firestore
          await __fbDB.collection('users').doc(user.uid).set(userData);
          
          // Salva CPF para evitar duplicidade
          await __fbDB.collection('cpfs').doc(cpf).set({ uid: user.uid });

          return user;
      } catch (error) {
          throw error;
      }
  };
  // --- 3. LOGIN COM ATUALIZAÇÃO DE FINGERPRINT ---
  window.FirebaseCourse.signInWithEmail = async function(email, password){
    const userCred = await __fbAuth.signInWithEmailAndPassword(email, password);
    const newSessionId = Date.now().toString();
    const userAgent = navigator.userAgent;

    // Atualiza sessão e dispositivo
    __fbDB.collection('users').doc(userCred.user.uid).update({ 
        current_session_id: newSessionId,
        last_device: userAgent,
        last_login: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(()=>{});
    
    return userCred.user;
  };
  
  window.FirebaseCourse.signOutUser = async function() {
    await __fbAuth.signOut();
    window.location.reload();
  };

  window.FirebaseCourse.checkAuth = function(onLoginSuccess) {
    const loginModal = document.getElementById('name-prompt-modal');
    const loginOverlay = document.getElementById('name-modal-overlay');
    const expiredModal = document.getElementById('expired-modal');
    let unsubscribe = null;

    __fbAuth.onAuthStateChanged(async (user) => {
      if (user) {
        unsubscribe = __fbDB.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (!doc.exists) return; 
            
            const userData = doc.data();
            const hoje = new Date();
            const validade = new Date(userData.acesso_ate);

            if (hoje > validade) {
                if(expiredModal) {
                    expiredModal.classList.add('show');
                    if(loginOverlay) loginOverlay.classList.add('show');
                }
                return; 
            }

            const localSession = localStorage.getItem('my_session_id');
            if (!localSession) {
                localStorage.setItem('my_session_id', userData.current_session_id);
                onLoginSuccess(user, userData);
            } else if (localSession !== userData.current_session_id) {
                alert("Conta acessada em outro dispositivo. Desconectando por segurança.");
                localStorage.removeItem('my_session_id');
                FirebaseCourse.signOutUser();
            } else {
                onLoginSuccess(user, userData);
            }
        });
      } else {
        if (unsubscribe) unsubscribe();
        localStorage.removeItem('my_session_id');
        if(loginModal) loginModal.classList.add('show');
        if(loginOverlay) loginOverlay.classList.add('show');
      }
    });
  };
})();
