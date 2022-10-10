import {db} from "../firebase";

export async function checkUserInfoUnique(teleHandle :string, username: string) {
  let isTeleHandleSame = false;
  let isUsernameSame = false;

  teleHandle = teleHandle.toLowerCase().trim();
  username = username.toLowerCase().trim();

  const userSnapshot = await db.users.get();
  await Promise.all(userSnapshot.docs.map( async (userDoc) => {
    const firestoreUser = userDoc.data();

    if (firestoreUser.telegramHandle.toLowerCase().trim() == teleHandle) isTeleHandleSame = true;
    if (firestoreUser.name.toLowerCase().trim() == username) isUsernameSame = true;
  }));
  return {isTeleHandleSame, isUsernameSame};
}

