import firebase from 'firebase/app';
import '@firebase/messaging';

export const initializeFirebase = () => {
  firebase.initializeApp({
    messagingSenderId: "<FCM Sender ID>"
  });
};

export const initializePushNotification = async () => {
  try {
    // Send permission request
    const messaging = firebase.messaging();
    await messaging.requestPermission();

    // Get the registration token and save it to localStorage
    const token = await messaging.getToken();
    console.log("Token: ", token);
    localStorage.setItem("notification-token", token);

    messaging.onMessage(payload => {
      // Push notification listener when apps is in focus mode
      console.log("Notification received", payload);
    });

    return token;
  } catch (error) {
    console.log(error);
  }
};