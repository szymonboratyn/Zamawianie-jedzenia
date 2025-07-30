import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDsCvd-HwnO3XVgGi63BvUmJrebQwTVr3g",
  authDomain: "zamawianie-jedzenia-ebc71.firebaseapp.com",
  projectId: "zamawianie-jedzenia-ebc71",
  storageBucket: "zamawianie-jedzenia-ebc71.firebasestorage.app",
  messagingSenderId: "1090799134320",
  appId: "1:1090799134320:web:80422ccba06f25df79b6b5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); 