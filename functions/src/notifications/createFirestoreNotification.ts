
import {db} from "../firebase";
import {FirestoreCustomNotification} from "../type/firebase-type";
import {NotificationType} from "../type/notification";


export async function addAppliedToPostNotification(postId:string, posterId: string, applicantId:string, title: string) {
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
  };
  await ref.set(newNotification);
}

export async function addDeletePostApplicationNotification(userId: string, title: string) {
  const ref = db.notifications.doc();
  const newNotification: FirestoreCustomNotification = {
    id: ref.id,
    type: NotificationType.GENERIC_MESSAGE,
    userId: userId,
    title: title,
    hasBeenViewed: false,
  };
  await ref.set(newNotification);
}


