import * as admin from "firebase-admin";
import {FirestoreCustomParticipant,
  FirestoreCustomPost,
  FirestoreCustomUser} from "./type/firebase-type";


admin.initializeApp();

const firestore = admin.firestore();

// Type converter for Typescript
// Reference : https://gist.github.com/JamieCurnow/cba3968a7f1e335d473632f9fc9f6e8b

const converter = <T>() => ({
  toFirestore: (data: Partial<T>) => data,
  fromFirestore: (snap: FirebaseFirestore
    .QueryDocumentSnapshot) => snap.data() as T,
});

const dataPoint = <T>(collectionPath: string) => firestore
    .collection(collectionPath).withConverter(converter<T>());

const db = {
  // list your collections here
  users: dataPoint<FirestoreCustomUser>("users"),
  posts: dataPoint<FirestoreCustomPost>("posts"),
  postParticipants: (postId: string) =>
    dataPoint<FirestoreCustomParticipant>(`posts/${postId}/participants`),
};

export {admin, db};
