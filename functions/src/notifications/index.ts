import * as functions from "firebase-functions";
import {db} from "../firebase";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";
import {Notification} from "../type/notification";
import {parseFirestoreNotification} from "./parseFirestoreNotification";


export const getNotifications = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const fireStoreNotifications = await db.notifications.where("userId", "==", uid).get();
    const notifications: Notification[] = [];

    await Promise.all(fireStoreNotifications.docs.map( async (notiDoc) => {
      const firestoreNoti = notiDoc.data();
      const notification = await parseFirestoreNotification(firestoreNoti);
      if (notification) notifications.push(notification);
    }));
    return {success: true, message: notifications};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const markNotificationRead = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }


    const id = data.id;

    if (!(id instanceof String)) {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.NOTIFICATION_ID_INPUT_NOT_FOUND);
    }

    await db.notifications.doc(uid).set(
        {
          hasBeenViewed: true,
        },
        {merge: true});
    return {success: true, message: "Mark notification successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});
