import {Gender, Faculty} from "./user";
import {PostLocation} from "./post";
import {AppliedRequestStatus} from "./postApplication";


export type FirestoreCustomUser = {
    id: string;
    name: string;
    gender: Gender;
    faculty: Faculty;
    year: number;
    telegramHandle: string
    profilePhoto: string;
    thumbnailPhoto: string;
    createdPostIds: string[];
    participatedPostIds: string[];
}

export type FirestoreCustomParticipant = {
    userId: string;
    status: AppliedRequestStatus;
}

export type FirestoreCustomPost = {
    id: string;
    posterId: string;
    startDateTime: Date;
    endDateTime: Date;
    personCapacity: number;
    /** List of users who have been confirmed to be going for the post event */
    location: PostLocation;
  }
