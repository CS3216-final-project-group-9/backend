import {DayOfTheWeek, TimeOfDay} from "../type/post";


export function isInsideDateTimeRange(timePeriods: TimeOfDay[], days: DayOfTheWeek[], startDateTime: Date, endDateTime: Date) {
  const endDay = endDateTime.getDay();
  const startDay = startDateTime.getDay();
  if (!(days.includes(endDay) || days.includes(startDay))) return false;
  const startTime = startDateTime.getHours();

  if (between(startTime, 6, 12) && !timePeriods.includes(TimeOfDay.MORNING) ) return false;
  if (between(startTime, 13, 18) && !timePeriods.includes(TimeOfDay.AFTERNOON) ) return false;
  if (between(startTime, 18, 20) && !timePeriods.includes(TimeOfDay.EVENING) ) return false;
  if ((startTime >=20 || startTime <6) && !timePeriods.includes(TimeOfDay.NIGHT) ) return false;

  return true;
}

function between(x: number, min:number, max:number) {
  return x >= min && x <= max;
}
