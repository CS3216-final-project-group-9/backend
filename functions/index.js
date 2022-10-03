// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
import * as users from "./users"
import * as  posts from "./posts"
import * as participants from "./participants"


// Users
exports.createUser = users.createUser;
exports.getUser = users.getUser;
exports.getCurrentUser = users.getCurrentUser;


// Posts
exports.createPost = posts.createPost;
exports.deletePost = posts.deletePost;
exports.getPost = posts.getPost;
exports.getAllActivePosts = posts.getAllActivePosts;
exports.getAllAppliedPosts = posts.getAppliedPosts;
exports.getAllCreatedPosts = posts.getCreatedPosts;


// Participants
exports.createPostApplication = participants.createPostApplication;
exports.responsePostApplication = participants.responsePostApplication;
exports.deletePostApplication = participants.deletePostApplication;
