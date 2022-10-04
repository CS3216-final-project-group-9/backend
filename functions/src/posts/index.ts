import * as functions from "firebase-functions";
import {db} from "../firebase";
import {FirestoreCustomPost,
  FirestoreCustomUser} from "../type/firebase-type";
import {Post} from "../type/post";
import {parsePostFromFirestore,
  parsePostToFirestore} from "../utils/type-converter";

export const createPost = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const newPost = data.post as Post;
    const parsedPost = parsePostToFirestore(newPost);

    await db.posts.doc(newPost.id).create(parsedPost);
    return {success: true, message: "Post created successfully"};
  } catch (e) {
    return {success: false, message: String(e)};
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
    const post = await db.posts.doc(postId).get();
    if (uid == post.data()?.posterId) {
      await db.posts.doc(postId).delete();
    }
    return {success: true, message: "Post deleted successfully"};
  } catch (e) {
    return {success: false, message: String(e)};
  }
});

export const updatePost = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const newPost = data.post as Post;
    const parsedPost = parsePostToFirestore(newPost);
    await db.posts.doc(newPost.id).create(parsedPost);
    return {success: true, message: "Post updated successfully"};
  } catch (e) {
    return {success: false, message: String(e)};
  }
});

export const getPost = functions.https.onCall((data, context) => {
  // ...
});

export const getAllActivePosts = functions
    .https.onCall(async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }
        const postSnapshot = await db.posts.get();
        const posts : Post[] = [];
        await Promise.all(postSnapshot.docs.map( async (doc) => {
          const firestorePost = doc.data();
          const post = await getPostFromFirestorePost(firestorePost);
          posts.push(post);
        }));

        return {success: true, message: posts};
      } catch (e) {
        return {success: false, message: String(e)};
      }
    });

export const getAppliedPosts = functions.https.onCall(async (data, context) => {
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
          .HttpsError("aborted", "Cannot fetch user data");
    }
    const firestorePosts : FirestoreCustomPost[] = [];

    await Promise.all(user.participatedPostIds.map( async (postId) => {
      const firestorePostDoc = await db.posts.doc(postId).get();
      const firestorePost = firestorePostDoc.data();
      if (firestorePost)firestorePosts.push(firestorePost);
    }));

    const posts: Post[] = [];
    await Promise.all(firestorePosts.map( async (firestorePost) => {
      const post = await getPostFromFirestorePost(firestorePost);
      posts.push(post);
    }));

    return {success: true, message: posts};
  } catch (e) {
    return {success: false, message: String(e)};
  }
});

export const getCreatedPosts = functions
    .https.onCall(async (data, context) => {
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
              .HttpsError("aborted", "Cannot fetch user data");
        }
        const firestorePosts : FirestoreCustomPost[] = [];

        await Promise.all(user.createdPostIds.map( async (postId) => {
          const firestorePostDoc = await db.posts.doc(postId).get();
          const firestorePost = firestorePostDoc.data();
          if (firestorePost)firestorePosts.push(firestorePost);
        }));

        const posts: Post[] = [];
        await Promise.all(firestorePosts.map( async (firestorePost) => {
          const post = await getPostFromFirestorePost(firestorePost);
          posts.push(post);
        }));

        return {success: true, message: posts};
      } catch (e) {
        return {success: false, message: String(e)};
      }
    });


async function getPostFromFirestorePost(firestorePost: FirestoreCustomPost) {
  const posterDoc = await db.users.doc(firestorePost.posterId).get();
  const poster = posterDoc.data();
  if (!poster) {
    throw new functions.https
        .HttpsError("aborted", "Cannot fetch user data");
  }
  const participants: FirestoreCustomUser[] = [];

  await Promise.all(firestorePost.participantIds.map(async (id) => {
    const user = await db.users.doc(id).get();
    const docData = user.data();
    if (!docData) {
      throw new functions.https
          .HttpsError("aborted", "Cannot fetch user data");
    }
    participants.push(docData);
  }));
  return parsePostFromFirestore(firestorePost, poster, participants);
}
