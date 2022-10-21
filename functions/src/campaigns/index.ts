import {db, unTypedFirestore} from "../firebase";
import * as functions from "firebase-functions";
import * as CustomErrorCode from "../utils/errorCode";
import {HttpsError} from "firebase-functions/v1/https";
import {FieldValue} from "firebase-admin/firestore";
import {FirestoreCustomApplicant, FirestoreCustomCampaign, FirestoreCustomCampaignDetails, FirestoreCustomPost} from "../type/firebase-type";
import moment = require("moment");
import {createAppliedRequest, getAppliedPostsFromFirestore} from "../posts/getCustomPost";
import {AppliedRequest, AppliedRequestStatus} from "../type/postApplication";
import {parseCampaignFromFirestore} from "../utils/type-converter";
import {Campaign, CampaignChance} from "../type/campaign";

async function checkHasExceededLimitForStudySessions(userId: string, date: Date) {
  console.log(14, userId, date);
  const recordedPosts = await db.posts.where("posterId", "==", userId).where("hasBeenUsedForCampaign", ">", CampaignChance.NOT_RECORDED).get();
  const recordedApplicants = await db.applicants.where("userId", "==", userId).where("campaignChances", ">", CampaignChance.NOT_RECORDED).get();
  const totalLen = recordedPosts.size + recordedApplicants.size;
  if (totalLen > 1) {
    console.log(18);
    return true;
  }
  const filteredPosts = recordedPosts.docs.filter((doc) => {
    const data = doc.data();
    const start = (data.startDateTime as any).toDate();
    console.log(start);
    const isSame = moment(start).isSame(date, "day");
    return isSame;
  });
  if (filteredPosts.length > 0) {
    console.log(28);
    return true;
  }
  const appliedRequests = await getAppliedPostsFromFirestore(recordedApplicants);
  const filteredApplicants = appliedRequests.filter((applicant) => {
    const start = applicant.post.startDateTime;
    const isSame = moment(start).isSame(date, "day");
    return isSame;
  });
  console.log(37, filteredApplicants.length);
  return filteredApplicants.length > 0;
}

/**
 * Invoked when user creates a study session
 * @param {string} userId userId of creator/applicant
 * @param {string} postId postId of created post
 */
export const updateCampaignForSession = async function(userId: string, postId: string) {
  const batch = unTypedFirestore.batch();
  const campaignRef = db.campaigns.doc(userId);
  const postRef = db.posts.doc(postId);
  const postDoc = await postRef.get();
  const postData = postDoc.data();
  if (!postData) {
    console.log(50, userId, postId);
    return;
  }
  if (postData.hasBeenUsedForCampaign) {
    console.log(54, userId, postId);
    return;
  }
  const start = (postData.startDateTime as any).toDate();
  const hasExceededLimit = await checkHasExceededLimitForStudySessions(userId, start);
  if (hasExceededLimit) {
    console.log(59, userId, postId);
    return;
  }
  batch.update(campaignRef, {chances: FieldValue.increment(1)});
  batch.update(postRef, {hasBeenUsedForCampaign: CampaignChance.RECORDED_CREATE});
  await batch.commit();
};

