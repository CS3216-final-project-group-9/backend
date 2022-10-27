import {db} from "../firebase";
import {parseFirestoreArtToArt} from "../utils/type-converter";
import moment = require("moment");
import {Art} from "../type/art";

export const getUserArt = async function getUserArt(uid: string) {
  const query = await db.art.where('userId', '==', uid).get();
  const results: Art[] = [];
  query.docs.forEach((doc) => {
    const data = doc.data();
    const obj = parseFirestoreArtToArt(data, doc.id);
    if (obj) {
      results.push(obj);
    }
  });
  const sorted = results.sort((a, b) => {
    const aDate = moment(a.date);
    return -aDate.diff(b.date, 'minute'); // latest first
  });
  return sorted;
};

