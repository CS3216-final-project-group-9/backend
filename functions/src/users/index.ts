import {db} from "../firebase";
import * as functions from "firebase-functions";
import {User} from "../type/user";
import {parseUserFromFirestore,
  parseUserToFirestore} from "../utils/type-converter";
import {getPhoto} from "./profilePhoto";
import {checkUserInfoUnique} from "./checkUserUnique";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";
import {FirestoreCustomCampaign} from "../type/firebase-type";
import {createCampaign} from "../campaigns";
import {generateImage} from "../texttoimage";
import {AIImageTrigger} from "../type/ImageTrigger";


export const createUser = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const {user: userRaw} = data;
    if (!userRaw) {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.USER_NOT_IN_DB);
    }

    const newUser = userRaw as User;
    const {isTeleHandleSame, isUsernameSame} = await checkUserInfoUnique(newUser.telegramHandle, newUser.name);
    if (isTeleHandleSame && isUsernameSame) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.DUPLICATE_TELE_AND_USERNAME);
    }
    if (isTeleHandleSame) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.DUPLICATE_USERNAME);
    }
    if (isUsernameSame) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.DUPLICATE_TELE);
    }

    newUser.id = uid;
    const photos = getPhoto(newUser.gender);
    newUser.thumbnailPhoto = photos[0];
    newUser.profilePhoto = photos[1];
    const firebaseUser = parseUserToFirestore(newUser);
    await db.users.doc(uid).create(firebaseUser);
    const promises = [createNewCampaign(uid), generateImage(uid, AIImageTrigger.SIGNED_UP, uid)];
    await Promise.all(promises);
    return {success: true, message: String("New user created successfully")};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

function createNewCampaign(uid: string) {
  const campaign: FirestoreCustomCampaign = {
    id: uid,
    userId: uid,
    chances: 1,
    campaignId: "LAUNCH",
  } as FirestoreCustomCampaign;
  return createCampaign(campaign);
}


export const hasCreatedUserProfile = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const user = await db.users.doc(uid).get();

    if (user.exists) {
      return {success: true, hasCreatedUserProfile: true};
    } else {
      return {success: true, hasCreatedUserProfile: false};
    }
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});


export const getUser = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const {userId} = data;
    const userDoc = await db.users.doc(userId).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https
          .HttpsError("not-found", CustomErrorCode.USER_NOT_IN_DB);
    }
    const parsedUser = parseUserFromFirestore(user);
    return {success: true, message: parsedUser};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const updateUser = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }


    const {user: userRaw} = data;
    if (!userRaw) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.USER_OBJECT_INPUT_NOT_FOUND);
    }
    const updatedUser = userRaw as User;

    await db.users.doc(uid).set(
        {
          name: updatedUser.name,
          gender: updatedUser.gender,
          faculty: updatedUser.faculty,
          year: updatedUser.year,
          telegramHandle: updatedUser.telegramHandle,
          profilePhoto: updatedUser.profilePhoto,
          thumbnailPhoto: updatedUser.thumbnailPhoto,
        },
        {merge: true});
    return {success: true, message: String("User updated successfully")};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const getCurrentUser = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const userDoc = await db.users.doc(uid).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https
          .HttpsError("not-found", CustomErrorCode.CURRENT_USER_PROFILE_NOT_IN_DB);
    }
    const parsedUser = parseUserFromFirestore(user);
    return {success: true, message: parsedUser};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

