importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:"AIzaSyD8TsBNkUQ_ymSbhOxNaOcq_j-w38OHrSg",
  authDomain:"sonia-a2b62.firebaseapp.com",
  databaseURL:"https://sonia-a2b62-default-rtdb.firebaseio.com",
  projectId:"sonia-a2b62",
  storageBucket:"sonia-a2b62.firebasestorage.app",
  messagingSenderId:"407732850153",
  appId:"1:407732850153:web:12fa073ce636a07e484f78"
});

const messaging = firebase.messaging();

// Notifications reçues quand l'app est EN ARRIÈRE-PLAN ou FERMÉE
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const title = data.senderName || "EniBusiness Pro";
  const body  = data.type === "call"
    ? "📞 Appel entrant de " + (data.senderName || "quelqu'un")
    : data.type === "voice"
    ? "🎤 Message vocal"
    : data.type === "photo"
    ? "📷 Photo"
    : (data.body || "Nouveau message");

  return self.registration.showNotification(title, {
    body,
    icon:  "/icon.png",
    badge: "/icon.png",
    tag:   "msg-" + (data.chatKey || Date.now()),
    renotify: true,
    data: { chatKey: data.chatKey, senderUid: data.senderUid }
  });
});

// Clic sur la notification → ouvrir l'app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type:"window", includeUncontrolled:true }).then(list => {
      if(list.length > 0) return list[0].focus();
      return clients.openWindow("/");
    })
  );
});
