const {getRawSchedule} = require('./post');

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


async function getSchedule(year, week, token) {
  let output = await getRawSchedule(year, week, token);
  if (output.contracts === undefined || output.departments === undefined || output.schedule === undefined) {
    return 0;
  }
  let rawSchedule = output.schedule;
  let departments = output.departments;
  let nodes = output.nodes;
  const weekschedule = [];
  for (let i = 0; i < rawSchedule.length; i++) {
    const day = rawSchedule[i];
    const id = day.date;
    const date = convertDays(day.date);
    if (day.entries.length === 0 || day.vacation.length > 0) {
      continue;
    }
    for (let j = 0; j < day.entries.length; j++) {
      const entry = day.entries[j];
      const startTime = convertMinutes(entry.startTime);
      const endTime = convertMinutes(entry.endTime);
      const department = departments[entry.departmentId].name;
      const store = `${nodes[entry.nodeId].code} - ${nodes[entry.nodeId].name}`;
      weekschedule.push({ id, date, startTime, endTime, department, store });
    }
  }
  return weekschedule;
};

module.exports = getSchedule;

