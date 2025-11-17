/* app.js - login and access logic (uses firebase initialized by firebase-init.js) */
const auth = firebase.auth();
const db = firebase.firestore();
const usersCollection = db.collection('users');

const overlay = document.getElementById('access-overlay');
const card = document.getElementById('access-card');
const btnRegister = document.getElementById('ac-register');
const btnLogin = document.getElementById('ac-login');
const inputName = document.getElementById('ac-name');
const inputEmail = document.getElementById('ac-email');

const PAY_LINK = "https://pay.infinitepay.io/pixmedeiros/VC1D-2Eb9WDMcOj-49,90";
const PIX_KEY = "61998300711";

function showAlert(msg){ alert(msg); }

function validateEmail(email){
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Ensure DOM elements exist before adding listeners
document.addEventListener('DOMContentLoaded', () => {

  // auth state listener
  auth.onAuthStateChanged(userAuth => {
    if (userAuth) {
      checkUserStatus(userAuth.uid, userAuth.email);
    } else {
      if (overlay) overlay.style.display = 'flex';
    }
  });

  if (!btnLogin || !btnRegister) {
    console.error('Login elements not found');
    return;
  }

  btnLogin.addEventListener('click', async () => {
    const email = inputEmail.value.trim().toLowerCase();
    if (!validateEmail(email)) return showAlert('E-mail inválido.');
    try {
      await auth.signInWithEmailAndPassword(email, 'default_password_bc');
    } catch (err) {
      showAlert('Erro de Login. Tente criar conta.');
    }
  });

  btnRegister.addEventListener('click', async () => {
    const name = inputName.value.trim();
    const email = inputEmail.value.trim().toLowerCase();
    if (!name || !validateEmail(email)) return showAlert('Preencha nome e e-mail válidos.');
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, 'default_password_bc');
      const uid = userCredential.user.uid;
      const expiry = new Date(); expiry.setDate(expiry.getDate()+30);
      const userData = { name, email, status: 'free_trial', acesso_ate: expiry.toISOString() };
      await usersCollection.doc(uid).set(userData);
    } catch (err) {
      console.error('Register error', err);
      showAlert('Erro ao criar conta.');
    }
  });

});


async function checkUserStatus(uid, email){
  try {
    const doc = await usersCollection.doc(uid).get();
    if (doc.exists) {
      const userData = doc.data();
      const expiry = new Date(userData.acesso_ate);
      const status = userData.status;
      if (status === 'premium' || expiry > new Date()) {
        startCourse(userData);
      } else {
        showExpiredOverlay(userData);
      }
    } else {
      showAlert('Conta sem registro no banco. Faça login novamente.');
      await auth.signOut();
      if (overlay) overlay.style.display = 'flex';
    }
  } catch(e) {
    console.error('checkUserStatus error', e);
    showAlert('Erro de conexão com banco.');
    await auth.signOut();
    if (overlay) overlay.style.display = 'flex';
  }
}

function showExpiredOverlay(userData){
  if (!card) return;
  card.innerHTML = '<h3>Acesso expirado</h3><p>Renove via PIX</p><button onclick="window.openPayLink()">Renovar</button>';
  if (overlay) overlay.style.display = 'flex';
}

window.openPayLink = function(){ window.open(PAY_LINK, '_blank'); };
window.openPixWhats = function(){ window.open('https://wa.me/55'+PIX_KEY); };
