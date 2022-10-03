/**
 * Contains all fields for a Post.
 */

export type Post = {
  id: string;
  posterId: string
  startDateTime: string;
  endDateTime: string;
  personCapacity: number;
  /** List of users who have been confirmed to be going for the post event */
  participants: string[];
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

