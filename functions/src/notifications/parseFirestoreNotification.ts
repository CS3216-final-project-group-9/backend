import {getUserArt} from "../art";
import {db} from "../firebase";
import {createAppliedRequest, createCreatedRequest} from "../posts/getCustomPost";
import {FirestoreCustomAppliedRequest, FirestoreCustomCreatedRequest, FirestoreCustomNotification, FirestoreCustomOldPost} from "../type/firebase-type";
import {BuddyNotificationType, Notification} from "../type/notification";
import {parseUserFromFirestore} from "../utils/type-converter";


export async function parseFirestoreNotification(firestoreNotification:FirestoreCustomNotification) {
  switch (firestoreNotification.type) {
    case BuddyNotificationType.ACCEPTED_YOUR_APPLICATION:
      return await parseAcceptedApplicationNotification(firestoreNotification);
    case BuddyNotificationType.APPLIED_TO_YOUR_POST:
      return await parseCreateDApplicationNotification(firestoreNotification);
    case BuddyNotificationType.CANCELLED_THEIR_APPLICATION:
      return await parseCreateDApplicationNotification(firestoreNotification);
    case BuddyNotificationType.GENERIC_MESSAGE:
      return await parseGenericNotification(firestoreNotification);
    case BuddyNotificationType.DELETED_POST_YOU_APPLIED_FOR:
      return await parseDeletePostApplicationNotification(firestoreNotification);
    case BuddyNotificationType.RECEIVED_NEW_ART:
      return await parseReceiveArtNotification(firestoreNotification);
    default:
      return null;
  }
}

async function parseAcceptedApplicationNotification(firestoreNotification:FirestoreCustomNotification) {
  if (!firestoreNotification.data) return null;
  const appliedData = firestoreNotification.data as FirestoreCustomAppliedRequest;
  const applicationQuery = await db.applicants.where("postId", "==", appliedData.postId).where("userId", "==", appliedData.userId).get();

  if (applicationQuery.size !== 1) return null;
  const applicationDoc = applicationQuery.docs[0];
  const firestoreApplicant = applicationDoc.data();

  const appliedRequest = await createAppliedRequest(firestoreApplicant.postId, firestoreApplicant.status);

  if (!appliedRequest) return null;

  const notification: Notification = {
    id: firestoreNotification.id,
    type: BuddyNotificationType.ACCEPTED_YOUR_APPLICATION,
    hasBeenViewed: firestoreNotification.hasBeenViewed,
    title: firestoreNotification.title ? firestoreNotification.title:undefined,
    data: appliedRequest,
    otherUser: appliedRequest.post.poster,
  };
  return notification;
}

async function parseCreateDApplicationNotification(firestoreNotification:FirestoreCustomNotification) {
  if (!firestoreNotification.data) return null;
  if (!firestoreNotification.otherUserId) return null;
  const createdData = firestoreNotification.data as FirestoreCustomCreatedRequest;
  const firestorePostDoc = await db.posts.doc(createdData.postId).get();
  const firestorePost = firestorePostDoc.data();
  if (!firestorePost) return null;
  const createdRequest = await createCreatedRequest(firestorePost);
  const applicantDoc = await db.users.doc(firestoreNotification.otherUserId).get();
  const applicant = applicantDoc.data();

  const notification: Notification = {
    id: firestoreNotification.id,
    type: firestoreNotification.type,
    hasBeenViewed: firestoreNotification.hasBeenViewed,
    title: firestoreNotification.title,
    data: createdRequest,
    otherUser: applicant,
  };
  return notification;
}

async function parseGenericNotification(firestoreNotification:FirestoreCustomNotification) {
  if (!firestoreNotification.data) return null;
  const message = firestoreNotification.data as string;
  const notification: Notification = {
    id: firestoreNotification.id,
    type: firestoreNotification.type,
    hasBeenViewed: firestoreNotification.hasBeenViewed,
    title: firestoreNotification.title,
    data: message,
  };
  return notification;
}

async function parseReceiveArtNotification(firestoreNotification:FirestoreCustomNotification) {
  const notification: Notification = {
    id: firestoreNotification.id,
    type: firestoreNotification.type,
    hasBeenViewed: firestoreNotification.hasBeenViewed,
    title: firestoreNotification.title,
    data: "",
  };
  return notification;
}

async function parseDeletePostApplicationNotification(firestoreNotification:FirestoreCustomNotification) {
  if (!firestoreNotification.otherUserId) return null;
  const userDoc = await db.users.doc(firestoreNotification.otherUserId).get();
  const art = await getUserArt(firestoreNotification.otherUserId);
  const firestoreUser = userDoc.data();
  if (!firestoreUser) return null;
  if (!firestoreNotification.data) return null;

  const postObj = firestoreNotification.data as FirestoreCustomOldPost;
  if (!postObj) return null;

  const user = parseUserFromFirestore(firestoreUser, art);
  const notification: Notification = {
    id: firestoreNotification.id,
    type: firestoreNotification.type,
    hasBeenViewed: firestoreNotification.hasBeenViewed,
    title: firestoreNotification.title,
    otherUser: user,
    data: postObj.post,
  };
  return notification;
}
