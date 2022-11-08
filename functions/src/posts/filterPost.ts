import {DayOfTheWeek, TimeOfDay} from "../type/post";
import moment = require("moment-timezone");

export function isInsideDateRange(days: DayOfTheWeek[], startDateTime: Date, endDateTime: Date) {
  const endDay = ( moment((endDateTime as any).toDate()).day() + 6)%7 as DayOfTheWeek;
  const startDay = ( moment((startDateTime as any).toDate()).day() + 6 )%7 as DayOfTheWeek;
  if (!days.includes(endDay) || !days.includes(startDay)) return false;
  return true;
}

export function isInsideTimeRange(timePeriods: TimeOfDay[], startDateTime: Date, endDateTime: Date) {
  const startTime = moment((startDateTime as any).toDate()).utcOffset(8).hour();
  const isMorning = between(startTime, 6, 12) && !timePeriods.includes(TimeOfDay.MORNING);
  const isNoon = between(startTime, 13, 18) && !timePeriods.includes(TimeOfDay.AFTERNOON);
  const isEvening = between(startTime, 18, 20) && !timePeriods.includes(TimeOfDay.EVENING);
  const isNight = (startTime >=20 || startTime <6) && !timePeriods.includes(TimeOfDay.NIGHT);
  console.log(18, (startDateTime as any).toDate(), startTime, isMorning, isNoon, isEvening, isNight);

  if (between(startTime, 6, 11) && !timePeriods.includes(TimeOfDay.MORNING)) {
    console.log('fails morning');
    return false;
  }
  if (between(startTime, 12, 17) && !timePeriods.includes(TimeOfDay.AFTERNOON)) {
    console.log('fails noon');
    return false;
  }
  if (between(startTime, 18, 19) && !timePeriods.includes(TimeOfDay.EVENING)) {
    console.log('fails evening');
    return false;
  }
  if ((startTime >=20 || startTime <6) && !timePeriods.includes(TimeOfDay.NIGHT)) {
    console.log('fails night');
    return false;
  }
  console.log('passes time check');
  return true;
}

function between(x: number, min:number, max:number) {
  return x >= min && x <= max;
}