async function checkHasExceededLimitForApplicant(applicantId: string, posterId: string, application: AppliedRequest) {
  const postDate = moment(application.post.startDateTime);
  const applicantCreditedPostsQuery = await db.applicants.where("userId", "==", applicantId).where("campaignChances", "==", CampaignChance.RECORDED_ACCEPT).get();
  const applicantCreditedPostsToday = [];
  const applicantCreditedPostsWithPoster = [];

  // Check credited applications made by `applicantId` that were accepted by `posterId` or on the same day as `application`
  await Promise.all(applicantCreditedPostsQuery.docs.map(async (application) => {
    const applicationData = application.data();
    const appliedRequest = await createAppliedRequest(applicationData.postId, applicationData.status);
    if (appliedRequest === null || applicationData.status !== AppliedRequestStatus.ACCEPTED) {
      return;
    }
    if (appliedRequest.post.poster.id === posterId) {
      applicantCreditedPostsWithPoster.push(appliedRequest);
    }
    const appliedRequestDate = appliedRequest.post.startDateTime;
    const isSameDate = moment(appliedRequestDate).isSame(postDate, "day");
    if (isSameDate) {
      applicantCreditedPostsToday.push(appliedRequest);
    }
  }));
  if (applicantCreditedPostsToday.length > 0 || applicantCreditedPostsWithPoster.length > 1) {
    return true;
  }

  // Check credited applications made by `posterId` that were accepted by `applicantId`
  const posterCreditedPostsQuery = await db.applicants.where("userId", "==", posterId).where("campaignChances", "==", CampaignChance.RECORDED_ACCEPT).get();
  const posterCreditedPostsWithApplicant = [];
  await Promise.all(posterCreditedPostsQuery.docs.map(async (application) => {
    const applicationData = application.data();
    const appliedRequest = await createAppliedRequest(applicationData.postId, applicationData.status);
    if (appliedRequest === null || applicationData.status !== AppliedRequestStatus.ACCEPTED) {
      return;
    }
    if (appliedRequest.post.poster.id === applicantId) {
      posterCreditedPostsWithApplicant.push(appliedRequest);
    }
  }));
  if (posterCreditedPostsWithApplicant.length > 1) {
    return true;
  }

  const combinedLen = applicantCreditedPostsWithPoster.length + posterCreditedPostsWithApplicant.length;
  if (combinedLen > 1) {
    return true;
  }

  // Check posts made by `applicantId` that has already been credited
  const today = moment().startOf("day");
  const todayEnd = today.clone().endOf("day");
  const query = await db.posts.where("posterId", "==", applicantId).where("startDateTime", ">=", today).where("endDateTime", "<=", todayEnd).where("hasBeenUsedForCampaign", "==", CampaignChance.RECORDED_ACCEPT).get();
  if (query.size > 0) {
    // applicant already received a chance from accepting someone in his other study session
    return true;
  }
  // Applicant must not have a credited application today and
  // Applicant must not have had more than 1 previously accepted and credited study session with this poster (where `applicantId` can either be the poster or applicant)
  return false;
}

async function checkHasExceededLimitForPoster(posterId: string, applicantId: string, application: AppliedRequest) {
  const postDate = moment(application.post.startDateTime);

  // Check credited applications made by `posterId` that were accepted
  const posterCreditedPostsQuery = await db.applicants.where("userId", "==", posterId).where("campaignChances", "==", CampaignChance.RECORDED_ACCEPT).get();
  const posterCreditedPostsToday = [];
  const posterCreditedPostsWithApplicant = [];
  await Promise.all(posterCreditedPostsQuery.docs.map(async (application) => {
    const applicationData = application.data();
    const appliedRequest = await createAppliedRequest(applicationData.postId, applicationData.status);
    if (appliedRequest === null || applicationData.status !== AppliedRequestStatus.ACCEPTED) {
      return;
    }
    const appliedRequestDate = appliedRequest.post.startDateTime;
    const isSameDate = moment(appliedRequestDate).isSame(postDate, "day");
    if (isSameDate) {
      posterCreditedPostsToday.push(appliedRequest);
    }
    if (appliedRequest.post.poster.id === applicantId) {
      posterCreditedPostsWithApplicant.push(appliedRequest);
    }
  }));
  if (posterCreditedPostsToday.length > 0 || posterCreditedPostsWithApplicant.length > 1) {
    return true;
  }

  // Check credited applications made by `applicantId` that were accepted by `posterId`
  const applicantCreditedPostsQuery = await db.applicants.where("userId", "==", applicantId).where("campaignChances", "==", CampaignChance.RECORDED_ACCEPT).get();
  const applicantCreditedPostsWithPoster = [];
  await Promise.all(applicantCreditedPostsQuery.docs.map(async (application) => {
    const applicationData = application.data();
    const appliedRequest = await createAppliedRequest(applicationData.postId, applicationData.status);
    if (appliedRequest === null || applicationData.status !== AppliedRequestStatus.ACCEPTED) {
      return;
    }
    if (appliedRequest.post.poster.id === posterId) {
      posterCreditedPostsWithApplicant.push(appliedRequest);
    }
  }));
  if (applicantCreditedPostsWithPoster.length > 1) {
    return true;
  }

  const combinedLen = applicantCreditedPostsWithPoster.length + posterCreditedPostsWithApplicant.length;
  if (combinedLen > 1) {
    return true;
  }

  // Check posts made by `posterId` that has already been credited
  const today = moment().startOf("day");
  const todayEnd = today.clone().endOf("day");
  const query = await db.posts.where("posterId", "==", posterId).where("startDateTime", ">=", today).where("endDateTime", "<=", todayEnd).where("hasBeenUsedForCampaign", "==", CampaignChance.RECORDED_ACCEPT).get();
  if (query.size > 0) {
    // poster already received a chance from accepting someone in his other study session today
    return true;
  }
  return false;
}

