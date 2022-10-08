import {db} from "../firebase";
import * as functions from "firebase-functions";
import {User} from "../type/user";
import {parseUserFromFirestore,
  parseUserToFirestore} from "../utils/type-converter";
import {getPhoto} from "./profilePhoto";

export const createUser = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const newUser = data.user as User;
    newUser.id = uid;
    newUser.profilePhoto = getPhoto(newUser.gender);
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


export const deleteUser = functions.https.onCall((data, context) => {
  // ...
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
    const updatedUser = data.user as User;
    const firebaseUser = parseUserToFirestore(updatedUser);
    await db.users.doc(uid).set(firebaseUser);
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

