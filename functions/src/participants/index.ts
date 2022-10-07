import * as functions from "firebase-functions";
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomParticipant} from "../type/firebase-type";
import {AppliedRequestStatus} from "../type/postApplication";
import {FieldValue} from "firebase-admin/firestore";

export const createPostApplication = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }

        const {postId: postIdRaw} = data;
        const postId = postIdRaw? postIdRaw as string : null;
        if (!postId) {
          throw new functions.https
              .HttpsError("invalid-argument", "Cannot find post Id");
        }
        const newApplication: FirestoreCustomParticipant = {
          userId: uid,
          status: AppliedRequestStatus.PENDING,
        };
        // Add post application
        await db.postParticipants(postId).doc(uid).set(newApplication);

        // Add post to user profile
        await unTypedFirestore.collection("users").doc(uid).set({
          appliedPostIds: FieldValue.arrayUnion(postId),
        });

        return {success: true, message: "Applied to post successfully"};
      } catch (e) {
        return {success: false, message: e};
      }
    }
);

export const deletePostApplication = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }

        const {postId: postIdRaw} = data;
        const postId = postIdRaw? postIdRaw as string : null;
        if (!postId) {
          throw new functions.https
              .HttpsError("invalid-argument", "Cannot find post Id");
        }
        await unTypedFirestore.collection("users").doc(uid).set({
          appliedPostIds: FieldValue.arrayRemove(postId),
        });
        await db.postParticipants(postId).doc(uid).delete();

        return {success: true,
          message: "Delete application to post successfully"};
      } catch (e) {
        return {success: false, message: e};
      }
    });

export const responsePostApplication = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }

        const {postId: postIdRaw,
          userId: userIdRaw,
          responseStatus: responseRaw} = data;
        const postId = postIdRaw? postIdRaw as string : null;
        const userId = userIdRaw? userIdRaw as string : null;
        const responseStatus = responseRaw?
        responseRaw as AppliedRequestStatus: null;
        if (!postId || !userId || responseStatus == null) {
          throw new functions.https
              .HttpsError("invalid-argument", "Cannot find post Id");
        }

        if (responseStatus == AppliedRequestStatus.ACCEPTED) {
          await unTypedFirestore.collection("users").doc(uid).set({
            participatedPostIds: FieldValue.arrayUnion(postId),
          });
        }

        const updatedApplication: FirestoreCustomParticipant = {
          userId: uid,
          status: responseStatus,
        };
        await db.postParticipants(postId).doc(uid).set(updatedApplication);
        await unTypedFirestore.collection("users").doc(uid).set({
          appliedPostIds: FieldValue.arrayRemove(postId),
        });

        return {success: true,
          message: "Delete application to post successfully"};
      } catch (e) {
        return {success: false, message: e};
      }
    });
