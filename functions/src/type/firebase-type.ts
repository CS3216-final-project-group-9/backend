import {Gender, Faculty } from "./user";
import {PostLocation} from "./post";


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

export type FirestoreCustomPost = {
    id: string;
    posterId: string;
    startDateTime: Date;
    endDateTime: Date;
    personCapacity: number;
    /** List of users who have been confirmed to be going for the post event */
    participantIds: string[];
    location: PostLocation;
  }
