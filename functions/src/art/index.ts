import {db} from "../firebase";
import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/auth";
import * as CustomErrorCode from "../utils/errorCode";
import {parseFirestoreArtToArt} from "../utils/type-converter";
import moment = require("moment");
import {Art} from "../type/art";

export const getUserArt = functions.region("asia-southeast2").https.onCall( async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }
    const query = await db.art.where('userId', '==', uid).get();
    const results: Art[] = [];
    query.docs.forEach((doc) => {
      const data = doc.data();
      const obj = parseFirestoreArtToArt(data, doc.id);
      if (obj) {
        results.push(obj);
      }
    });
    const sorted = results.sort((a, b) => {
      const aDate = moment(a.date);
      return -aDate.diff(b.date, 'minute'); // latest first
    });
    return {success: true, message: sorted};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});
