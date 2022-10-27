import {FirestoreCustomPost, FirestoreCustomUser} from "../type/firebase-type";
import * as functions from "firebase-functions";
import {db} from "../firebase";
import {parsePostFromFirestore, parseUserFromFirestore} from "../utils/type-converter";
import {AppliedRequestStatus} from "../type/postApplication";
import {Post, PostsFilter} from "../type/post";
import {User} from "../type/user";
import * as CustomErrorCode from "../utils/errorCode";
import {isInsideDateTimeRange} from "./filterPost";
import {getUserArt} from "../art";

export async function getAllPostsFromFirestorePosts(firestorePosts:FirestoreCustomPost[]) {
  const posts: Post[] = [];
  await Promise.all(firestorePosts.map( async (firestorePost) => {
    const post = await getPostFromFirestorePost(firestorePost);
    posts.push(post);
  }));
  return posts;
}

export async function getFirestorePostsFromId(idList:string[]) {
  const firestorePosts : FirestoreCustomPost[] = [];
  await Promise.all(idList.map( async (postId) => {
    const firestorePostDoc = await db.posts.doc(postId).get();
    const firestorePost = firestorePostDoc.data();
    if (firestorePost)firestorePosts.push(firestorePost);
  }));
  return firestorePosts;
}

export async function getExplorePostsFromSnapshot(postSnapshot:FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>, uid: string, filter:PostsFilter) {
  const posts : Post[] = [];
  await Promise.all(postSnapshot.docs.map( async (doc) => {
    const firestorePost = doc.data();
    if (!isInsideDateTimeRange(filter.timesOfDay, filter.days, firestorePost.startDateTime, firestorePost.endDateTime)) return null;
    const postObj = await getPostWithAllApplicants(firestorePost);
    const applicants = postObj.applicants.map((user) => user.id);
    const participants = postObj.postObject.participants.map((user) => user.id);
    if (!applicants.includes(uid) && !participants.includes(uid)) {
      return postObj.postObject;
    }
    return null;
  })).then((responses) => {
    responses.map((response) => {
      if (response) posts.push(response);
    });
  });
  return posts;
}

/**
 * Returns post object and applicants
 * @param {FirestoreCustomPost} firestorePost FirestorePost object
 */
export async function getPostWithAllApplicants(firestorePost: FirestoreCustomPost) {
  const posterDoc = await db.users.doc(firestorePost.posterId).get();
  const poster = posterDoc.data();
  if (!poster) {
    throw new functions.https .HttpsError("aborted", CustomErrorCode.POST_AUTHOR_NOT_IN_DB);
  }
  const participants: FirestoreCustomUser[] = [];

  const firestoreParticipantsDoc = await db.applicants
      .where("postId", "==", firestorePost.id).get();
  const applicants: User[] = [];
  await Promise.all(firestoreParticipantsDoc.docs.map(async (participantDoc) => {
    const participant = participantDoc.data();
    const promises = await Promise.all([db.users.doc(participant.userId).get(), getUserArt(participant.userId)]);
    const user = promises[0];
    const art = promises[1];
    const docData = user.data();
    if (docData && participant.status === AppliedRequestStatus.ACCEPTED) {
      participants.push(docData);
    } else if (docData) {
      applicants.push(parseUserFromFirestore(docData, art));
    }
  }));
  const postObject = await parsePostFromFirestore(firestorePost, poster, participants);
  return {postObject, applicants};
}


export async function getPostFromFirestorePost(firestorePost: FirestoreCustomPost) {
  const posterDoc = await db.users.doc(firestorePost.posterId).get();
  const poster = posterDoc.data();
  if (!poster) {
    throw new functions.https .HttpsError("aborted", CustomErrorCode.POST_AUTHOR_NOT_IN_DB);
  }
  const participants: FirestoreCustomUser[] = [];

  const firestoreParticipantsDoc = await db.applicants
      .where("postId", "==", firestorePost.id).where("status", "==", AppliedRequestStatus.ACCEPTED).get();

  await Promise.all(firestoreParticipantsDoc.docs.map(async (participantDoc) => {
    const participant = participantDoc.data();
    const user = await db.users.doc(participant.userId).get();
    const docData = user.data();
    if (docData) participants.push(docData);
  }));
  const post = await parsePostFromFirestore(firestorePost, poster, participants);
  return post;
}
