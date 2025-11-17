/* firebase-init.js - single initialization (compat) */
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyDNet1QC72jr79u8JpnFMLBoPI26Re6o3g",
    authDomain: "projeto-bravo-charlie-app.firebaseapp.com",
    projectId: "projeto-bravo-charlie-app"
  };
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded yet.');
    return;
  }
  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.info('Firebase initialized.');
    } else {
      console.info('Firebase already initialized.');
    }
  } catch (e) {
    console.error('Firebase init error', e);
  }
})();
