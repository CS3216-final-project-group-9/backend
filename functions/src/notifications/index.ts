import * as functions from "firebase-functions";
import {db, unTypedFirestore} from "../firebase";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";
import {Notification} from "../type/notification";
import {parseFirestoreNotification} from "./parseFirestoreNotification";
import {FieldValue} from "firebase-admin/firestore";


export const getNotifications = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const fireStoreNotifications = await db.notifications.where("userId", "==", uid).orderBy("updatedTime", 'desc').get();
    const notifications: Notification[] = [];

    await Promise.all(fireStoreNotifications.docs.map( async (notiDoc) => {
      const firestoreNoti = notiDoc.data();
      const notification = await parseFirestoreNotification(firestoreNoti);
      return notification;
    })).then((responses) => {
      responses.map((response) => {
        if (response) notifications.push(response);
      });
    });
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


    const rawId = data.id;
    const id = rawId as string;

    if (!(typeof(id) == "string")) {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.NOTIFICATION_ID_INPUT_NOT_FOUND);
    }

    await db.notifications.doc(id).set(
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


export const sendNotificationToken = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const userDoc = await db.users.doc(uid).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.USER_NOT_IN_DB);
    }
    const rawToken = data.token;
    const token = rawToken as string;
    if (!(typeof(token) == "string")) {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.TOKEN_INPUT_NOT_FOUND);
    }
    await unTypedFirestore.collection("users").doc(uid).set({
      tokens: FieldValue.arrayUnion(token),
    }, {merge: true});
    return {success: true, message: "Add token successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const isUserAlreadyRegisteredForNotifications = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const userDoc = await db.users.doc(uid).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.USER_NOT_IN_DB);
    }

    if (!user.tokens || user.tokens.length < 1) {
      return {success: true, message: false};
    } else {
      return {success: true, message: true};
    }
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});
