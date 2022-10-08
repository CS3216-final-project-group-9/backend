import {Gender} from "../type/user";

const femalePhotos = [
  "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Ffemale1.jpg?alt=media&token=7d6427f0-c40c-46b9-a385-30c01e98a1c0",
  "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Ffemale2.jpg?alt=media&token=3e6d7939-0497-44be-be6a-98c0a50d6d26",
  "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Ffemale3.jpg?alt=media&token=ccd391ce-03e2-44ac-99c6-298238ef7181",
];

const malePhotos = [
  "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fmale1.jpg?alt=media&token=49374847-dafb-44af-a5cd-f89d9c272dd1",
  "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fmale2.jpg?alt=media&token=31471f32-8bb7-4346-b1e3-9b0c3ec2e73f",
  "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fmale3.jpg?alt=media&token=1ba83ca4-17d6-4cea-82c4-7af50349c47e",
];

function getRandom(list: string[]) {
  return list[Math.floor((Math.random()*list.length))];
}

export function getPhoto(gender: Gender) {
  if (gender == Gender.MALE) {
    return getRandom(malePhotos);
  } else if (gender == Gender.FEMALE) {
    return getRandom(femalePhotos);
  } else {
    return "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fneutral.jpg?alt=media&token=2929958a-491a-4fb6-a684-0c8b2ca80647";
  }
}
