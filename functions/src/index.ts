import * as users from "./users";
import * as participants from "./participants";
import * as posts from "./posts";
import * as notification from "./notifications";

// Users
export const createUser = users.createUser;
export const updateUser = users.updateUser;

export const getUser = users.getUser;
export const getCurrentUser = users.getCurrentUser;
export const hasCreatedUserProfile = users.hasCreatedUserProfile;

// Posts
export const createPost = posts.createPost;
export const deletePost = posts.deletePost;
export const getExplorePost = posts.getExplorePost;
export const getAppliedPosts = posts.getAppliedPosts;
export const getCreatedPosts = posts.getCreatedPosts;


// Notifications
export const getNotifications = notification.getNotifications;
export const markNotificationRead = notification.markNotificationRead;


// Participants
export const createPostApplication = participants.createPostApplication;
export const responsePostApplication = participants.responsePostApplication;
export const deletePostApplication = participants.deletePostApplication;

