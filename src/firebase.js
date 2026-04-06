import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

//  Firebase 專案設定中複製的 Config
const firebaseConfig = {
  apiKey: "AIzaSyC_RMn8F_cE3h5IticKd4TjZplG-UE7ltk",
  authDomain: "traffic-puzzle-81c14.firebaseapp.com",
  projectId: "traffic-puzzle-81c14",
  storageBucket: "traffic-puzzle-81c14.firebasestorage.app",
  messagingSenderId: "324138790555",
  appId: "1:324138790555:web:a078fab1bd1f1c3c49203e",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // 導出資料庫，這讓 App.jsx 能夠遠端存取
export const rtdb = getDatabase(app);