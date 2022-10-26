/**
 * Contains all fields for a Post.
 */

import {User} from "./user";

export type Post = {
  id: string;
  poster: User
  startDateTime: string;
  endDateTime: string;
  /** List of users who have been confirmed to be going for the post event */
  participants: User[];
  location: PostLocation;
  description: string;
}


export enum DayOfTheWeek {
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
  SUNDAY
}

export enum TimeOfDay {
  MORNING,
  AFTERNOON,
  EVENING,
  NIGHT
}

export interface PostsFilter {
  days: DayOfTheWeek[];
  timesOfDay: TimeOfDay[];
  locations: PostLocation[];
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

