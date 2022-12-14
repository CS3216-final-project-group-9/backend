import * as admin from "firebase-admin";
import {FirestoreCustomApplicant,
  FirestoreCustomArt,
  FirestoreCustomCampaign,
  FirestoreCustomCampaignDetails,
  FirestoreCustomNotification,
  FirestoreCustomPost,
  FirestoreCustomUser,
  FirestoreMail} from "./type/firebase-type";

admin.initializeApp();

// Need to use this for update array, as FieldValue cannot work with type
export const unTypedFirestore = admin.firestore();

export const cloudMessageAdmin = admin.messaging();
export const storage = admin.storage().bucket();
// Type converter for Typescript
// Reference : https://gist.github.com/JamieCurnow/cba3968a7f1e335d473632f9fc9f6e8b

const converter = <T>() => ({
  toFirestore: (data: Partial<T>) => data,
  fromFirestore: (snap: FirebaseFirestore
    .QueryDocumentSnapshot) => snap.data() as T,
});

const dataPoint = <T>(collectionPath: string) => unTypedFirestore
    .collection(collectionPath).withConverter(converter<T>());

const db = {
  // list your collections here
  users: dataPoint<FirestoreCustomUser>("users"),
  posts: dataPoint<FirestoreCustomPost>("posts"),
  campaigns: dataPoint<FirestoreCustomCampaign>("campaigns"),
  campaignDetails: dataPoint<FirestoreCustomCampaignDetails>("campaignDetails"),
  applicants: dataPoint<FirestoreCustomApplicant>("applicants"),
  mail: dataPoint<FirestoreMail>("mail"),
  notifications: dataPoint<FirestoreCustomNotification>("notifications"),
  art: dataPoint<FirestoreCustomArt>("art"),
};

export {admin, db};