async function checkHasExceededLimitForStudyApplications(applicantId: string, posterId: string, application: AppliedRequest) {
  const returnValue = {hasExceededLimitPoster: false, hasExceededLimitApplicant: false};
  returnValue.hasExceededLimitApplicant = await checkHasExceededLimitForApplicant(applicantId, posterId, application);
  returnValue.hasExceededLimitPoster = await checkHasExceededLimitForPoster(posterId, applicantId, application);
  return returnValue;
}

export const updateCampaignForAcceptedApplication = async function(applicantId: string, posterId: string, applicationId: string, application: AppliedRequest) {
  const {hasExceededLimitPoster, hasExceededLimitApplicant} = await checkHasExceededLimitForStudyApplications(applicantId, posterId, application);
  if (hasExceededLimitPoster && hasExceededLimitApplicant) {
    return;
  }
  const batch = unTypedFirestore.batch();
  const posterCampaignRef = db.campaigns.doc(posterId);
  const applicantCampaignRef = db.campaigns.doc(applicantId);
  const applicationRef = db.applicants.doc(applicationId);
  if (!hasExceededLimitPoster) {
    const postRef = db.posts.doc(application.post.id);
    batch.update(posterCampaignRef, {chances: FieldValue.increment(1)});
    batch.update(postRef, {hasBeenUsedForCampaign: CampaignChance.RECORDED_ACCEPT});
  }
  if (!hasExceededLimitApplicant) {
    batch.update(applicantCampaignRef, {chances: FieldValue.increment(1)});
    batch.update(applicationRef, {"campaignChances": CampaignChance.RECORDED_ACCEPT});
  }
  return batch.commit();
};

/**
 * Invoked when a user applies for a study session
 * @param {string} userId userId of creator/applicant
 * @param {string} applicationId id of created application
 */
export const updateCampaignForApplying = async function(userId: string, applicationId: string) {
  const batch = unTypedFirestore.batch();
  const campaignRef = db.campaigns.doc(userId);
  const applicationRef = db.applicants.doc(applicationId);
  const applicationDoc = await applicationRef.get();
  const applicationData = applicationDoc.data();
  if (!applicationData) {
    return;
  }
  const chances = applicationData.campaignChances as number;
  if (chances > CampaignChance.NOT_RECORDED) {
    return;
  }
  const postDoc = await db.posts.doc(applicationData.postId).get();
  const postData = postDoc.data();
  if (!postData) {
    return;
  }
  const start = (postData.startDateTime as any).toDate();
  const hasExceededLimit = await checkHasExceededLimitForStudySessions(userId, start);
  if (hasExceededLimit) {
    return;
  }
  batch.update(campaignRef, {chances: FieldValue.increment(1)});
  batch.update(applicationRef, {"campaignChances": CampaignChance.RECORDED_CREATE});
  await batch.commit();
};

