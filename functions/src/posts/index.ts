import {FieldValue} from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import {db, unTypedFirestore} from "../firebase";
import {FirestoreCustomPost,
  FirestoreCustomUser} from "../type/firebase-type";
import {Post, PostLocation} from "../type/post";
import {AppliedRequest,
  AppliedRequestStatus,
  CreatedRequest} from "../type/postApplication";
import {User} from "../type/user";
import {parsePostFromFirestore,
  parsePostToFirestore,
  parseUserFromFirestore} from "../utils/type-converter";

export const createPost = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }
        const newPost = data.post as Post;
        const parsedPost = parsePostToFirestore(newPost);
        const ref = db.posts.doc();
        const docId = ref.id;
        parsedPost.id = docId;
        await ref.set(parsedPost);

        await unTypedFirestore.collection("users").doc(uid).set({
          createdPostIds: FieldValue.arrayUnion(docId),
        });

        return {success: true, message: "Post created successfully"};
      } catch (e) {
        return {success: false, message: e};
      }
    });

export const deletePost = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }
        const postId = data.postId as string;
        if (!postId) {
          throw new functions.https
              .HttpsError("invalid-argument", "Post Id not provided");
        }
        const post = await db.posts.doc(postId).get();

        if (uid != post.data()?.posterId) {
          throw new functions.https
              .HttpsError("permission-denied", "User is not post author");
        }

        await db.posts.doc(postId).delete();
        await unTypedFirestore.collection("users").doc(uid).set({
          createdPostIds: FieldValue.arrayRemove(postId),
        });

        return {success: true, message: "Post deleted successfully"};
      } catch (e) {
        return {success: false, message: e};
      }
    });

export const updatePost = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;

        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }
        const newPost = data.post as Post;
        const parsedPost = parsePostToFirestore(newPost);
        const post = await db.posts.doc(parsedPost.id).get();
        if (uid != post.data()?.posterId) {
          throw new functions.https
              .HttpsError("permission-denied", "User is not post author");
        }
        await db.posts.doc().set(parsedPost);


        return {success: true, message: "Post updated successfully"};
      } catch (e) {
        return {success: false, message: e};
      }
    });

export const getPost = functions.https.onCall(
    async (data, context) => {
      try {
        const {page: pageRaw, location: locationRaw} = data;
        const page = pageRaw ? pageRaw as number: null;
        if (!page) {
          throw new functions.https
              .HttpsError("invalid-argument", "Page is not provided");
        }

        const POST_PER_PAGE = 20;

        const location = locationRaw? locationRaw as PostLocation[]: null;
        let postSnapshot: FirebaseFirestore.QuerySnapshot<FirestoreCustomPost>;
        if (!location) {
          postSnapshot = await db.posts.orderBy("startDateTime")
              .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
        } else {
          postSnapshot = await db.posts.orderBy("startDateTime")
              .where("location", "in", location)
              .startAfter(POST_PER_PAGE * (page -1)).limit(POST_PER_PAGE).get();
        }
        const posts : Post[] = [];

        await Promise.all(postSnapshot.docs.map( async (doc) => {
          const firestorePost = doc.data();
          const post = await getPostFromFirestorePost(firestorePost);
          posts.push(post);
        }));

        return {success: true, message: posts};
      } catch (e) {
        return {success: false, message: e};
      }
    });

export const getAllActivePosts = functions.https.onCall(
    async (data, context) => {
      try {
        const postSnapshot = await db.posts.orderBy("startDateTime").get();
        const posts : Post[] = [];
        await Promise.all(postSnapshot.docs.map( async (doc) => {
          const firestorePost = doc.data();
          const post = await getPostFromFirestorePost(firestorePost);
          posts.push(post);
        }));

        return {success: true, message: posts};
      } catch (e) {
        return {success: false, message: e};
      }
    });

export const getAppliedPosts = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }
        const userDoc = await db.users.doc(uid).get();
        const user = userDoc.data();
        if (!user) {
          throw new functions.https
              .HttpsError("not-found", "Cannot fetch user data");
        }
        const firestorePosts : FirestoreCustomPost[] = [];

        await Promise.all(user.participatedPostIds.map( async (postId) => {
          const firestorePostDoc = await db.posts.doc(postId).get();
          const firestorePost = firestorePostDoc.data();
          if (firestorePost)firestorePosts.push(firestorePost);
        }));


        const posts: Post[] = [];
        await Promise.all(firestorePosts.map( async (firestorePost) => {
          const post = await getPostFromFirestorePost(firestorePost);
          posts.push(post);
        }));

        const appliedRequests: AppliedRequest[] = [];
        await Promise.all(posts.map( async (post) => {
          const participantDoc = await db.postParticipants(post.id)
              .doc(uid).get();
          const applyStatus = participantDoc.data()?.status;
          if (applyStatus) {
            appliedRequests.push({
              status: applyStatus,
              post: post,
            });
          }
        }));

        return {success: true, message: appliedRequests};
      } catch (e) {
        return {success: false, message: e};
      }
    });

export const getCreatedPosts = functions.https.onCall(
    async (data, context) => {
      try {
        const uid = context.auth?.uid;
        if (!uid) {
          throw new functions.https
              .HttpsError("unauthenticated", "User ID cannot be determined");
        }
        const userDoc = await db.users.doc(uid).get();
        const user = userDoc.data();
        if (!user) {
          throw new functions.https
              .HttpsError("not-found", "Cannot fetch user data");
        }
        const firestorePosts : FirestoreCustomPost[] = [];

        await Promise.all(user.createdPostIds.map( async (postId) => {
          const firestorePostDoc = await db.posts.doc(postId).get();
          const firestorePost = firestorePostDoc.data();
          if (firestorePost)firestorePosts.push(firestorePost);
        }));

        const posts: Post[] = [];
        await Promise.all(firestorePosts.map( async (firestorePost) => {
          const post = await getPostFromFirestorePost(firestorePost);
          posts.push(post);
        }));

        const createdRequests: CreatedRequest[] = [];
        await Promise.all(posts.map( async (post) => {
          const participantsDoc = await db.postParticipants(post.id).get();

          const applicants: User[] = [];
          await Promise.all(participantsDoc.docs.map(async (participantDoc) => {
            const participant = participantDoc.data();
            if (participant.status == AppliedRequestStatus.PENDING) {
              const userDoc = await db.users.doc(participant.userId).get();
              const user = userDoc.data();
              if (user) applicants.push(parseUserFromFirestore(user));
            }
          }));
          createdRequests.push({
            post: post,
            applicants: applicants,
          });
        }));

        return {success: true, message: createdRequests};
      } catch (e) {
        return {success: false, message: e};
      }
    });


async function getPostFromFirestorePost(firestorePost: FirestoreCustomPost) {
  const posterDoc = await db.users.doc(firestorePost.posterId).get();
  const poster = posterDoc.data();
  if (!poster) {
    throw new functions.https
        .HttpsError("aborted", "Cannot fetch user data");
  }
  const participants: FirestoreCustomUser[] = [];

  const firestoreApplicants = await db.postParticipants(firestorePost.id).get();

  await Promise.all(firestoreApplicants.docs.map(async (firestoreApplicant) => {
    const applicant = firestoreApplicant.data();
    if (applicant.status == AppliedRequestStatus.ACCEPTED) {
      const user = await db.users.doc(applicant.userId).get();
      const docData = user.data();
      if (!docData) {
        throw new functions.https
            .HttpsError("aborted", "Cannot fetch user data");
      }
      participants.push(docData);
    }
  }));
  return parsePostFromFirestore(firestorePost, poster, participants);
}
