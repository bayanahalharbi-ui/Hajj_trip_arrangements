/* =========================================================
   طبقة الاتصال بقاعدة البيانات (Firebase Firestore)
   لا حاجة لتعديل هذا الملف — التعديل يكون في assets/firebase-config.js فقط
   ========================================================= */

const HAJJ_DOC = { collection: 'hajj_data', doc: 'content' };

function ensureFirebase() {
  if (!window.firebase) throw new Error('مكتبة Firebase ما تحمّلت. تأكدي من ترتيب سكربتات الصفحة.');
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  return firebase;
}

function fbAuth() { return ensureFirebase().auth(); }
function fbDb() { return ensureFirebase().firestore(); }

/** يقرأ آخر نسخة منشورة من الجدول. يرجع null إذا ما فيه بيانات بعد. */
async function loadData() {
  const snap = await fbDb().collection(HAJJ_DOC.collection).doc(HAJJ_DOC.doc).get();
  return snap.exists ? snap.data() : null;
}

/** ينشر نسخة جديدة (يستبدل القديمة بالكامل). يتطلب تسجيل دخول. */
async function saveData(data) {
  await fbDb().collection(HAJJ_DOC.collection).doc(HAJJ_DOC.doc).set(data);
}
