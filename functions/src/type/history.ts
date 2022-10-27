import {Post} from "./post";
import {User} from "./user";

export interface UserHistory {
    totalCreatedStudySessions: number;
    totalAppliedStudySessons: number;
    numPeopleMet: number;
    totalStudyHours: number;
    recentBuddies: User[];
    recentStudySessions: Post[];
  }
