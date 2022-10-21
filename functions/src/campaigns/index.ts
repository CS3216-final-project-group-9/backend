import {db, unTypedFirestore} from "../firebase";
import * as functions from "firebase-functions";
import * as CustomErrorCode from "../utils/errorCode";
import {HttpsError} from "firebase-functions/v1/https";
import {FieldValue} from "firebase-admin/firestore";
import {FirestoreCustomCampaign, FirestoreCustomCampaignDetails, FirestoreCustomPost} from "../type/firebase-type";
import moment = require("moment");
import {getAppliedPostsFromFirestore} from "../posts/getCustomPost";
import {AppliedRequest, CampaignChance} from "../type/postApplication";
import {parseCampaignFromFirestore} from "../utils/type-converter";
import {Campaign} from "../type/campaign";

async function checkHasExceededLimitForStudySessions(userId: string) {
  const recordedPosts = await db.posts.where("posterId", "==", userId).where("hasBeenUsedForCampaign", "==", true).get();
  const recordedApplicants = await db.applicants.where("userId", "==", userId).where("campaignChances", ">", CampaignChance.NOT_RECORDED).get();
  const totalLen = recordedPosts.size + recordedApplicants.size;
  if (totalLen > 1) {
    return true;
  }
  const today = new Date();
  const filteredPosts = recordedPosts.docs.filter((doc) => {
    const data = doc.data();
    const start = data.startDateTime;
    const isSame = moment(start).isSame(today, "day");
    return isSame;
  });
  if (filteredPosts.length > 0) {
    return true;
  }
  const appliedRequests = await getAppliedPostsFromFirestore(recordedApplicants);
  const filteredApplicants = appliedRequests.filter((applicant) => {
    const start = applicant.post.startDateTime;
    const isSame = moment(start).isSame(today, "day");
    return isSame;
  });
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
  const postData = await postRef.get();
  if (postData.data()?.hasBeenUsedForCampaign) {
    return;
  }
  const hasExceededLimit = await checkHasExceededLimitForStudySessions(userId);
  if (hasExceededLimit) {
    return;
  }
  batch.update(campaignRef, {chances: FieldValue.increment(1)});
  batch.update(postRef, {hasBeenUsedForCampaign: true});
  await batch.commit();
};

async function checkHasExceededLimitForStudyApplications(applicantId: string, posterId: string, applicationId: string, application: AppliedRequest) {
  return true;
}

export const updateCampaignForAcceptedApplication = async function(applicantId: string, posterId: string, applicationId: string, application: AppliedRequest) {
  const hasExceededLimit = await checkHasExceededLimitForStudyApplications(applicantId, posterId, applicationId, application);
  if (hasExceededLimit) {
    return;
  }
  const batch = unTypedFirestore.batch();
  const posterCampaignRef = db.campaigns.doc(posterId);
  const applicantCampaignRef = db.campaigns.doc(applicantId);
  const applicationRef = db.applicants.doc(applicationId);
  batch.update(posterCampaignRef, {chances: FieldValue.increment(1)});
  batch.update(applicantCampaignRef, {chances: FieldValue.increment(1)});
  batch.update(applicationRef, {"campaignChances": CampaignChance.RECORDED_ACCEPT});
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
  const applicationData = await applicationRef.get();
  if (!applicationData.exists) {
    return;
  }
  const chances = applicationData.data()?.campaignChances as number;
  if (chances > CampaignChance.NOT_RECORDED) {
    return;
  }
  const hasExceededLimit = await checkHasExceededLimitForStudySessions(userId);
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
 * @param {string} applicationId id of created application
 */
export const updateCampaignForDeletedApplication = async function(userId: string, applicationId: string) {
  const applicationRef = db.applicants.doc(applicationId);
  const applicationData = await applicationRef.get();
  if (!applicationData.exists) {
    return;
  }
  const chances = applicationData.data()?.campaignChances as number;
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
  return unTypedFirestore.collection("campaigns").doc(userId).update({chances: FieldValue.increment(-1)});
};

export const addCampaignsToExistingUsers = functions.region("asia-southeast2").pubsub.schedule("55 15 * * *").timeZone("Asia/Singapore").onRun(async () => {
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
  const endDate = startDate.add(15, "days").endOf("day");
  const campaignDetails: FirestoreCustomCampaignDetails = {
    description: "To celebrate BuddyNUS's chance, stand a chance to earn $50! Get more chances of winning by creating study sessions, applying for study sessions, being accepted for a study session or sharing our post on Instagram. Winners will be announced on 4th November. For more details, visit our instagram at @buddynus.official!",
    title: "Launch giveaway!",
    tncs: "",
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
