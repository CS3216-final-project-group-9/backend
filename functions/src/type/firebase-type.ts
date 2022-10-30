import {Gender, Faculty} from "./user";
import {Post, PostLocation} from "./post";
import {AppliedRequestStatus} from "./postApplication";
import {BuddyNotificationType} from "./notification";
import {CampaignChance} from "./campaign";
import {AIImageTrigger} from "./ImageTrigger";

type Message = {
    subject: string;
    text: string;
    html: string;
}

export type FirestoreCustomArt = {
  prompt: string;
  date: Date;
  userId: string;
  source: string;
  trigger: AIImageTrigger;
  milestone?: number;
  image?: string;
  isPublic: boolean;
}

export type FirestoreCustomCampaignDetails = {
  title: string;
  description: string;
  tncs: string;
  startDateTime: Date;
  endDateTime: Date;
  image: string;
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
    dateAccepted?: Date;
    dateApplied?: Date;
}

export type FirestoreCustomPost = {
    id: string;
    posterId: string;
    startDateTime: Date;
    endDateTime: Date;
    location: PostLocation;
    description: string;
    hasBeenUsedForCampaign?: CampaignChance | undefined;
  }

export interface FirestoreCustomNotification {
    id: string;
    type: BuddyNotificationType,
    userId: string,
    hasBeenViewed: boolean,
    otherUserId?: string // the user related to ur notification. eg: user who applied to your post
    title?: string,
    data?: FirestoreCustomAppliedRequest | FirestoreCustomCreatedRequest | string | FirestoreCustomOldPost,
    updatedTime: Date
  }

export interface FirestoreCustomCreatedRequest {
    postId: string
  }

export interface FirestoreCustomAppliedRequest {
    userId: string,
    postId: string
  }

export interface FirestoreCustomOldPost {
  post: Post
}

