# Receive Push Notification in Frontend

This is an example of how to receive push notification using Firebase SDK, especially in React JS. This example try utilize Workbox's `injectManifest` to add custom service worker code. The example can be found in `examples` folder.

## Requirements
* node v12.9.1
* npm 6.10.2
* npx 6.10.2
* firebase 4.3.1

## Create React App

Create new React App with `create-react-app` and `cd` into that folder.

```sh
npx create-react-app react-app
cd react-app
```

## Add Firebase Library

We need to add Firebase JS Library to the project.

```sh
npm install — save firebase
```

Then, create new file inside `src` folder named `push-notification.js`. And add below code:

```js
import firebase from 'firebase/app';
import '@firebase/messaging';

// Function to initialize Firebase app
export const initializeFirebase = () => {
  firebase.initializeApp({
    messagingSenderId: "<FCM Sender ID>"
  });
};

// Function to initialize push notification
export const initializePushNotification = async () => {
  try {
    // Send permission request
    const messaging = firebase.messaging();
    await messaging.requestPermission();

    // Get the registration token and save it to localStorage
    const token = await messaging.getToken();
    console.log("Token: ", token);
    localStorage.setItem("notification-token", token);

    // Handle incoming messages. Called when:
    // - a message is received while the app has focus
    // - the user clicks on an app notification created by a service worker
    //   `messaging.setBackgroundMessageHandler` handler.
    messaging.onMessage(payload => {
      console.log("Notification received", payload);
    });

    return token;
  } catch (error) {
    console.log(error);
  }
};
```

To receive notification, we need service worker with `setBackgroundMessageHandler` to handle message when app is in background. Normally Firebase will search for `firebase-messaging-sw.js`. But if we want to use another service worker we need to invoke `useServiceWorker`. 

Open `serviceWorker.js` and append some code.

```js
import firebase from 'firebase/app';
// Import push-notification
import * as pushNotification from './push-notification';

// ...

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      // Initialize firebase using the registered service worker
      pushNotification.initializeFirebase();
      firebase.messaging().useServiceWorker(registration);
      if(!localStorage.getItem("notification-token")) {
        pushNotification.initializePushNotification();
      }
// ...
```

Change below code in `index.js`.

```js
serviceWorker.unregister();
```

to 

```js
serviceWorker.register();
```

## Create Custom Service Worker

Install Workbox dependency

```sh
npm install workbox-build --save-dev
```

Create `sw-build.js` and `sw-template.js` in `src` folder. Then provide the build instruction in `sw-build.js`.

```js
const workboxBuild = require('workbox-build');
// NOTE: This should be run *AFTER* all your assets are built
const buildSW = () => {
  // This will return a Promise
  return workboxBuild.injectManifest({
    // this is your sw template file
    swSrc: 'src/sw-template.js', 
    // this will be created in the build step
    swDest: 'build/service-worker.js', 
    globDirectory: 'build',
    globPatterns: [
      '**\/*.{js,css,html,png}',
    ]
  }).then(({count, size, warnings}) => {
    // Optionally, log any warnings and details.
    warnings.forEach(console.warn);
    console.log(`${count} files will be precached, totaling ${size} bytes.`);
  });
}
buildSW();
```

In `sw-template.js`, we can put our custom service worker and template for Workbox Service Worker.

```js
// Import Workbox Service Worker JS
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js'
);

// Custom Service Worker
// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/6.3.4/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/6.3.4/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  'messagingSenderId': '<FCM Sender ID>'
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = 'Background Message Title';
  const notificationOptions = {
    body: 'Background Message body.',
    icon: '/logo192.png'
  };

  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});

// Workbox Service Worker
// Global workbox
if (workbox) {
  console.log('Workbox is loaded');

  // Injection point for manifest files
  workbox.precaching.precacheAndRoute([]);

  // Custom cache rules
  workbox.routing.registerNavigationRoute('/index.html', {
    blacklist: [/^\/_/, /\/[^\/]+\.[^\/]+$/],
  });
  
  workbox.routing.registerRoute(
    /\.(?:png|gif|jpg|jpeg)$/,
    workbox.strategies.cacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

} else {
  console.log('Workbox could not be loaded. No Offline support');
}
```

Next, we need to add Workbox Build Instructions for CRA. We also need to clean default CRA Service Worker. So, we need to modify `scripts` in `package.json`.

```json
...
  "scripts": {
    "start": "react-scripts start",
    "clean-cra-sw": "rm -f build/precache-manifest.*.js && rm -f build/service-worker.js",
    "build-sw": "npm run clean-cra-sw && node ./src/sw-build.js",
    "build": "react-scripts build && npm run build-sw",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
...
```

## Build and Run the App

Use `npm` to build the project.

```sh
npm run build
```

The previous command will generate `build` folder. Use any server to serve the app. We also can create `server.js` in root directory and add `proxy` to `package.json`

```json
...
  "proxy": "http://localhost:8080"
...
```

```js
const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'build')));

app.get('/ping', function (req, res) {
 return res.send('pong');
});

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(process.env.PORT || 8080);
```

Then run the server.

```sh
node server.js
```

Open it at <http://localhost:8080>.