import {db} from "../firebase";
import * as functions from "firebase-functions";
import {User} from "../type/user";

export const createUser = functions.https.onCall(async (data, context) => {
  try {
    const users = db.collection("users").doc();
    const {user} = data;
    const newUser = user as User;
    await users.set(newUser);
    return {success: true, message: String("New user created")};
  } catch (e) {
    return {success: false, message: String(e)};
  }
});


export const deleteUser = functions.https.onCall((data, context) => {
  // ...
});

export const getUser = functions.https.onCall((data, context) => {
  // ...
});

export const getCurrentUser = functions.https.onCall((data, context) => {
  // ...
});

