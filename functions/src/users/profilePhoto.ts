import { Gender } from "../type/user";

const femalePhotos = [
    "gs://cs3216-final-group-9.appspot.com/defaultPhoto/female1.png",
    "gs://cs3216-final-group-9.appspot.com/defaultPhoto/female2.png",
    "gs://cs3216-final-group-9.appspot.com/defaultPhoto/female3.png"
]

const malePhotos = [
    "gs://cs3216-final-group-9.appspot.com/defaultPhoto/male1.png",
    "gs://cs3216-final-group-9.appspot.com/defaultPhoto/male2.png",
    "gs://cs3216-final-group-9.appspot.com/defaultPhoto/male3.png"
]

function getRandom (list: string[]) {
    return list[Math.floor((Math.random()*list.length))];
}

export function getPhoto(gender: Gender) {
    if(gender == Gender.MALE) {
        return getRandom(malePhotos)
    } else if (gender == Gender.FEMALE) {
        return getRandom(femalePhotos)
    } else {
        return "gs://cs3216-final-group-9.appspot.com/defaultPhoto/neutral.png"
    }
}