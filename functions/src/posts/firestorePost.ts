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

  const firestoreApplicants = await db.postParticipants(firestorePost.id).get();

  await Promise.all(firestoreApplicants.docs.map(async (firestoreApplicant) => {
    const applicant = firestoreApplicant.data();
    if (applicant.status == AppliedRequestStatus.ACCEPTED) {
      const user = await db.users.doc(applicant.userId).get();
      const docData = user.data();
      if (!docData) {
        throw new functions.https
            .HttpsError("aborted", "Cannot fetch user data");
      }
      participants.push(docData);
    }
  }));
  return parsePostFromFirestore(firestorePost, poster, participants);
}
