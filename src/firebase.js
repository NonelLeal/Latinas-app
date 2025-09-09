import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Suas credenciais do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBSHHK_oG9JhthYXXXNb3XhijOlHK3iabE",
    authDomain: "latinas2.firebaseapp.com",
    projectId: "latinas2",
    storageBucket: "latinas2.firebasestorage.app",
    messagingSenderId: "466352590934",
    appId: "1:466352590934:web:d41690da52734a40066bf7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar serviços do Firebase
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export default app;