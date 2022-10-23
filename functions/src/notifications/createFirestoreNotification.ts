
import {cloudMessageAdmin, db} from "../firebase";
import {FirestoreCustomNotification} from "../type/firebase-type";
import {NotificationType} from "../type/notification";


export async function addAppliedToPostNotification(postId:string, posterId: string, applicantId:string, title: string) {
  console.log("callling addappliedtopostnotification", postId, posterId, applicantId, title);
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: NotificationType.APPLIED_TO_YOUR_POST,
    userId: posterId,
    otherUserId: applicantId,
    data: {
      postId: postId,
    },
    title: title,
    hasBeenViewed: false,
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}

export async function addCancelPostApplicationNotification(postId:string, posterId: string, applicantId:string, title: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: NotificationType.CANCELLED_THEIR_APPLICATION,
    userId: posterId,
    otherUserId: applicantId,
    data: {
      postId: postId,
    },
    title: title,
    hasBeenViewed: false,
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}

export async function addAcceptPostApplicationNotification(postId:string, posterId: string, applicantId:string, title: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: NotificationType.ACCEPTED_YOUR_APPLICATION,
    userId: applicantId,
    otherUserId: posterId,
    data: {
      postId: postId,
      userId: applicantId,
    },
    title: title,
    hasBeenViewed: false,
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}


export async function addGenericNotification(userId: string, title: string, message: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: NotificationType.GENERIC_MESSAGE,
    userId: userId,
    data: message,
    title: title,
    hasBeenViewed: false,
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}

export async function addDeletePostApplicationNotification(posterId: string, applicantId:string, title: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: NotificationType.DELETED_POST_YOU_APPLIED_FOR,
    userId: applicantId,
    otherUserId: posterId,
    title: title,
    hasBeenViewed: false,
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}

export async function getTokensAndSendMessage( uid: string, title: string) {
  const userDoc = await db.users.doc(uid).get();
  const user = userDoc.data();
  const rawTokens = user?.tokens;
  console.log(rawTokens);
  if (!rawTokens) {
    console.log("Cannot send notification to user as cannot find user");
    return;
  }
  const tokens = rawTokens as string[];
  await sendToAllToken(title, tokens);
}

export async function sendToAllToken(title: string, tokens: string[]) {
  await Promise.all(tokens.map( async (token) => {
    await sendCloudMessage(title, token);
  }));
}

export async function sendCloudMessage(title: string, registrationToken: string) {
  try {
    const cloudMessage = {
      notification: {
        title: title,
      },
      token: registrationToken,
    };

    await cloudMessageAdmin.send(cloudMessage);
  } catch (e) {
    console.log(e);
  }
}
