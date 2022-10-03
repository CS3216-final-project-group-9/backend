import * as functions from "firebase-functions";
import {db} from "../firebase";
import {Post} from "../type/post";

export const createPost = functions.https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https
          .HttpsError("unauthenticated", "User ID cannot be determined");
    }
    const newPost = data.post as Post;
    await db.posts.doc(newPost.id).create(newPost);
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
    await db.posts.doc(newPost.id).set(newPost);
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
        postSnapshot.forEach((doc) => {
          posts.push(doc.data());
        });
        return {success: true, message: posts};
      } catch (e) {
        return {success: false, message: String(e)};
      }
    });

export const getAppliedPosts = functions.https.onCall((data, context) => {
  // ...
});

export const getCreatedPosts = functions.https.onCall((data, context) => {
  // ...
});
