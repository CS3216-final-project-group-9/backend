/**
 * Contains all fields for a Post.
 */

import {User} from "./user";

export type Post = {
  id: string;
  poster: User
  startDateTime: Date;
  endDateTime: Date;
  personCapacity: number;
  /** List of users who have been confirmed to be going for the post event */
  participants: User[];
  location: PostLocation;
}


export enum PostLocation {
  CLB,
  UTOWN,
  SCIENCE,
  FASS,
  ENGINEERING,
  BIZ,
  SDE,
  SOC,
  LAW
}

