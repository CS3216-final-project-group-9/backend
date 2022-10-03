import {User} from "./user";

/**
 * Contains all fields for a Post.
 */

export type Post = {
  id: string;
  poster: User
  startDateTime: Date;
  endDateTime: Date;
  personCapacity: number;
  /** List of users who have been confirmed to be going for the post event */
  currPersons: User[];
  location: PostLocation;
}

enum PostLocation {
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

