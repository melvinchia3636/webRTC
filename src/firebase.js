// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxWQHLXLR9zfuH4jLpFi_YlUGdcuW52qc",
  authDomain: "copychat-meet.firebaseapp.com",
  projectId: "copychat-meet",
  storageBucket: "copychat-meet.appspot.com",
  messagingSenderId: "599047044066",
  appId: "1:599047044066:web:465548a3814a8499ccd7bb",
  measurementId: "G-8BDC6RMKG8",
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
