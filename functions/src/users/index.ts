import {db} from "../firebase";
import * as functions from "firebase-functions";
import {User} from "../type/user";

export const createUser = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const newUser = data.user as User;
    await db.users.doc(uid).create(newUser);
    return {success: true, message: String("New user created")};
  } catch (e) {
    return {success: false, message: String(e)};
  }
});


export const deleteUser = functions.https.onCall((data, context) => {
  // ...
});

export const getUser = functions.https.onCall(async (data, context) => {
  try {
    const {userId} = data;
    const user = await db.users.doc(userId).get();
    return {success: true, message: user.data()};
  } catch (e) {
    return {success: false, message: String(e)};
  }
});

export const getCurrentUser = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const user = await db.users.doc(uid).get();
    return {success: true, message: user.data()};
  } catch (e) {
    return {success: false, message: String(e)};
  }
});

