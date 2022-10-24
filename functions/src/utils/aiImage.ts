import moment = require("moment-timezone")
import {db} from "../firebase";

export const hasReceivedImageInPastDay = async function hasReceivedImageInPastDay(uid: string) {
  const today = moment().startOf('day');
  const todayEnd = today.clone().endOf('day');
  const art = await db.art.where('userId', '==', uid).where('date', '<=', todayEnd).where('date', '>=', today).get();
  return art.size > 0;
}
