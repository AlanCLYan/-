
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { SavedRecord } from "../types";

// 注意：請替換為您自己的 Firebase 專案配置
// 若暫時沒有，此代碼會嘗試安全運行但無法實際儲存
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: "friendship-quiz-2025.firebaseapp.com",
  projectId: "friendship-quiz-2025",
  storageBucket: "friendship-quiz-2025.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const recordsCol = collection(db, "quiz_records");

export const firebaseService = {
  /**
   * 儲存新紀錄到雲端
   */
  async saveRecord(record: Omit<SavedRecord, "id">) {
    try {
      const docRef = await addDoc(recordsCol, {
        ...record,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      console.error("Firebase Save Error:", e);
      // fallback 到 localStorage
      const localRecords = JSON.parse(localStorage.getItem("quiz_backup") || "[]");
      localStorage.setItem("quiz_backup", JSON.stringify([...localRecords, record]));
      return null;
    }
  },

  /**
   * 獲取所有紀錄並按時間排序
   */
  async getAllRecords(): Promise<SavedRecord[]> {
    try {
      const q = query(recordsCol, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedRecord[];
    } catch (e) {
      console.error("Firebase Fetch Error:", e);
      return JSON.parse(localStorage.getItem("quiz_backup") || "[]");
    }
  },

  /**
   * 刪除指定紀錄
   */
  async deleteRecord(id: string) {
    try {
      await deleteDoc(doc(db, "quiz_records", id));
      return true;
    } catch (e) {
      console.error("Firebase Delete Error:", e);
      return false;
    }
  }
};
