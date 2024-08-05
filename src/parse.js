const getRawSchedule = require('./post');

function convertDays(days) {
  const refDate = new Date(1900, 0, 1);
  const resultDate = new Date(refDate.getTime() + days * 24 * 60 * 60 * 1000);
  const jsonDateString = resultDate.toISOString().split('T')[0];
  return jsonDateString;
}

function convertMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return {
    hours: hours,
    minutes: mins
  };
}


async function getSchedule(year, week) {
  let output = await getRawSchedule(year, week);
  if (output.contracts === undefined || output.departments === undefined|| output.schedule === undefined) {
    return 0;
  }
  let rawSchedule = output.schedule;
  let departments = output.departments;
  let userInfo = output.contracts[0];
  const weekschedule = [];
  for (let i = 0; i < rawSchedule.length; i++) {
    const day = rawSchedule[i];
    const id = day.date;
    const date = convertDays(day.date);
    if (day.entries.length === 0) {
      continue;
    }
    const startTime = convertMinutes(day.entries[0].startTime);
    const endTime = convertMinutes(day.entries[0].endTime);
    const department = departments[day.entries[0].departmentId].name;
    const store = `${userInfo.nodeCode} - ${userInfo.nodeName}`;
    weekschedule.push({ id, date, startTime, endTime, department, store });
  }
  return weekschedule;
};

module.exports = getSchedule;

