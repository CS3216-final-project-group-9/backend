export type Campaign = {
    id: string;
    userId: string;
    chances: number;
    title: string;
    description: string;
    tncs: string;
    startDateTime: string;
    endDateTime: string;
    image: string;
  }

export enum CampaignChance {
  NOT_RECORDED,
  RECORDED_CREATE,
  RECORDED_ACCEPT,
  RECORDED_ACCEPT_AND_CREATE
}
