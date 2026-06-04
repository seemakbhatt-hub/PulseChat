import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBys8NXbQ-Iu9qBDIW4lYUkvO0DtYVvwlw",
  authDomain: "pulsechat-2c5b5.firebaseapp.com",
  projectId: "pulsechat-2c5b5",
  storageBucket: "pulsechat-2c5b5.firebasestorage.app",
  messagingSenderId: "896985997698",
  appId: "1:896985997698:web:e233c10e791fb15912af9b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
