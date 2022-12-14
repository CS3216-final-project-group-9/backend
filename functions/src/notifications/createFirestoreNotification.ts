
import {cloudMessageAdmin, db} from "../firebase";
import {FirestoreCustomNotification} from "../type/firebase-type";
import {BuddyNotificationType} from "../type/notification";
import {Post} from "../type/post";


export async function addAppliedToPostNotification(postId:string, posterId: string, applicantId:string, title: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: BuddyNotificationType.APPLIED_TO_YOUR_POST,
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
    type: BuddyNotificationType.CANCELLED_THEIR_APPLICATION,
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
    type: BuddyNotificationType.ACCEPTED_YOUR_APPLICATION,
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
    type: BuddyNotificationType.GENERIC_MESSAGE,
    userId: userId,
    data: message,
    title: title,
    hasBeenViewed: false,
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}

export async function addReceiveArtNotification(userId: string, title: string, message: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: BuddyNotificationType.RECEIVED_NEW_ART,
    userId: userId,
    data: message,
    title: title,
    hasBeenViewed: false,
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}

export async function addDeletePostApplicationNotification(post:Post, posterId: string, applicantId:string, title: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: BuddyNotificationType.DELETED_POST_YOU_APPLIED_FOR,
    userId: applicantId,
    otherUserId: posterId,
    title: title,
    hasBeenViewed: false,
    data: {
      post: post,
    },
    updatedTime: new Date(),
  };
  await ref.set(newNotification);
}

export async function getTokensAndSendMessage( uid: string, title: string) {
  const userDoc = await db.users.doc(uid).get();
  const user = userDoc.data();
  const rawTokens = user?.tokens;
  if (!rawTokens) {
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
  } catch {
    console.log('error');
  }
}
