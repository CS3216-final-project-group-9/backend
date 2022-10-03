import * as admin from "firebase-admin";
import {User} from "./type/user";
import {Post} from "./type/post";


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
  users: dataPoint<User>("users"),
  posts: dataPoint<Post>("posts"),
};

export {admin, db};
