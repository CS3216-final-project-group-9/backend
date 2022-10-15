import * as functions from "firebase-functions";
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomApplicant, FirestoreCustomPost, FirestoreCustomUser} from "../type/firebase-type";
import {AppliedRequestStatus} from "../type/postApplication";
import {notifyApplicantSessionApplied, notifyParticipantHostAccepted, notifyParticipantHostCancelled, notifyPosterApplicantCancelled, notifyPosterHasNewApplicant} from "../utils/email";
import {parseUserFromFirestore} from "../utils/type-converter";
import {getPostFromFirestorePost} from "../posts/firestorePost";
import {HttpsError} from "firebase-functions/v1/https";

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
          .HttpsError("invalid-argument", "Post Id not provided");
    }

    const participant = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();

    if (participant.size > 0) {
      throw new functions.https
          .HttpsError("already-exists", "User already applied for this post");
    }

    const {user, post} = await getParticipantAndPost(uid, postId);
    if (post.poster.id === uid) {
      throw new functions.https
          .HttpsError("invalid-argument", "User is post creator");
    }


    const newApplication: FirestoreCustomApplicant = {
      userId: uid,
      status: AppliedRequestStatus.PENDING,
      postId: postId,
      updatedTime: new Date(),
    };
    // Add post application
    await db.applicants.doc().set(newApplication);
    // Email notifications
    const promises = [notifyPosterHasNewApplicant(post), notifyApplicantSessionApplied(post, user)];
    await Promise.all(promises);
    return {success: true, message: "Applied to post successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
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
    const participants = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();
    if (participants.size !== 1) {
      throw new functions.https
          .HttpsError("not-found", "Cannot find post application");
    }
    const batch = unTypedFirestore.batch();

    participants.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    await notifyPosterApplicantCancelled(post);
    return {success: true, message: "Delete application to post successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
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

    const applicationQuery = await db.applicants.where("postId", "==", postId).where("userId", "==", applicantId).get();

    if (applicationQuery.size !== 1) {
      throw new functions.https
          .HttpsError("not-found", "User is not participanting in post");
    }
    const applicationDoc = applicationQuery.docs[0];
    if (applicationDoc.data().status === responseStatus) {
      throw new functions.https
          .HttpsError("not-found", "No change in status");
    }
    await applicationDoc.ref.update({
      status: responseStatus,
    });

    if (responseStatus == AppliedRequestStatus.ACCEPTED) {
      await notifyParticipantHostAccepted(post, participant);
    } else if (responseStatus == AppliedRequestStatus.REJECTED) {
      await notifyParticipantHostCancelled(post, participant);
    }
    return {success: true,
      message: "Response to applicant successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

async function getParticipantAndPost(userId:string, postId: string) {
  const promises = [db.posts.doc(postId).get(), db.users.doc(userId).get()];
  const docs = await Promise.all(promises);
  const postDoc = docs[0];
  const userDoc = docs[1];
  if (!postDoc.exists || !userDoc.exists) {
    throw new functions.https
        .HttpsError("not-found", "Could not find post or user");
  }
  const firestorePost = postDoc.data() as FirestoreCustomPost;
  if (!firestorePost) {
    throw new functions.https
        .HttpsError("not-found", "Could not find post");
  }

  const firestoreUser = userDoc.data() as FirestoreCustomUser;
  if (!firestoreUser) {
    throw new functions.https
        .HttpsError("not-found", "Could not find user");
  }
  const post = await getPostFromFirestorePost(firestorePost);
  const user = parseUserFromFirestore(firestoreUser);
  return {user, post};
}
