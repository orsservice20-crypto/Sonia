importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey:"AIzaSyD8TsBNkUQ_ymSbhOxNaOcq_j-w38OHrSg",
  authDomain:"sonia-a2b62.firebaseapp.com",
  databaseURL:"https://sonia-a2b62-default-rtdb.firebaseio.com",
  projectId:"sonia-a2b62",
  storageBucket:"sonia-a2b62.firebasestorage.app",
  messagingSenderId:"407732850153",
  appId:"1:407732850153:web:12fa073ce636a07e484f78"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const db = firebase.database();

// Notifications FCM background (quand token FCM est configuré)
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const title = data.senderName || "EniBusiness Pro";
  const body = data.type === "call"  ? "📞 Appel entrant de " + (data.senderName||"quelqu'un")
             : data.type === "voice" ? "🎤 Message vocal"
             : data.type === "photo" ? "📷 Photo"
             : (data.body || "Nouveau message");
  return self.registration.showNotification(title, {
    body, icon:"/icon.png", badge:"/icon.png",
    tag:"fcm-"+Date.now(), renotify:true,
    data: { senderUid: data.senderUid }
  });
});

// Écouter fcmNotifs/{myUid} dans Firebase pour les notifications en temps réel
// quand l'app est en arrière-plan ou fermée
let myUid = null;
let notifListener = null;

function startNotifListener(uid){
  if(notifListener) notifListener.off();
  myUid = uid;
  const ref = db.ref("fcmNotifs/" + uid);
  notifListener = ref;
  ref.on("child_added", snap => {
    const data = snap.val();
    if(!data || !data.senderUid) return;
    // Supprimer immédiatement pour éviter les doublons
    snap.ref.remove();
    const title = data.senderName || "EniBusiness Pro";
    const body = data.type === "call"  ? "📞 Appel entrant de " + (data.senderName||"quelqu'un")
               : data.type === "voice" ? "🎤 Message vocal"
               : data.type === "photo" ? "📷 Photo"
               : (data.body || "Nouveau message");
    self.registration.showNotification(title, {
      body, icon:"/icon.png", badge:"/icon.png",
      tag:"msg-"+data.senderUid,
      renotify:true,
      data: { senderUid: data.senderUid, chatKey: data.chatKey }
    });
  });
}

// Recevoir l'UID depuis l'app principale via postMessage
self.addEventListener("message", e => {
  if(e.data && e.data.type === "SET_UID" && e.data.uid){
    startNotifListener(e.data.uid);
  }
});

// Clic sur notification → ouvrir l'app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
      if(list.length > 0) return list[0].focus();
      return clients.openWindow("/");
    })
  );
});
