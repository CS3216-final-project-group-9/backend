/**
 * Contains all fields for a User.
 */
export type User = {
  id: string;
  name: string;
  gender: Gender;
  faculty: string;
  year: number;
  telegramHandle: string
  profilePhoto: string;
  thumbnailPhoto: string;
}

export enum Gender {
    MALE,
    FEMALE,
    PREFER_NOT_TO_SAY
  }
