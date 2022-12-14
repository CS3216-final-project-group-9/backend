import {FirestoreCustomArt, FirestoreCustomCampaign, FirestoreCustomCampaignDetails, FirestoreCustomPost, FirestoreCustomUser} from "../type/firebase-type";
import {User} from "../type/user";
import {Post} from "../type/post";
import moment = require("moment");
import {Campaign} from "../type/campaign";
import {AIImageTrigger} from "../type/ImageTrigger";
import {Art} from "../type/art";
import {getUserArt} from "../art";

export function parseFirestoreArtToArt(art: FirestoreCustomArt, id :string) {
  if (!art.image) {
    return;
  }
  let description;
  const artDate = (art.date as any).toDate();
  const formattedDate = moment(artDate).utcOffset(8, true).format('DD MMM YYYY');
  switch (art.trigger) {
    case AIImageTrigger.SIGNED_UP:
      description = `Received on ${formattedDate} by signing up`;
      break;
    case AIImageTrigger.ACCEPTED_POST:
      description = `Received on ${formattedDate} by accepting an applicant`;
      break;
    case AIImageTrigger.APPLIED_POST:
      description = `Received on ${formattedDate} by applying for a study session`;
      break;
    case AIImageTrigger.CREATED_POST:
      description = `Received on ${formattedDate} by creating a study session`;
      break;
  }
  const returnValue: Art = {
    id,
    prompt: art.prompt,
    date: artDate.toISOString(),
    userId: art.userId,
    description,
    image: art.image,
    isPublic: art.isPublic,
  };
  return returnValue;
}

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

export function parseUserFromFirestore(firestoreUser: FirestoreCustomUser, art: Art[]) {
  const parsedUser: User = {
    id: firestoreUser.id,
    name: firestoreUser.name,
    gender: firestoreUser.gender,
    faculty: firestoreUser.faculty,
    year: firestoreUser.year,
    telegramHandle: firestoreUser.telegramHandle,
    profilePhoto: firestoreUser.profilePhoto,
    thumbnailPhoto: firestoreUser.thumbnailPhoto,
    art: art,
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

export async function parsePostFromFirestore(
    firestorePost: FirestoreCustomPost,
    firestorePoster: FirestoreCustomUser,
    firestoreParticipants: FirestoreCustomUser[],
) {
  const firestorePosterArt = await getUserArt(firestorePoster.id);
  const participantArt = await Promise.all(firestoreParticipants.map((participant) => {
    return getUserArt(participant.id);
  }));
  const parsedPost: Post = {
    id: firestorePost.id,
    description: firestorePost.description,
    poster: parseUserFromFirestore(firestorePoster, firestorePosterArt),
    startDateTime: (firestorePost.startDateTime as any).toDate().toISOString(),
    endDateTime: (firestorePost.endDateTime as any).toDate().toISOString(),
    participants: Array.from(firestoreParticipants, (participant, i) => {
      return parseUserFromFirestore(participant, participantArt[i]);
    }),
    location: firestorePost.location,
  };
  return parsedPost;
}
