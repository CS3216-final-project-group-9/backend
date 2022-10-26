import * as functions from "firebase-functions";
import {db} from "../firebase";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";
import { UserHistory } from "../type/history";
import { AppliedRequestStatus } from "../type/postApplication";

export const getHistory = functions.region("asia-southeast2").https.onCall(async (data, context) => {
    try {
      const uid = context.auth?.uid;
      if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
      }

      const createdSessionDoc = await db.posts.where("posterId",'==',uid).get();
      const appliedSessionDoc = await db.applicants.where("userId","==",uid).get();

      const uidPeopleMeet = new Set<string>();

      await Promise.all(createdSessionDoc.docs.map(async (sessionDoc) => {
        const session = sessionDoc.data();
        const applicants = await db.applicants.where("postId", "==", session.id).where("status", "==", AppliedRequestStatus.ACCEPTED).get();

        applicants.docs.map((metParticipant) => {
            uidPeopleMeet.add(metParticipant.data().userId)
        })
      }));

      await Promise.all(appliedSessionDoc.docs.map(async (sessionDoc) => {
        const session = sessionDoc.data();
        if(session.status == AppliedRequestStatus.ACCEPTED) {
          const postDoc = await db.posts.doc(session.postId).get();
          const post = postDoc.data();
          if(post) {
            uidPeopleMeet.add(post.posterId);

            const applicants = await db.applicants.where("postId", "==", session.postId)
            .where("status", "==", AppliedRequestStatus.ACCEPTED).get();

            applicants.docs.map((metParticipant) => {
                uidPeopleMeet.add(metParticipant.data().userId)
            })
          }
        }
        
      }));

      

      const history: UserHistory = {
          totalCreatedStudySessions: createdSessionDoc.size,
          totalAppliedStudySessons: appliedSessionDoc.size,
          numPeopleMet: uidPeopleMeet.size,
          totalStudyHours: 0,
          recentBuddies: [],
          recentStudySessions: []
      }


      return {success: true, message: history};
    } catch (e) {
      console.error(e);
      if (e instanceof HttpsError) return {success: false, message: e.message};
      return {success: false, message: e};
    }
  });