// Mesmo projeto Firebase usado no app de hábitos (habits-tracker-9b937).
// Reaproveitado porque os dois apps ficam no mesmo domínio
// (felipestoelben.github.io) e o login Google + domínio autorizado já
// estavam configurados lá. Os dados deste app ficam isolados em
// users/{uid}/transactions, separados do documento users/{uid} usado
// pelo app de hábitos — não há conflito entre os dois.
const firebaseConfig = {
  apiKey: 'AIzaSyDr6t6yt2PcPuy9cQSWdHOnfo4EgGSyFxA',
  authDomain: 'habits-tracker-9b937.firebaseapp.com',
  projectId: 'habits-tracker-9b937',
  storageBucket: 'habits-tracker-9b937.firebasestorage.app',
  messagingSenderId: '991287243189',
  appId: '1:991287243189:web:0018bcbe480c67711be9fc',
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
