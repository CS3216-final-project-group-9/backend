import { Post } from "./post";
import { User } from "./user";

/**
 * Status values for a request.
 */
export enum AppliedRequestStatus {
  ACCEPTED,
  PENDING,
  REJECTED
}

/**
 * Contains all details for an applied request.
 */
 export interface AppliedRequest {
  post: Post;
  status: AppliedRequestStatus;
}

/**
 * Contains all details for a created request.
 */
export interface CreatedRequest {
  post: Post;
  /** List of users who have applied for this post */
  applicants: User[];
}



  

  