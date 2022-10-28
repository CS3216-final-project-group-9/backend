import {DayOfTheWeek, TimeOfDay} from "../type/post";
import moment = require("moment-timezone");

export function isInsideDateRange(days: DayOfTheWeek[], startDateTime: Date, endDateTime: Date) {
  const endDay = ( moment(endDateTime).days() - 1)%7 as DayOfTheWeek;
  const startDay = ( moment(endDateTime).days() - 1)%7 as DayOfTheWeek;

  if (!days.includes(endDay) && !days.includes(startDay)) return false;
  return true;
}

export function isInsideTimeRange(timePeriods: TimeOfDay[], startDateTime: Date, endDateTime: Date) {
  const startTime = moment(startDateTime).hour();

  if (between(startTime, 6, 12) && !timePeriods.includes(TimeOfDay.MORNING) ) return false;
  if (between(startTime, 13, 18) && !timePeriods.includes(TimeOfDay.AFTERNOON) ) return false;
  if (between(startTime, 18, 20) && !timePeriods.includes(TimeOfDay.EVENING) ) return false;
  if ((startTime >=20 || startTime <6) && !timePeriods.includes(TimeOfDay.NIGHT) ) return false;

  return true;
}

function between(x: number, min:number, max:number) {
  return x >= min && x <= max;
}
