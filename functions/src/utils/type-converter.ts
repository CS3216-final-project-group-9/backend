import {FirestoreCustomPost, FirestoreCustomUser} from "../type/firebase-type";
import {User} from "../type/user";
import {Post} from "../type/post";

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
  const parsedPost: FirestoreCustomPost = {
    posterId: post.poster.id,
    startDateTime: post.startDateTime,
    endDateTime: post.endDateTime,
    location: post.location,
    id: post.id,
    description: post.description,
  };
  return parsedPost;
}

export function parsePostFromFirestore(
    firestorePost: FirestoreCustomPost,
    firestorePoster: FirestoreCustomUser,
    firestoreParticipants: FirestoreCustomUser[]) {
  const parsedPost: Post = {
    id: firestorePost.id,
    description: firestorePost.description,
    poster: parseUserFromFirestore(firestorePoster),
    startDateTime: firestorePost.startDateTime,
    endDateTime: firestorePost.endDateTime,
    participants: Array.from(firestoreParticipants, (participant) => {
      return parseUserFromFirestore(participant);
    }),
    location: firestorePost.location,
  };
  return parsedPost;
}
