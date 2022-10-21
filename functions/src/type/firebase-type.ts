import {Gender, Faculty} from "./user";
import {PostLocation} from "./post";
import {AppliedRequestStatus, CampaignChance} from "./postApplication";
import {NotificationType} from "./notification";

type Message = {
    subject: string;
    text: string;
    html: string;
}

export type FirestoreCustomCampaignDetails = {
  title: string;
  description: string;
  tncs: string;
  startDateTime: Date;
  endDateTime: Date;
}

export type FirestoreCustomCampaign = {
  id: string;
  userId: string;
  chances: number;
  campaignId: string;
}

export type FirestoreMail = {
    to: string;
    message: Message
}

export type FirestoreCustomUser = {
    id: string;
    name: string;
    gender: Gender;
    faculty: Faculty;
    year: number;
    telegramHandle: string
    profilePhoto: string;
    thumbnailPhoto: string;
    tokens?: string[]
}

export type FirestoreCustomApplicant = {
    userId: string;
    postId: string;
    status: AppliedRequestStatus;
    updatedTime: Date;
    campaignChances?: CampaignChance;
}

export type FirestoreCustomPost = {
    id: string;
    posterId: string;
    startDateTime: Date;
    endDateTime: Date;
    /** List of users who have been confirmed to be going for the post event */
    location: PostLocation;
    description: string;
    hasBeenUsedForCampaign?: boolean | undefined;
  }

export interface FirestoreCustomNotification {
    id: string;
    type: NotificationType,
    userId: string,
    hasBeenViewed: boolean,
    otherUserId?: string // the user related to ur notification. eg: user who applied to your post
    title?: string,
    data?: FirestoreCustomAppliedRequest | FirestoreCustomCreatedRequest | string
  }

export interface FirestoreCustomCreatedRequest {
    postId: string
  }

export interface FirestoreCustomAppliedRequest {
    userId: string,
    postId: string
  }

