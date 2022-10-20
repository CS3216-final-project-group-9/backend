import moment = require("moment");
import {db} from "../firebase";
import {FirestoreCustomApplicant, FirestoreCustomPost} from "../type/firebase-type";
import {AppliedRequest, AppliedRequestStatus, CreatedRequest} from "../type/postApplication";
import {User} from "../type/user";
import {parseUserFromFirestore} from "../utils/type-converter";
import {getPostFromFirestorePost} from "./firestorePost";


export async function getAppliedPostsFromFirestore(applicants: FirebaseFirestore.QuerySnapshot<FirestoreCustomApplicant>) {
  const appliedRequests: AppliedRequest[] = [];
  await Promise.all(applicants.docs.map( async (applicantDoc) => {
    const applicant = applicantDoc.data();
    const request = await createAppliedRequest(applicant.postId, applicant.status);
    if (request) appliedRequests.push(request);
  }));
  return appliedRequests;
}

export async function getCreatedPostsFromFirestore(firestorePosts:FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>) {
  const createdRequests: CreatedRequest[] = [];
  await Promise.all(firestorePosts.docs.map( async (postDoc) => {
    const firestorePost = postDoc.data();
    const request = await createCreatedRequest(firestorePost);
    createdRequests.push(request);
  }));

  return createdRequests;
}

export async function createCreatedRequest(firestorePost:FirestoreCustomPost) {
  const post = await getPostFromFirestorePost(firestorePost);
  const participantsDoc = await db.applicants
      .where("postId", "==", firestorePost.id).where("status", "==", AppliedRequestStatus.PENDING).get();
  const applicants: User[] = [];
  await Promise.all(participantsDoc.docs.map(async (participantDoc) => {
    const applicant = participantDoc.data();
    const applicantDoc = await db.users.doc(applicant.userId).get();
    const app = applicantDoc.data();
    if (app) applicants.push(parseUserFromFirestore(app));
  }));

  const request: CreatedRequest = {
    post: post,
    applicants: applicants,
  };
  return request;
}


export async function createAppliedRequest(postId: string, status: AppliedRequestStatus) {
  const postDoc = await db.posts.doc(postId).get();
  const firestorePost =postDoc.data();
  if (firestorePost) {
    const post = await getPostFromFirestorePost(firestorePost);
    const todayDate = moment();
    const isBefore = moment(post.startDateTime).isBefore(todayDate, "day");
    if (!isBefore) {
      const request: AppliedRequest = {
        post: post,
        status: status,
      };
      return request;
    }
  }
  return null;
}
