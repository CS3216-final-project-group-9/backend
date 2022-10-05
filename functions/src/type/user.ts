/**
 * Contains all fields for a User.
 */
export type User = {
  id: string;
  name: string;
  gender: Gender;
  faculty: Faculty;
  year: number;
  telegramHandle: string
  profilePhoto: string;
  thumbnailPhoto: string;
}

export enum Faculty {
  ARTS_AND_SOCIAL_SCIENCES,
  BUSINESS,
  COMPUTING,
  DENTISTRY,
  DESIGN_AND_ENGINEERING,
  LAW,
  MEDICINE,
  MUSIC,
  SCIENCE
}


export enum Gender {
    MALE,
    FEMALE,
    PREFER_NOT_TO_SAY
  }
