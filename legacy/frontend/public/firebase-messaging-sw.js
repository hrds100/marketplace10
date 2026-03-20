importScripts(
  "https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyA2kEEsgQCxv9jvbUOMfGDCm0KvMaJmOvM",
  authDomain: "nfstay-app-7cd7e.firebaseapp.com",
  projectId: "nfstay-app-7cd7e",
  storageBucket: "nfstay-app-7cd7e.firebasestorage.app",
  messagingSenderId: "1091012704473",
  appId: "1:1091012704473:web:3bfc7484c72b3c80ac66c8",
  measurementId: "G-6JZ68WMMTX",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: "./nfstay-logo.png",
    sound: "default",
    data: {
      link: payload.data.redirectUrl,
    },
  };

  // Show notification to the user
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add click event listener to handle redirection when the notification is clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // Close the notification
  // Get the URL from the notification's data (link)
  const url = event.notification.data.link;

  // Open the URL in a new window or focus an existing window
  if (url) {
    clients.openWindow(url); // Opens the URL in the current browser window or a new tab
  }
});
