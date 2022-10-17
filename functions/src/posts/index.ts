import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/https";
import moment = require("moment-timezone");
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomPost} from "../type/firebase-type";
import {Post, PostLocation} from "../type/post";
import {
  AppliedRequest,
  AppliedRequestStatus,
  CreatedRequest,
} from "../type/postApplication";
import {User} from "../type/user";
import {notifyParticipantsHostCancelled, notifyPosterPostCreated} from "../utils/email";
import {
  parsePostToFirestore,
  parseUserFromFirestore,
} from "../utils/type-converter";
import {
  getPostsFromSnapshot,
  getPostFromFirestorePost,
} from "./firestorePost";
import * as CustomErrorCode from "../utils/errorCode";


const POST_PER_PAGE = 20;

export const createPost = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const userDoc = await db.users.doc(uid).get();
    const firestoreUser = userDoc.data();
    if (!firestoreUser) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.CURRENT_USER_PROFILE_NOT_IN_DB);
    }
    const user = parseUserFromFirestore(firestoreUser);

    const {post: postRaw} = data;

    if (!postRaw) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.POST_OBJECT_INPUT_NOT_FOUND);
    }
    const ref = db.posts.doc();
    const docId = ref.id;
    const fortnightAway = new Date(Date.now() + 12096e5);
    const startDate = moment(postRaw.startDateTime).toDate();

    if (startDate >= fortnightAway) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.DATE_MORE_THAN_14_FROM_NOW);
    }

    const newPost: Post = {
      id: docId,
      poster: user,
      startDateTime: postRaw.startDateTime,
      endDateTime: postRaw.endDateTime,
      participants: [],
      location: postRaw.location as PostLocation,
      description: postRaw.description as string,
    };

    if (newPost.description.length > 200) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.DESCRIPTION_TOO_LONG);
    }

    const momentNow = moment();
    const momentEnd = moment(newPost.endDateTime);
    const momentStart = moment(newPost.startDateTime);
    if (momentStart.isBefore(momentNow)) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.START_TIME_NOT_FUTURE);
    }
    if (momentStart.isAfter(momentEnd)) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.START_TIME_AFTER_END_TIME);
    }

    const parsedPost = parsePostToFirestore(newPost);
    await ref.set(parsedPost);

    // Email notifications
    await notifyPosterPostCreated(newPost);

    return {success: true, message: "Post created successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const deletePost = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const postId = data.postId as string;
    if (!postId) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.POST_ID_INPUT_NOT_FOUND);
    }
    const postDoc = await db.posts.doc(postId).get();
    const firestorePost = postDoc.data();

    if (!firestorePost) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.POST_NOT_IN_DB);
    }

    if (uid != firestorePost.posterId) {
      throw new functions.https
          .HttpsError("permission-denied", CustomErrorCode.USER_NOT_POST_AUTHOR);
    }

    await db.posts.doc(postId).delete();

    const emailedApplicantDoc = await db.applicants.where("postId", "==", postId)
        .where("status", "in", [AppliedRequestStatus.ACCEPTED, AppliedRequestStatus.PENDING])
        .get();

    const emailedApplicants: User[] = [];
    await Promise.all(emailedApplicantDoc.docs.map(async (applicantDoc) => {
      const applicant = applicantDoc.data();
      const user = await db.users.doc(applicant.userId).get();
      const docData = user.data();
      if (docData) {
        emailedApplicants.push(parseUserFromFirestore(docData));
      }
    }));
    const batch = unTypedFirestore.batch();

    const applicantDoc = await db.applicants.where("postId", "==", postId).get();

    applicantDoc.forEach((doc) => {
      batch.delete(doc.ref);
    });


    await batch.commit();

    // Email notification
    const post = await getPostFromFirestorePost(firestorePost);
    await notifyParticipantsHostCancelled(post, emailedApplicants);


    return {success: true, message: "Post deleted successfully"};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const getExplorePost = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const {page: pageRaw, location: locationRaw} = data;
    const page = pageRaw ? pageRaw as number: null;
    const location = locationRaw? locationRaw as PostLocation[]: null;

    if (!page) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.PAGE_INPUT_NOT_FOUND);
    }
    if (!location) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.LOCATION_INPUT_NOT_FOUND);
    }

    const uid = context.auth?.uid;
    let postSnapshot: FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>;
    const date = new Date();
    if (uid) {
      if (location.length == 0) {
        postSnapshot = await db.posts.orderBy("endDateTime").where("endDateTime", ">=", date)
            .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      } else {
        postSnapshot = await db.posts.orderBy("endDateTime").where("endDateTime", ">=", date).where("location", "in", location)
            .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      }
    } else {
      if (location.length == 0) {
        postSnapshot = await db.posts.orderBy("endDateTime").where("endDateTime", ">=", date).startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      } else {
        postSnapshot = await db.posts.orderBy("endDateTime").where("endDateTime", ">=", date).where("location", "in", location)
            .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      }
    }

    const posts = await (await getPostsFromSnapshot(postSnapshot, uid?? "")).filter((post) => post.poster.id !== uid);
    return {success: true, message: posts};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});


export const getAppliedPosts = functions.region("asia-southeast2").https.onCall( async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const applicants = await db.applicants.where("userId", "==", uid).get();

    const appliedRequests: AppliedRequest[] = [];
    await Promise.all(applicants.docs.map( async (applicantDoc) => {
      const applicant = applicantDoc.data();
      const postDoc = await db.posts.doc(applicant.postId).get();
      const firestorePost =postDoc.data();
      if (firestorePost) {
        const post = await getPostFromFirestorePost(firestorePost);
        const todayDate = moment();
        const isBefore = moment(post.startDateTime).isBefore(todayDate, "day");
        if (!isBefore) {
          appliedRequests.push({
            status: applicant.status,
            post: post,
          });
        }
      }
    }));

    // Accepted first, pending second, normal third
    const sorted = appliedRequests.sort((a, b) => a.status - b.status);
    return {success: true, message: sorted};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const getCreatedPosts = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }
    const userDoc = await db.users.doc(uid).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https
          .HttpsError("not-found", CustomErrorCode.CURRENT_USER_PROFILE_NOT_IN_DB);
    }
    const todayDate = moment().startOf("day");

    const firestorePosts= await db.posts.where("posterId", "==", uid).where("endDateTime", ">=", todayDate).get();
    const createdRequests: CreatedRequest[] = [];
    await Promise.all(firestorePosts.docs.map( async (postDoc) => {
      const firestorePost = postDoc.data();
      const post = await getPostFromFirestorePost(firestorePost);

      const participantsDoc = await db.applicants
          .where("postId", "==", firestorePost.id).where("status", "==", AppliedRequestStatus.PENDING).get();
      const applicants: User[] = [];
      await Promise.all(participantsDoc.docs.map(async (participantDoc) => {
        const applicant = participantDoc.data();
        const applicantDoc = await db.users.doc(applicant.userId).get();
        const app = applicantDoc.data();
        if (app) applicants.push(parseUserFromFirestore(app));
      }));

      createdRequests.push({
        post: post,
        applicants: applicants,
      });
    }));
    // those with most number of applicants will show first
    const sorted = createdRequests.sort((a, b) => {
      return b.applicants.length - a.applicants.length;
    });
    return {success: true, message: sorted};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});
