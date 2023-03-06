import { ViewType, ViewTypes } from './components/Chart/Chart';

type DateHelperScales = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

export const DAY_DURATION = 24 * 60 * 60 * 1000;
export const WEEK_DURATION = DAY_DURATION * 7;
export const MONTH_DURATION = DAY_DURATION * 30; // for now static month duration

export const addToDate = (date: Date, quantity: number, scale: DateHelperScales) => {
  const newDate = new Date(
    date.getFullYear() + (scale === 'year' ? quantity : 0),
    date.getMonth() + (scale === 'month' ? quantity : 0),
    date.getDate() + (scale === 'day' ? quantity : 0),
    date.getHours() + (scale === 'hour' ? quantity : 0),
    date.getMinutes() + (scale === 'minute' ? quantity : 0),
    date.getSeconds() + (scale === 'second' ? quantity : 0),
    date.getMilliseconds() + (scale === 'millisecond' ? quantity : 0)
  );
  return newDate;
};

export const seedDates = (startDate: Date, endDate: Date, viewType: ViewType) => {
  const offset = viewType === ViewTypes.DAYS ? WEEK_DURATION : MONTH_DURATION;

  let currentDate: Date = new Date(startDate.getTime() - offset);
  let weekCurrentDate: Date = new Date(startDate);

  const dates: Date[] = [currentDate];
  const weekDates: Date[] = [];

  while (currentDate < new Date(endDate.getTime() + offset)) {
    switch (viewType) {
      case ViewTypes.DAYS:
        currentDate = addToDate(currentDate, 1, 'day');
        break;
      case ViewTypes.MONTHS:
        currentDate = addToDate(currentDate, 1, 'month');
        break;
    }
    dates.push(currentDate);
  }

  return dates;
};
