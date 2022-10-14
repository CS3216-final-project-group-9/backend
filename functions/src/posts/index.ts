import * as functions from "firebase-functions";
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

const POST_PER_PAGE = 20;

export const createPost = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }

    const userDoc = await db.users.doc(uid).get();
    const firestoreUser = userDoc.data();
    if (!firestoreUser) {
      throw new functions.https
          .HttpsError("not-found", "User not found in database");
    }
    const user = parseUserFromFirestore(firestoreUser);

    const {post: postRaw} = data;

    if (!postRaw) {
      throw new functions.https
          .HttpsError("invalid-argument", "Post Object is not provided");
    }
    const ref = db.posts.doc();
    const docId = ref.id;

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
          .HttpsError("invalid-argument", "Description is too long");
    }

    const momentStart = moment(newPost.startDateTime);
    const momentEnd = moment(newPost.endDateTime);
    const momentNow = moment();
    if (momentStart.isBefore(momentNow)) {
      throw new functions.https
          .HttpsError("invalid-argument", "Start time must be in the future");
    }
    if (momentStart.isAfter(momentEnd)) {
      throw new functions.https
          .HttpsError("invalid-argument", "Start time must be before end time");
    }

    const parsedPost = parsePostToFirestore(newPost);
    await ref.set(parsedPost);

    // Email notifications
    await notifyPosterPostCreated(newPost);

    return {success: true, message: "Post created successfully"};
  } catch (e) {
    console.error(e);
    return {success: false, message: e};
  }
});

export const deletePost = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const postId = data.postId as string;
    if (!postId) {
      throw new functions.https
          .HttpsError("invalid-argument", "Post Id not provided");
    }
    const postDoc = await db.posts.doc(postId).get();
    const firestorePost = postDoc.data();

    if (!firestorePost) {
      throw new functions.https.HttpsError("not-found", "Post not found");
    }

    if (uid != firestorePost.posterId) {
      throw new functions.https
          .HttpsError("permission-denied", "User is not post author");
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
    return {success: false, message: e};
  }
});

export const getExplorePost = functions.https.onCall(async (data, context) => {
  try {
    const {page: pageRaw, location: locationRaw} = data;
    const page = pageRaw ? pageRaw as number: null;
    const location = locationRaw? locationRaw as PostLocation[]: null;

    if (!page) {
      throw new functions.https
          .HttpsError("invalid-argument", "Page is not provided");
    }
    if (!location) {
      throw new functions.https
          .HttpsError("invalid-argument", "Location is not provided");
    }

    const uid = context.auth?.uid;
    let postSnapshot: FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>;
    const date = new Date();
    if (uid) {
      if (location.length == 0) {
        postSnapshot = await db.posts.orderBy("startDateTime").where("startDateTime", ">=", date)
            .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      } else {
        postSnapshot = await db.posts.orderBy("startDateTime").where("startDateTime", ">=", date).where("location", "in", location)
            .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      }
    } else {
      if (location.length == 0) {
        postSnapshot = await db.posts.orderBy("startDateTime").where("startDateTime", ">=", date).startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      } else {
        postSnapshot = await db.posts.orderBy("startDateTime").where("startDateTime", ">=", date).where("location", "in", location)
            .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
      }
    }

    const posts = await (await getPostsFromSnapshot(postSnapshot, uid?? "")).filter((post) => post.poster.id !== uid);
    return {success: true, message: posts};
  } catch (e) {
    console.error(e);
    return {success: false, message: e};
  }
});


export const getAppliedPosts = functions.https.onCall( async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
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
    return {success: false, message: e};
  }
});

export const getCreatedPosts = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const userDoc = await db.users.doc(uid).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https
          .HttpsError("not-found", "Cannot fetch user data");
    }
    const todayDate = moment().startOf("day");

    const firestorePosts= await db.posts.where("posterId", "==", uid).where("startDateTime", ">=", todayDate).get();
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
    return {success: false, message: e};
  }
});
