import {FirestoreCustomPost, FirestoreCustomUser} from "../type/firebase-type";
import * as functions from "firebase-functions";
import {db} from "../firebase";
import {parsePostFromFirestore} from "../utils/type-converter";
import {AppliedRequestStatus} from "../type/postApplication";
import {Post} from "../type/post";


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

export async function getPostsFromSnapshot(postSnapshot:FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>) {
  const posts : Post[] = [];
  await Promise.all(postSnapshot.docs.map( async (doc) => {
    const firestorePost = doc.data();
    const post = await getPostFromFirestorePost(firestorePost);
    posts.push(post);
  }));
  return posts;
}

export async function getPostFromFirestorePost(firestorePost: FirestoreCustomPost) {
  const posterDoc = await db.users.doc(firestorePost.posterId).get();
  const poster = posterDoc.data();
  if (!poster) {
    throw new functions.https
        .HttpsError("aborted", "Cannot fetch user data");
  }
  const participants: FirestoreCustomUser[] = [];

  const firestoreParticipantsDoc = await db.applicants
      .where("posterId", "==", firestorePost.id).where("status", "==", AppliedRequestStatus.ACCEPTED).get();

  await Promise.all(firestoreParticipantsDoc.docs.map(async (participantDoc) => {
    const participant = participantDoc.data();
    const user = await db.users.doc(participant.userId).get();
    const docData = user.data();
    if (docData) participants.push(docData);
  }));
  return parsePostFromFirestore(firestorePost, poster, participants);
}
