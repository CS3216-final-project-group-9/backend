import * as functions from "firebase-functions";
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomApplicant} from "../type/firebase-type";
import {AppliedRequestStatus} from "../type/postApplication";
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

    const participant = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();

    if (participant.size > 0) {
      throw new functions.https
          .HttpsError("already-exists", "User already applied for this post");
    }

    const {user, post} = await getParticipantAndPost(uid, postId);


    const newApplication: FirestoreCustomApplicant = {
      userId: uid,
      status: AppliedRequestStatus.PENDING,
      postId: postId,
      updatedTime: new Date(),
    };
    // Add post application
    await db.applicants.doc().set(newApplication);

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

    const participant = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();

    if (participant.size > 0) {
      throw new functions.https
          .HttpsError("already-exists", "User already applied for this post");
    }

    const application = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();

    const batch = unTypedFirestore.batch();

    application.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Email notification
    const {post} = await getParticipantAndPost(uid, postId);
    await notifyPosterApplicantCancelled(post);


    return {success: true, message: "Delete application to post successfully"};
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
    const responseStatus = responseRaw as AppliedRequestStatus;
    if (!postId || !applicantId) {
      throw new functions.https
          .HttpsError("invalid-argument", "Not enough argument");
    }

    const {user: participant, post} = await getParticipantAndPost(applicantId, postId);


    const postDoc = await db.posts.doc(postId).get();

    if (uid != postDoc.data()?.posterId) {
      throw new functions.https
          .HttpsError("permission-denied", "User is not post author");
    }

    const applicationDoc = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();

    if (applicationDoc.size == 0) {
      throw new functions.https
          .HttpsError("not-found", "User is not participanting in post");
    }

    if (responseStatus == AppliedRequestStatus.ACCEPTED) {
      await notifyParticipantHostAccepted(post, participant);
    } else if (responseStatus == AppliedRequestStatus.REJECTED) {
      await notifyParticipantHostCancelled(post, participant);
    }


    const batch = unTypedFirestore.batch();
    applicationDoc.forEach((doc) => {
      batch.set(doc.ref, {
        userId: applicantId,
        postId: postId,
        status: responseStatus,
        updatedTime: new Date(),
      });
    });

    await batch.commit();


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
