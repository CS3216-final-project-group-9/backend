import {FirestoreCustomCampaign, FirestoreCustomCampaignDetails, FirestoreCustomPost, FirestoreCustomUser} from "../type/firebase-type";
import {User} from "../type/user";
import {Post} from "../type/post";
import moment = require("moment");
import {Campaign} from "../type/campaign";

export function parseUserToFirestore(user: User) {
  const parsedUser: FirestoreCustomUser = {
    id: user.id,
    name: user.name,
    gender: user.gender,
    faculty: user.faculty,
    year: user.year,
    telegramHandle: user.telegramHandle,
    profilePhoto: user.profilePhoto,
    thumbnailPhoto: user.thumbnailPhoto,
  };
  return parsedUser;
}

export function parseUserFromFirestore(firestoreUser: FirestoreCustomUser) {
  const parsedUser: User = {
    id: firestoreUser.id,
    name: firestoreUser.name,
    gender: firestoreUser.gender,
    faculty: firestoreUser.faculty,
    year: firestoreUser.year,
    telegramHandle: firestoreUser.telegramHandle,
    profilePhoto: firestoreUser.profilePhoto,
    thumbnailPhoto: firestoreUser.thumbnailPhoto,
  };
  return parsedUser;
}

export function parsePostToFirestore(post: Post) {
  const startDate = moment(post.startDateTime).toDate();
  const endDate = moment(post.endDateTime).toDate();

  const parsedPost: FirestoreCustomPost = {
    posterId: post.poster.id,
    startDateTime: startDate,
    endDateTime: endDate,
    location: post.location,
    id: post.id,
    description: post.description,
  };
  return parsedPost;
}

export function parseCampaignFromFirestore(firestoreCampaign: FirestoreCustomCampaign, firestoreCampaignDetails: FirestoreCustomCampaignDetails) {
  return {
    ...firestoreCampaign,
    ...firestoreCampaignDetails,
    startDateTime: (firestoreCampaignDetails.startDateTime as any).toDate().toISOString(),
    endDateTime: (firestoreCampaignDetails.endDateTime as any).toDate().toISOString(),
  } as Campaign;
}

export function parsePostFromFirestore(
    firestorePost: FirestoreCustomPost,
    firestorePoster: FirestoreCustomUser,
    firestoreParticipants: FirestoreCustomUser[]) {
  const parsedPost: Post = {
    id: firestorePost.id,
    description: firestorePost.description,
    poster: parseUserFromFirestore(firestorePoster),
    startDateTime: (firestorePost.startDateTime as any).toDate().toISOString(),
    endDateTime: (firestorePost.endDateTime as any).toDate().toISOString(),
    participants: Array.from(firestoreParticipants, (participant) => {
      return parseUserFromFirestore(participant);
    }),
    location: firestorePost.location,
  };
  return parsedPost;
}
