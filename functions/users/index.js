import { functions, db } from "../firebase-lib";


export const createUser = functions.https.onCall(async (data, context) => {
    try {
      const users = db.collection("users").doc();
      const newUser = createUserObject(data.user);
      await users.set(newUser); 
      return {success: true, message: String("New user created")};
    } catch(e) {
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


const createUserObject = (user) => {
  return {
    id: String(user.id),
    name: String(user.name),
    gender: String(user.gender),
    faculty: String(user.faculty),
    year: Number(data.year),
    telegramHandle: String(user.telegramHandle),
    profilePhoto: String(user.profilePhoto),
    thumbnailPhoto: String(user.thumbnailPhoto)
  }
}
