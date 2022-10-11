import {Gender, Faculty} from "./user";
import {PostLocation} from "./post";
import {AppliedRequestStatus} from "./postApplication";

type Message = {
    subject: string;
    text: string;
    html: string;
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
}

export type FirestoreCustomParticipant = {
    userId: string;
    postId: string;
    status: AppliedRequestStatus;
}

export type FirestoreCustomPost = {
    id: string;
    posterId: string;
    startDateTime: Date;
    endDateTime: Date;
    /** List of users who have been confirmed to be going for the post event */
    location: PostLocation;
    description: string;
  }
