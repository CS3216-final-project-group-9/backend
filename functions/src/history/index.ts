import * as functions from "firebase-functions";
import {db} from "../firebase";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";
import {UserHistory} from "../type/history";
import {AppliedRequestStatus} from "../type/postApplication";
import {FirestoreCustomPost} from "../type/firebase-type";
import moment = require("moment");
import {Post} from "../type/post";
import {getAllPostsFromFirestorePosts} from "../posts/firestorePost";
import {User} from "../type/user";
import {parseUserFromFirestore} from "../utils/type-converter";
import {getUserArt} from "../art";

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

    const sortedPost = firestorePosts.sort((a, b) => {
      const aDateOfStudy = moment((a.startDateTime as any).toDate());
      const bDateOfStudy = moment((b.startDateTime as any).toDate());
      return aDateOfStudy.isBefore(bDateOfStudy, "minute") ? -1 : 1;
    });

    const recentFirestorePosts = sortedPost.slice(0, 5);

    const recentPosts: Post[] = await getAllPostsFromFirestorePosts(recentFirestorePosts);

    const uidRecentBuddy = new Set<string>();
    const uidRecentBuddyList: string[] = [];

    await Promise.all(sortedPost.map(async (post) => {
      const uidMet:string[] = [];
      if (post.posterId != uid) uidMet.push(post.posterId);
      const participantDoc = await db.applicants.where("postId", "==", post.id).where("status", "==", AppliedRequestStatus.ACCEPTED).get();

      participantDoc.docs.map((p) =>{
        const u = p.data();
        if (u.userId != uid) uidMet.push(u.userId);
      });
      return uidMet;
    })).then((responses) => {
      responses.map((response) => {
        response.map((index) => {
          if (uidRecentBuddy.size < 5 && !uidRecentBuddy.has(index)) {
            uidRecentBuddy.add(index);
            uidRecentBuddyList.push(index);
          }
        });
      });
    });


    const recentBuddies: User[] = [];

    await Promise.all(uidRecentBuddyList.map(async (index) => {
      const userDoc = await db.users.doc(index).get();
      const firestoreUser = userDoc.data();
      const art = await getUserArt(index);
      if (firestoreUser) {
        return parseUserFromFirestore(firestoreUser, art);
      }
      return null;
    })).then((responses) => {
      responses.map((response) => {
        if (response) recentBuddies.push(response);
      });
    });


    const history: UserHistory = {
      totalCreatedStudySessions: createdSessionDoc.size,
      totalAppliedStudySessons: appliedSessionDoc.size,
      numPeopleMet: uidPeopleMeet.size,
      totalStudyHours: studyHours,
      recentBuddies: recentBuddies,
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
  return Math.abs((endTime as any).toDate().getTime() - (startTime as any).toDate().getTime()) / 3600000;
}
