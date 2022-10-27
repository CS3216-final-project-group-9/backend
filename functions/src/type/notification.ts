import {Post} from "./post";
import {AppliedRequest, CreatedRequest} from "./postApplication";
import {User} from "./user";


export enum NotificationType {
    APPLIED_TO_YOUR_POST,
    CANCELLED_THEIR_APPLICATION,
    ACCEPTED_YOUR_APPLICATION,
    DELETED_POST_YOU_APPLIED_FOR,
    GENERIC_MESSAGE
  }

export interface Notification {
    id: string;
    type: NotificationType,
    hasBeenViewed: boolean,
    otherUser?: User // the user related to ur notification. eg: user who applied to your post
    title?: string,
    data?: AppliedRequest | CreatedRequest | string | Post
}

