import * as functions from "firebase-functions";
import {db} from "../firebase";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";
import {UserHistory} from "../type/history";
import {AppliedRequestStatus} from "../type/postApplication";
import { FirestoreCustomPost } from "../type/firebase-type";
import moment = require("moment");
import { Post } from "../type/post";
import { getAllPostsFromFirestorePosts } from "../posts/firestorePost";

export const getHistory = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }

    const createdSessionDoc = await db.posts.where("posterId", '==', uid).get();
    const appliedSessionDoc = await db.applicants.where("userId", "==", uid).get();
    const firestorePosts: FirestoreCustomPost[] = [];


    const uidPeopleMeet = new Set<string>();

    let studyHours = 0;

    await Promise.all(createdSessionDoc.docs.map(async (sessionDoc) => {
      const session = sessionDoc.data();
      firestorePosts.push(session);
      
      studyHours += getDiffTime(session.endDateTime, session.startDateTime);
      const applicants = await db.applicants.where("postId", "==", session.id).where("status", "==", AppliedRequestStatus.ACCEPTED).get();

      applicants.docs.map((metParticipant) => {
        uidPeopleMeet.add(metParticipant.data().userId);
      });
    }));

    await Promise.all(appliedSessionDoc.docs.map(async (sessionDoc) => {
      const session = sessionDoc.data();
      if (session.status == AppliedRequestStatus.ACCEPTED) {
        const postDoc = await db.posts.doc(session.postId).get();
        const post = postDoc.data();
        if (post) {
          firestorePosts.push(post);
          studyHours += getDiffTime(post.endDateTime, post.startDateTime);
          uidPeopleMeet.add(post.posterId);

          const applicants = await db.applicants.where("postId", "==", session.postId)
              .where("status", "==", AppliedRequestStatus.ACCEPTED).get();

          applicants.docs.map((metParticipant) => {
            uidPeopleMeet.add(metParticipant.data().userId);
          });
        }
      }
    }));

    const sortedPost = firestorePosts.sort((a,b) => {
      const aDateOfStudy = moment(a.startDateTime);
      const bDateOfStudy = moment(b.startDateTime);
      return aDateOfStudy.isBefore(bDateOfStudy, "minute") ? -1 : 1;
    })

    const recentFirestorePosts = sortedPost.slice(0, 5);

    const recentPosts: Post[] = await getAllPostsFromFirestorePosts(recentFirestorePosts);

    
    const history: UserHistory = {
      totalCreatedStudySessions: createdSessionDoc.size,
      totalAppliedStudySessons: appliedSessionDoc.size,
      numPeopleMet: uidPeopleMeet.size,
      totalStudyHours: studyHours,
      recentBuddies: [],
      recentStudySessions: recentPosts,
    };


    return {success: true, message: history};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

function getDiffTime(endTime: Date, startTime: Date) {
  return Math.abs(endTime.getTime() - startTime.getTime()) / 3600000;
}
