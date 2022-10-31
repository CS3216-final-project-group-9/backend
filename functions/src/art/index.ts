import * as functions from "firebase-functions";
import {db} from "../firebase";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode"; import {parseFirestoreArtToArt} from "../utils/type-converter";
import moment = require("moment");
import {Art} from "../type/art";
import {urlDefaultCover} from "../users/profilePhoto";


export const changeArtVisibility = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const {artId, isVisible} = data;

    if (typeof(artId) != 'string') {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.ART_ID_INPUT_NOT_FOUND);
    }
    if (typeof(isVisible) != 'boolean') {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.ART_VISIBLE_INPUT_NOT_FOUND);
    }

    const artDoc = await db.art.doc(artId).get();

    const art = artDoc.data();

    if (!art) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.ART_NOT_IN_DB);
    }
    if (art.userId != uid) {
      throw new functions.https.HttpsError("failed-precondition", CustomErrorCode.USER_NOT_ART_OWNER);
    }

    await db.art.doc(artId).update({
      isPublic: isVisible,
    });

    return {success: true, message: "Update art status successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});


export const setCover = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const {artId} = data;

    if (typeof(artId) != 'string') {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.ART_ID_INPUT_NOT_FOUND);
    }

    const artDoc = await db.art.doc(artId).get();

    const art = artDoc.data();

    if (!art) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.ART_NOT_IN_DB);
    }
    if (art.userId != uid) {
      throw new functions.https.HttpsError("failed-precondition", CustomErrorCode.USER_NOT_ART_OWNER);
    }
    const imgUrl = art.image;
    if (typeof(imgUrl) != 'string') {
      throw new functions.https.HttpsError("failed-precondition", CustomErrorCode.ART_IMAGE_NOT_IN_DB);
    }

    await db.users.doc(uid).update({
      profilePhoto: imgUrl,
    });

    return {success: true, message: "Update profile picture successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const deleteArt = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const {artId} = data;

    if (typeof(artId) != 'string') {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.ART_ID_INPUT_NOT_FOUND);
    }

    const artDoc = await db.art.doc(artId).get();
    const userDoc = await db.users.doc(uid).get();

    const art = artDoc.data();
    const user = userDoc.data();

    if (!art) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.ART_NOT_IN_DB);
    }
    if (!user) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.USER_NOT_IN_DB);
    }
    if (art.userId != uid) {
      throw new functions.https.HttpsError("failed-precondition", CustomErrorCode.USER_NOT_ART_OWNER);
    }

    if (user.profilePhoto == art.image) {
      await db.users.doc(uid).set(
          {
            profilePhoto: urlDefaultCover,
          },
          {merge: true});
    }

    await db.art.doc(artId).delete();

    return {success: true, message: "Delete art successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});


export const getUserArt = async function getUserArt(uid: string) {
  const query = await db.art.where('userId', '==', uid).where('isPublic', '==', true).get();
  const results: Art[] = [];
  query.docs.forEach((doc) => {
    const data = doc.data();
    const obj = parseFirestoreArtToArt(data, doc.id);
    if (obj) {
      results.push(obj);
    }
  });
  const sorted = results.sort((a, b) => {
    const aDate = moment(a.date);
    return -aDate.diff(b.date, 'minute'); // latest first
  });
  return sorted;
};

export const getCurrentUserArt = async function getUserArt(uid: string) {
  const query = await db.art.where('userId', '==', uid).get();
  const results: Art[] = [];
  query.docs.forEach((doc) => {
    const data = doc.data();
    const obj = parseFirestoreArtToArt(data, doc.id);
    if (obj) {
      results.push(obj);
    }
  });
  const sorted = results.sort((a, b) => {
    const aDate = moment(a.date);
    return -aDate.diff(b.date, 'minute'); // latest first
  });
  return sorted;
};

