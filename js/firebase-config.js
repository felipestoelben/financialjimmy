// Cole aqui a configuração do SEU projeto Firebase.
// Onde encontrar: console.firebase.google.com > seu projeto > ícone de engrenagem
// (Configurações do projeto) > aba "Geral" > seção "Seus apps" > app da Web.
// Esses valores são públicos por design (não são segredos) e podem ficar no código.
// Veja o README.md deste repositório para o passo a passo completo.
const firebaseConfig = {
  apiKey: 'SUBSTITUA_AQUI',
  authDomain: 'SUBSTITUA_AQUI.firebaseapp.com',
  projectId: 'SUBSTITUA_AQUI',
  storageBucket: 'SUBSTITUA_AQUI.appspot.com',
  messagingSenderId: 'SUBSTITUA_AQUI',
  appId: 'SUBSTITUA_AQUI',
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
