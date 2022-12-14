import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/https";
import moment = require("moment-timezone");
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomPost} from "../type/firebase-type";
import {Post, PostLocation, PostsFilter} from "../type/post";
import {AppliedRequestStatus} from "../type/postApplication";
import {User} from "../type/user";
import {notifyParticipantsHostCancelled, notifyPosterPostCreated} from "../utils/email";
import {
  parsePostToFirestore,
  parseUserFromFirestore,
} from "../utils/type-converter";
import {
  getExplorePostsFromSnapshot,
  getPostFromFirestorePost,
} from "./firestorePost";
import * as CustomErrorCode from "../utils/errorCode";
import {getAppliedPostsFromFirestore, getCreatedPostsFromFirestore} from "./getCustomPost";
import {addDeletePostApplicationNotification, getTokensAndSendMessage} from "../notifications/createFirestoreNotification";
import {generateImage} from "../texttoimage";
import {AIImageTrigger} from "../type/ImageTrigger";
import {getUserArt} from "../art";


const POST_PER_PAGE = 20;

export const createPost = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const userDoc = await db.users.doc(uid).get();
    const art = await getUserArt(uid);
    const firestoreUser = userDoc.data();
    if (!firestoreUser) {
      throw new functions.https.HttpsError("not-found", CustomErrorCode.CURRENT_USER_PROFILE_NOT_IN_DB);
    }
    const user = parseUserFromFirestore(firestoreUser, art);

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

    const momentNow = moment().subtract(5, 'minute'); // 5 minutes buffer for validation check
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
    const promises = [notifyPosterPostCreated(newPost), generateImage(user.id, AIImageTrigger.CREATED_POST, ref.id)];
    await Promise.all(promises);
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

    const post = await getPostFromFirestorePost(firestorePost);

    await db.posts.doc(postId).delete();

    const emailedApplicantDoc = await db.applicants.where("postId", "==", postId)
        .where("status", "in", [AppliedRequestStatus.ACCEPTED, AppliedRequestStatus.PENDING])
        .get();

    const emailedApplicants: User[] = [];
    await Promise.all(emailedApplicantDoc.docs.map(async (applicantDoc) => {
      const applicant = applicantDoc.data();
      const promises = await Promise.all([db.users.doc(applicant.userId).get(), getUserArt(applicant.userId)]);
      const user = promises[0];
      const art = promises[1];
      const docData = user.data();
      if (docData) {
        emailedApplicants.push(parseUserFromFirestore(docData, art));
      }
    }));
    const batch = unTypedFirestore.batch();

    const applicantDoc = await db.applicants.where("postId", "==", postId).get();
    const applicantMessage = "The study session you applied for has been cancelled";

    const promises: any[] = [];
    applicantDoc.forEach((doc) => {
      const applicantData = doc.data();

      promises.push(getTokensAndSendMessage(applicantData.userId, applicantMessage));
      promises.push(addDeletePostApplicationNotification(post, post.poster.id, applicantData.userId, applicantMessage));
      batch.delete(doc.ref);
    });
    promises.push(batch.commit());
    await Promise.all(promises);
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
    const {page: pageRaw, filter: filterRaw} = data;
    const page = pageRaw ? pageRaw as number: null;
    let filter = filterRaw as PostsFilter;

    if (!page) {
      throw new functions.https
          .HttpsError("invalid-argument", CustomErrorCode.PAGE_INPUT_NOT_FOUND);
    }
    if (!filter) {
      filter = {
        days: [],
        timesOfDay: [],
        locations: [],
      };
    }

    const uid = context.auth?.uid;
    let postSnapshot: FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>;
    const date = new Date();
    if (filter.locations.length == 0) {
      postSnapshot = await db.posts.where("endDateTime", ">=", date).orderBy("endDateTime").get();
    } else {
      postSnapshot = await db.posts.where("endDateTime", ">=", date).where("location", "in", filter.locations)
          .orderBy("endDateTime").get();
    }
    console.log(192, filter);
    const posts = await (await getExplorePostsFromSnapshot(postSnapshot, uid?? "", filter)).filter((post) => post.poster.id !== uid);

    const pagedPosts = paginate(posts, POST_PER_PAGE, page);
    return {success: true, message: pagedPosts};
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

    const appliedRequests = await getAppliedPostsFromFirestore(applicants);

    // Accepted first, pending second, normal third
    // If same, then sort by date
    const sorted = appliedRequests.sort((a, b) => {
      const statusDiff = a.status - b.status;
      if (statusDiff !== 0) {
        return statusDiff;
      }
      const aStart = moment(a.post.startDateTime);
      const bStart = moment(b.post.startDateTime);
      return aStart.isBefore(bStart, "minute") ? -1 : 1;
    });
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
    const createdRequests = await getCreatedPostsFromFirestore(firestorePosts);
    // those with applicants will show first, followed by those with accepted applicants, followed by those sorted by date
    const sorted = createdRequests.sort((a, b) => {
      const aHasApplicants = a.applicants.length > 0;
      const bHasApplicants = b.applicants.length > 0;
      if (aHasApplicants && !bHasApplicants) {
        return -1;
      } else if (bHasApplicants && !aHasApplicants) {
        return 1;
      }
      const aHasParticipants = a.post.participants.length > 0;
      const bHasParticipants = b.post.participants.length > 0;
      if (aHasParticipants && !bHasParticipants) {
        return -1;
      } else if (bHasParticipants && !aHasParticipants) {
        return 1;
      }
      const aDateOfStudy = moment(a.post.startDateTime);
      const bDateOfStudy = moment(b.post.startDateTime);
      return aDateOfStudy.isBefore(bDateOfStudy, "minute") ? -1 : 1;
    });
    return {success: true, message: sorted};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});


function paginate(array: Array<Post>, pageSize:number, pageNumber:number) {
  // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
  return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}
