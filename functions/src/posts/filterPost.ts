import {DayOfTheWeek, TimeOfDay} from "../type/post";
import moment = require("moment-timezone");

export function isInsideDateRange(days: DayOfTheWeek[], startDateTime: Date, endDateTime: Date) {
  const endDay = ( moment((endDateTime as any).toDate()).day() + 6)%7 as DayOfTheWeek;
  const startDay = ( moment((startDateTime as any).toDate()).day() + 6 )%7 as DayOfTheWeek;
  console.log(startDateTime);
  console.log(endDateTime);
  console.log(endDay);
  console.log(startDay);

  if (!days.includes(endDay) || !days.includes(startDay)) return false;
  return true;
}

export function isInsideTimeRange(timePeriods: TimeOfDay[], startDateTime: Date, endDateTime: Date) {
  const startTime = moment((startDateTime as any).toDate()).hour();

  if (between(startTime, 6, 12) && !timePeriods.includes(TimeOfDay.MORNING) ) return false;
  if (between(startTime, 13, 18) && !timePeriods.includes(TimeOfDay.AFTERNOON) ) return false;
  if (between(startTime, 18, 20) && !timePeriods.includes(TimeOfDay.EVENING) ) return false;
  if ((startTime >=20 || startTime <6) && !timePeriods.includes(TimeOfDay.NIGHT) ) return false;

  return true;
}

function between(x: number, min:number, max:number) {
  return x >= min && x <= max;
}
