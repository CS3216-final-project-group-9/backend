import * as functions from "firebase-functions";
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomParticipant} from "../type/firebase-type";
import {AppliedRequestStatus} from "../type/postApplication";
import {FieldValue} from "firebase-admin/firestore";
import {notifyApplicantSessionApplied, notifyParticipantHostAccepted, notifyParticipantHostCancelled, notifyPosterApplicantCancelled, notifyPosterHasNewApplicant} from "../utils/email";
import {parseUserFromFirestore} from "../utils/type-converter";
import {getPostFromFirestorePost} from "../posts/firestorePost";

export const createPostApplication = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }

    const {postId: postIdRaw} = data;
    const postId = postIdRaw? postIdRaw as string : null;
    if (!postId) {
      throw new functions.https
          .HttpsError("invalid-argument", "Post Id argument not provided");
    }

    const {user, post} = await getParticipantAndPost(uid, postId);


    const newApplication: FirestoreCustomParticipant = {
      userId: uid,
      status: AppliedRequestStatus.PENDING,
    };
    // Add post application
    await db.postParticipants(postId).doc(uid).set(newApplication);

    // Add post to user profile
    await unTypedFirestore.collection("users").doc(uid).set({
      appliedPostIds: FieldValue.arrayUnion(postId),
    });


    // Email notifications
    await notifyPosterHasNewApplicant(post);
    await notifyApplicantSessionApplied(post, user);


    return {success: true, message: "Applied to post successfully"};
  } catch (e) {
    return {success: false, message: e};
  }
}
);

export const deletePostApplication = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }

    const {postId: postIdRaw} = data;
    const postId = postIdRaw? postIdRaw as string : null;
    if (!postId) {
      throw new functions.https
          .HttpsError("not-found", "Cannot find post Id");
    }

    const {post} = await getParticipantAndPost(uid, postId);


    await unTypedFirestore.collection("users").doc(uid).set({
      appliedPostIds: FieldValue.arrayRemove(postId),
    });
    await db.postParticipants(postId).doc(uid).delete();

    // Email notification
    await notifyPosterApplicantCancelled(post);


    return {success: true,
      message: "Delete application to post successfully"};
  } catch (e) {
    return {success: false, message: e};
  }
});

export const responsePostApplication = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }

    const {postId: postIdRaw,
      userId: userIdRaw,
      responseStatus: responseRaw} = data;
    const postId = postIdRaw? postIdRaw as string : null;
    const applicantId = userIdRaw? userIdRaw as string : null;
    const responseStatus = responseRaw?
    responseRaw as AppliedRequestStatus: null;
    if (!postId || !applicantId || responseStatus == null) {
      throw new functions.https
          .HttpsError("invalid-argument", "Not enough argument");
    }

    const {user: participant, post} = await getParticipantAndPost(applicantId, postId);


    const postDoc = await db.posts.doc(postId).get();

    if (uid != postDoc.data()?.posterId) {
      throw new functions.https
          .HttpsError("permission-denied", "User is not post author");
    }

    if (responseStatus == AppliedRequestStatus.ACCEPTED) {
      await unTypedFirestore.collection("users").doc(uid).set({
        participatedPostIds: FieldValue.arrayUnion(postId),
      });
      await notifyParticipantHostAccepted(post, participant);
    } else if (responseStatus == AppliedRequestStatus.REJECTED) {
      await notifyParticipantHostCancelled(post, participant);
    }

    const updatedApplication: FirestoreCustomParticipant = {
      userId: uid,
      status: responseStatus,
    };
    await db.postParticipants(postId).doc(uid).set(updatedApplication);

    await unTypedFirestore.collection("users").doc(uid).set({
      participatedPostIds: FieldValue.arrayUnion(postId),
    });

    return {success: true,
      message: "Response to applicant successfully"};
  } catch (e) {
    return {success: false, message: e};
  }
});

async function getParticipantAndPost(userId:string, postId: string) {
  const postDoc = await db.posts.doc(postId).get();
  const firestorePost = postDoc.data();
  if (!firestorePost) {
    throw new functions.https
        .HttpsError("not-found", "Could not find post");
  }

  const userDoc = await db.users.doc(userId).get();
  const firestoreUser = userDoc.data();
  if (!firestoreUser) {
    throw new functions.https
        .HttpsError("not-found", "Could not find user");
  }
  const post = await getPostFromFirestorePost(firestorePost);
  const user = parseUserFromFirestore(firestoreUser);
  return {user, post};
}
