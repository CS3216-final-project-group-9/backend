import * as functions from "firebase-functions";
import {db} from "../firebase";
import {HttpsError} from "firebase-functions/v1/https";
import * as CustomErrorCode from "../utils/errorCode";
import { UserHistory } from "../type/history";

export const getHistory = functions.region("asia-southeast2").https.onCall(async (data, context) => {
    try {
      const uid = context.auth?.uid;
      if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
      }

      const createdSessionDoc = await db.posts.where("posterId",'==',uid).get();
      const appliedSessionDoc = await db.applicants.where("userId","==",uid).get();

      const createdSessionNum = createdSessionDoc.size;
      const appliedSessionNum = appliedSessionDoc.size;

      const history: UserHistory = {
          totalCreatedStudySessions: createdSessionNum,
          totalAppliedStudySessons: appliedSessionNum,
          numPeopleMet: 0,
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