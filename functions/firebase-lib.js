// The Firebase Admin SDK to access Firestore.
export const admin = require('firebase-admin');
admin.initializeApp();

// Proper setup, TO BE DONE
// admin.initializeApp({
//     credential: admin.credential.cert({
//       privateKey: functions.config().private.key.replace(/\\n/g, '\n'),
//       projectId: functions.config().project.id,
//       clientEmail: functions.config().client.email
//     }),
//     databaseURL: 'https://[your_project_id].firebaseio.com'
//   })


export const db = admin.firestore();
export const functions = require('firebase-functions');




