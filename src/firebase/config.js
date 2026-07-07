import { initializeApp } from "firebase/app";


const firebaseConfig = {

apiKey: "YOUR_API_KEY",

authDomain:
"your-project.firebaseapp.com",

projectId:
"your-project-id",

storageBucket:
"your-project.appspot.com",

messagingSenderId:
"YOUR_ID",

appId:
"YOUR_APP_ID"

};


export const app = initializeApp(firebaseConfig);