/**
 * Invoked when an application is deleted
 * @param {string} userId userId of creator/applicant
 * @param {FirestoreCustomApplicant} application Application that was deleted
 */
export const updateCampaignForDeletedApplication = async function(userId: string, application: FirestoreCustomApplicant) {
  if (!application.campaignChances) {
    return;
  }
  const chances = application.campaignChances as number;
  if (chances === CampaignChance.NOT_RECORDED) {
    return;
  }
  return db.campaigns.doc(userId).update({chances: FieldValue.increment(-chances)});
};

/**
 * Invoked when user deletes a sudy session
 * @param {string} userId userId of creator/applicant
 * @param {FirestoreCustomPost} post deleted post
 */
export const updateCampaignForSessionDeleted = async function(userId: string, post: FirestoreCustomPost) {
  if (!post.hasBeenUsedForCampaign) {
    return;
  }
  return unTypedFirestore.collection("campaigns").doc(userId).update({chances: FieldValue.increment(-post.hasBeenUsedForCampaign)});
};

export const addCampaignsToExistingUsers = functions.region("asia-southeast2").pubsub.schedule("15 17 * * *").timeZone("Asia/Singapore").onRun(async () => {
  const users = await db.users.get();
  const batch = unTypedFirestore.batch();
  const campaignName = "LAUNCH";
  const defaultCampaign: FirestoreCustomCampaign = {
    id: "",
    userId: "",
    chances: 1,
    campaignId: campaignName,
  };
  for (const user of users.docs) {
    const campaignUserObject = {...defaultCampaign};
    const uid = user.id;
    campaignUserObject.id = uid;
    campaignUserObject.userId = uid;
    const newRef = db.campaigns.doc(uid);
    batch.set(newRef, campaignUserObject);
  }
  const startDate = moment().utcOffset(8).startOf("day");
  const endDate = startDate.clone().add(14, "days").endOf("day");
  const campaignDetails: FirestoreCustomCampaignDetails = {
    description: "To celebrate BuddyNUS's launch, stand a chance to earn $50! Get more chances of winning by creating study sessions, applying for study sessions, being accepted for a study session or sharing our post on Instagram. Winners will be announced on 4th November. For more details, visit our instagram at @buddynus.official!",
    title: "Launch giveaway!",
    tncs: "",
    image: "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/assets%2Fgiveaway.jpg?alt=media&token=9d0e39fc-cbd3-4881-b6f1-2517f7d8e561",
    startDateTime: startDate.toDate(),
    endDateTime: endDate.toDate(),
  };
  const campaignRef = db.campaignDetails.doc(campaignName);
  batch.set(campaignRef, campaignDetails);
  return batch.commit();
});

export const getUserCampaigns = functions.region("asia-southeast2").https.onCall(async (data, context) => {
  try {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", CustomErrorCode.USER_ID_NOT_AUTH);
    }
    const firestoreCampaigns = await db.campaigns.where("userId", "==", uid).get();
    const campaigns: Campaign[] = [];
    await Promise.all(firestoreCampaigns.docs.map(async (doc) => {
      const data = doc.data();
      const campaignId = data.campaignId;
      const campaignDoc = await db.campaignDetails.doc(campaignId).get();
      const campaignDetails = campaignDoc.data();
      if (campaignDetails) {
        campaigns.push(parseCampaignFromFirestore(data, campaignDetails));
      }
    }));
    return {success: true, message: campaigns};
  } catch (e) {
    console.error(e);
    if (e instanceof HttpsError) return {success: false, message: e.message};
    return {success: false, message: e};
  }
});

export const createCampaign = async function(campaign: FirestoreCustomCampaign) {
  const existingCampaign = await db.campaigns.doc(campaign.id).get();
  if (existingCampaign.exists) {
    throw new Error("Campaign already exists");
  }
  return db.campaigns.doc(campaign.id).set(campaign);
};
