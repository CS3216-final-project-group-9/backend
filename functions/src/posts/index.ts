import {FieldValue} from "firebase-admin/firestore";
import * as functions from "firebase-functions";
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
  getAllPostsFromFirestorePosts,
  getFirestorePostsFromId,
  getFirestorePostsFromSnapshot,
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

    const {post: postRaw} = data

    if(!postRaw) {
      throw new functions.https
          .HttpsError("invalid-argument", "Post Object is not provided");
    }
    const newPost = postRaw as Post;
    const parsedPost = parsePostToFirestore(newPost);
    const ref = db.posts.doc();
    const docId = ref.id;
    parsedPost.id = docId;
    await ref.set(parsedPost);

    await unTypedFirestore.collection("users").doc(uid).set({
      createdPostIds: FieldValue.arrayUnion(docId),
    });

    // Email notifications
    await notifyPosterPostCreated(newPost);

    return {success: true, message: "Post created successfully"};
  } catch (e) {
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
    await unTypedFirestore.collection("users").doc(uid).set({
      createdPostIds: FieldValue.arrayRemove(postId),
    });

    // Email notification
    const post = await getPostFromFirestorePost(firestorePost);
    await notifyParticipantsHostCancelled(post);


    return {success: true, message: "Post deleted successfully"};
  } catch (e) {
    return {success: false, message: e};
  }
});

export const updatePost = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;

    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const {post: postRaw} = data

    if(!postRaw) {
      throw new functions.https
          .HttpsError("invalid-argument", "Post Object is not provided");
    }

    const updatePost = postRaw as Post;
    const parsedPost = parsePostToFirestore(updatePost);
    const post = await db.posts.doc(parsedPost.id).get();
    if (uid != post.data()?.posterId) {
      throw new functions.https
          .HttpsError("permission-denied", "User is not post author");
    }
    await db.posts.doc().set(parsedPost);


    return {success: true, message: "Post updated successfully"};
  } catch (e) {
    return {success: false, message: e};
  }
});

export const getPost = functions.https.onCall(async (data, context) => {
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

    let postSnapshot: FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>;
    if (location.length == 0) {
      postSnapshot = await db.posts.orderBy("startDateTime")
          .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
    } else {
      postSnapshot = await db.posts.orderBy("startDateTime")
          .where("location", "in", location)
          .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
    }
    const posts = await getFirestorePostsFromSnapshot(postSnapshot);

    return {success: true, message: posts};
  } catch (e) {
    return {success: false, message: e};
  }
});

export const getAllActivePosts = functions.https.onCall(async (data, context) => {
  try {
    const postSnapshot = await db.posts.orderBy("startDateTime").get();
    const posts = await getFirestorePostsFromSnapshot(postSnapshot);

    return {success: true, message: posts};
  } catch (e) {
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


    const userDoc = await db.users.doc(uid).get();
    const user = userDoc.data();
    if (!user) {
      throw new functions.https
          .HttpsError("not-found", "Cannot fetch user data");
    }

    const {page: pageRaw} = data;
    const page = pageRaw ? pageRaw as number: null;
    if (!page) {
      throw new functions.https
          .HttpsError("invalid-argument", "Page is not provided");
    }
    const pagePostIds = user.participatedPostIds
        .slice((page - 1) * POST_PER_PAGE, page * POST_PER_PAGE);

    const firestorePosts = await getFirestorePostsFromId(pagePostIds);
    const posts = await getAllPostsFromFirestorePosts(firestorePosts);

    const appliedRequests: AppliedRequest[] = [];
    await Promise.all(posts.map( async (post) => {
      const participantDoc = await db.postParticipants(post.id)
          .doc(uid).get();
      const applyStatus = participantDoc.data()?.status;
      if (applyStatus) {
        appliedRequests.push({
          status: applyStatus,
          post: post,
        });
      }
    }));

    return {success: true, message: appliedRequests};
  } catch (e) {
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

    const {page: pageRaw} = data;
    const page = pageRaw ? pageRaw as number: null;
    if (!page) {
      throw new functions.https
          .HttpsError("invalid-argument", "Page is not provided");
    }
    const pagePostIds = user.createdPostIds
        .slice((page - 1) * POST_PER_PAGE, page * POST_PER_PAGE);

    const firestorePosts = await getFirestorePostsFromId(pagePostIds);

    const posts = await getAllPostsFromFirestorePosts(firestorePosts);

    const createdRequests: CreatedRequest[] = [];
    await Promise.all(posts.map( async (post) => {
      const participantsDoc = await db.postParticipants(post.id).get();

      const applicants: User[] = [];
      await Promise.all(participantsDoc.docs.map(async (participantDoc) => {
        const participant = participantDoc.data();
        if (participant.status == AppliedRequestStatus.PENDING) {
          const userDoc = await db.users.doc(participant.userId).get();
          const user = userDoc.data();
          if (user) applicants.push(parseUserFromFirestore(user));
        }
      }));
      createdRequests.push({
        post: post,
        applicants: applicants,
      });
    }));

    return {success: true, message: createdRequests};
  } catch (e) {
    return {success: false, message: e};
  }
});
