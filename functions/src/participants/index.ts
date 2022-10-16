import * as functions from "firebase-functions";
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomApplicant, FirestoreCustomPost, FirestoreCustomUser} from "../type/firebase-type";
import {AppliedRequestStatus} from "../type/postApplication";
import {notifyApplicantSessionApplied, notifyParticipantHostAccepted, notifyParticipantHostCancelled, notifyPosterApplicantCancelled, notifyPosterHasNewApplicant} from "../utils/email";
import {parseUserFromFirestore} from "../utils/type-converter";
import {getPostFromFirestorePost} from "../posts/firestorePost";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";

export const createPostApplication = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const {postId: postIdRaw} = data;
    const postId = postIdRaw? postIdRaw as string : null;
    if (!postId) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.POST_ID_INPUT_NOT_FOUND);
    }

    const participant = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();

    if (participant.size > 0) {
      throw new functions.https
          .HttpsError("already-exists", CustomErrorCode.DUPLICATE_APPLICATION_CREATION);
    }

    const {user, post} = await getParticipantAndPost(uid, postId);
    if (post.poster.id === uid) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.USER_IS_ALREADY_POST_AUTHOR);
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

export const deletePostApplication = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const {postId: postIdRaw} = data;
    const postId = postIdRaw? postIdRaw as string : null;
    if (!postId) {
      throw new functions.https
          .HttpsError("not-found", CustomErrorCode.POST_ID_INPUT_NOT_FOUND);
    }
    const {post} = await getParticipantAndPost(uid, postId);
    const participants = await db.applicants.where("postId", "==", postId).where("userId", "==", uid).get();
    if (participants.size !== 1) {
      throw new functions.https
          .HttpsError("not-found", CustomErrorCode.APPLICANT_NOT_IN_DB);
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

export const responsePostApplication = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const {postId: postIdRaw,
      userId: userIdRaw,
      responseStatus: responseRaw} = data;
    const postId = postIdRaw? postIdRaw as string : null;
    const applicantId = userIdRaw? userIdRaw as string : null;
    const responseStatus = responseRaw as AppliedRequestStatus;
    if (!postId) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.POST_ID_INPUT_NOT_FOUND);
    }

    if (!applicantId) {
      throw new functions.https.HttpsError("invalid-argument", CustomErrorCode.APPLICANT_ID_INPUT_NOT_FOUND);
    }

    const {user: participant, post} = await getParticipantAndPost(applicantId, postId);
    const postDoc = await db.posts.doc(postId).get();

    if (uid != postDoc.data()?.posterId) {
      throw new functions.https
          .HttpsError("permission-denied", CustomErrorCode.USER_NOT_POST_AUTHOR);
    }

    const applicationQuery = await db.applicants.where("postId", "==", postId).where("userId", "==", applicantId).get();

    if (applicationQuery.size !== 1) {
      throw new functions.https
          .HttpsError("not-found", CustomErrorCode.USER_NOT_IN_PARTICIPANT_LIST);
    }
    const applicationDoc = applicationQuery.docs[0];
    if (applicationDoc.data().status === responseStatus) {
      throw new functions.https
          .HttpsError("not-found", CustomErrorCode.NO_APPLICATION_STATUS_CHANGE);
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
        .HttpsError("not-found", CustomErrorCode.USER_AND_POST_NOT_IN_DB);
  }
  const firestorePost = postDoc.data() as FirestoreCustomPost;
  if (!firestorePost) {
    throw new functions.https
        .HttpsError("not-found", CustomErrorCode.POST_NOT_IN_DB);
  }

  const firestoreUser = userDoc.data() as FirestoreCustomUser;
  if (!firestoreUser) {
    throw new functions.https
        .HttpsError("not-found", CustomErrorCode.USER_NOT_IN_DB);
  }
  const post = await getPostFromFirestorePost(firestorePost);
  const user = parseUserFromFirestore(firestoreUser);
  return {user, post};
}
