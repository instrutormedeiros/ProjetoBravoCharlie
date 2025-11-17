/* firebase-init.js
   Arquivo de inicialização Firebase (modelo). Substitua as configurações pelo seu projeto.
   Funções mínimas: init, signUpWithEmail, signInWithEmail, checkAccess.
*/

(function(){
  // Avoid loading firebase SDK here; expect the hosting to include Firebase SDK scripts as needed.
  window.FirebaseCourse = window.FirebaseCourse || {};

  window.FirebaseCourse.init = function(config){
    if (!config || !window.firebase) {
      console.warn('Firebase não inicializado: passe as config e/ou carregue o SDK do Firebase.');
      return;
    }
    try {
      firebase.initializeApp(config);
      window.__fbAuth = firebase.auth();
      window.__fbDB = firebase.firestore();
      console.log('Firebase iniciado.');
    } catch(e){
      console.error('Erro ao iniciar Firebase:', e);
    }
  };

  // Example sign up (creates user + document with fields required)
  window.FirebaseCourse.signUpWithEmail = async function(name, email, password){
    if (!window.__fbAuth || !window.__fbDB) {
      throw new Error('Firebase não inicializado.');
    }
    const userCred = await __fbAuth.createUserWithEmailAndPassword(email, password);
    const uid = userCred.user.uid;
    const acesso_ate = new Date(Date.now() + 30*24*60*60*1000).toISOString(); // 30 dias
    await __fbDB.collection('users').doc(uid).set({
      name: name,
      email: email,
      status: 'active',
      acesso_ate: acesso_ate
    });
    return { uid, acesso_ate };
  };

  window.FirebaseCourse.signInWithEmail = async function(email, password){
    if (!window.__fbAuth) throw new Error('Firebase não inicializado.');
    const userCred = await __fbAuth.signInWithEmailAndPassword(email, password);
    return userCred.user;
  };

  window.FirebaseCourse.getUserDoc = async function(uid){
    if (!window.__fbDB) throw new Error('Firebase não inicializado.');
    const doc = await __fbDB.collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  };

})();