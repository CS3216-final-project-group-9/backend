import {db} from "../firebase";
import * as functions from "firebase-functions";
import {User} from "../type/user";
import {parseUserFromFirestore,
  parseUserToFirestore} from "../utils/type-converter";
import {getPhoto} from "./profilePhoto";
import {checkUserInfoUnique} from "./checkUserUnique";

export const createUser = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const {user: userRaw} = data;
    if (!userRaw) {
      throw new functions.https
          .HttpsError("invalid-argument", "User object cannot be found");
    }

    const newUser = userRaw as User;
    const {isTeleHandleSame, isUsernameSame} = await checkUserInfoUnique(newUser.telegramHandle, newUser.name);
    if (isTeleHandleSame && isUsernameSame) {
      throw new functions.https
          .HttpsError("invalid-argument", "Telegram handle and user name have been used");
    }
    if (isTeleHandleSame) {
      throw new functions.https
          .HttpsError("invalid-argument", "User name has been used");
    }
    if (isUsernameSame) {
      throw new functions.https
          .HttpsError("invalid-argument", "Telegram handle has been used");
    }

    newUser.id = uid;
    const photos = getPhoto(newUser.gender);
    newUser.thumbnailPhoto = photos[0];
    newUser.profilePhoto = photos[1];
    const firebaseUser = parseUserToFirestore(newUser);
    await db.users.doc(uid).create(firebaseUser);
    return {success: true, message: String("New user created successfully")};
  } catch (e) {
    return {success: false, message: e};
  }
});


export const hasCreatedUserProfile = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const user = await db.users.doc(uid).get();

    if (user.exists) {
      return {success: true, hasCreatedUserProfile: true};
    } else {
      return {success: true, hasCreatedUserProfile: false};
    }
  } catch (e) {
    return {success: false, message: e};
  }
});


export const getUser = functions.https.onCall(async (data, context) => {
  try {
    const {userId} = data;
    const userDoc = await db.users.doc(userId).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https
          .HttpsError("not-found", "User profile not found");
    }
    const parsedUser = parseUserFromFirestore(user);
    return {success: true, message: parsedUser};
  } catch (e) {
    return {success: false, message: e};
  }
});

export const updateUser = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const {user: userRaw} = data;
    if (!userRaw) {
      throw new functions.https
          .HttpsError("invalid-argument", "User object cannot be found");
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
    return {success: false, message: e};
  }
});

export const getCurrentUser = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const userDoc = await db.users.doc(uid).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https
          .HttpsError("not-found", "Current User profile not found");
    }
    const parsedUser = parseUserFromFirestore(user);
    return {success: true, message: parsedUser};
  } catch (e) {
    return {success: false, message: e};
  }
});

