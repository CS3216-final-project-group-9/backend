import * as users from "./users";
import * as participants from "./participants";
import * as posts from "./posts";


// Users
export const createUser = users.createUser;
export const updateUser = users.updateUser;

export const getUser = users.getUser;
export const getCurrentUser = users.getCurrentUser;
export const hasCreatedUserProfile = users.hasCreatedUserProfile;


// Posts
export const createPost = posts.createPost;
export const deletePost = posts.deletePost;
export const updatePost = posts.updatePost;
export const getPost = posts.getPost;
export const getAllActivePosts = posts.getAllActivePosts;
export const getAppliedPosts = posts.getAppliedPosts;
export const getCreatedPosts = posts.getCreatedPosts;


// Participants
export const createPostApplication = participants.createPostApplication;
export const responsePostApplication = participants.responsePostApplication;
export const deletePostApplication = participants.deletePostApplication;

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
