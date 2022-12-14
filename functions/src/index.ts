import * as users from "./users";
import * as participants from "./participants";
import * as posts from "./posts";
import * as notification from "./notifications";
import * as campaigns from "./campaigns";
import * as webhook from "./texttoimage/webhook";
import * as history from "./history";
import * as art from "./art";

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
export const markNotification = notification.markNotificationRead;
export const sendNotificationToken = notification.sendNotificationToken;
export const isUserAlreadyRegisteredForNotifications = notification.isUserAlreadyRegisteredForNotifications;


// Participants
export const createPostApplication = participants.createPostApplication;
export const responsePostApplication = participants.responsePostApplication;
export const deletePostApplication = participants.deletePostApplication;

// Campaigns
export const getUserCampaigns = campaigns.getUserCampaigns;
// Image webhook
export const storeImage = webhook.storeImage;


// History
export const getHistory = history.getHistory;


// Art
export const changeArtVisibility = art.changeArtVisibility;
export const deleteArt = art.deleteArt;
export const setCover = art.setCover;
