import {Gender} from "../type/user";

const femalePhotos = [
  ["https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Ffemale1.jpg?alt=media&token=7d6427f0-c40c-46b9-a385-30c01e98a1c0",
    "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2FuncompressedPhotos%2Ffemale1.png?alt=media&token=7a0ca409-1db8-4a6d-87e6-a9e46660b936",
  ],
  ["https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Ffemale2.jpg?alt=media&token=3e6d7939-0497-44be-be6a-98c0a50d6d26",
    "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2FuncompressedPhotos%2Ffemale2.png?alt=media&token=08ec8860-55bd-4e5e-a35b-6f93f8fa104d",
  ],
  ["https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Ffemale3.jpg?alt=media&token=ccd391ce-03e2-44ac-99c6-298238ef7181",
    "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2FuncompressedPhotos%2Ffemale3.png?alt=media&token=2a749269-6a72-4efd-b706-8371680025be",
  ],
];

const malePhotos = [
  ["https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fmale1.jpg?alt=media&token=49374847-dafb-44af-a5cd-f89d9c272dd1",
    "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2FuncompressedPhotos%2Fmale1.png?alt=media&token=a4a789db-25ec-4a29-bb5f-9089b6f8cd51",
  ],
  ["https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fmale2.jpg?alt=media&token=31471f32-8bb7-4346-b1e3-9b0c3ec2e73f",
    "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2FuncompressedPhotos%2Fmale2.png?alt=media&token=42b811e0-847c-4389-a4e5-721c36e99a35",
  ],
  ["https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fmale3.jpg?alt=media&token=1ba83ca4-17d6-4cea-82c4-7af50349c47e",
    "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2FuncompressedPhotos%2Fmale3.png?alt=media&token=7a6a870b-e84e-4fbf-b311-6c7b83b9dfa1",
  ],
];

function getRandom(list: string[][]) {
  return list[Math.floor((Math.random()*list.length))];
}
export const urlDefaultCover = "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/assets%2Fdefault_cover.jpg?alt=media&token=f83c2d95-3159-496f-9caa-7dfbbecf0875";
export function getPhoto(gender: Gender) {
  if (gender == Gender.MALE) {
    return getRandom(malePhotos);
  } else if (gender == Gender.FEMALE) {
    return getRandom(femalePhotos);
  } else {
    return ["https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2Fneutral.jpg?alt=media&token=2929958a-491a-4fb6-a684-0c8b2ca80647",
      "https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/defaultPhoto%2FuncompressedPhotos%2Fneutral.png?alt=media&token=12493307-6f4d-493f-b154-a8ce103831b6"];
  }
}
