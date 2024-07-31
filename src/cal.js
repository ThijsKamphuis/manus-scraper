const getSchedule = require('./parse');
const ics = require('ics');
const fs = require('fs');
const express = require('express')
const app = express()
const port = 3069

const events = [];
async function generateEvent(day) {

    const date = new Date(day.date);
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth() + 1;
    const dateDay = date.getDate();

    const event = {
        start: [dateYear, dateMonth, dateDay, day.startTime.hours, day.startTime.minutes],
        duration: {
            hours: day.endTime.hours - day.startTime.hours - (day.endTime.minutes < day.startTime.minutes ? 1 : 0),
            minutes: Math.abs(day.endTime.minutes - day.startTime.minutes)
        },
        title: day.department,
        location: day.store,
    }
    events.push(event);

}


async function generateCal() {
    for (let j = 1; j < 34; j++) {
        let schedule = await getSchedule(2024, j);
        for (let i = 0; i < schedule.length; i++) {
            generateEvent(schedule[i]);
        }
    }
    // fs.writeFile('events.json', JSON.stringify(events, null, 2), (err) => {
    //     if (err) {
    //         console.log(err);
    //         return;
    //     }
    // });
    ics.createEvents(events, (error, value) => {
        if (error) {
            console.log(error)
            return
        }
        app.get('/ical.ics', (req, res) => {
            res.set('Content-Disposition', 'attachment; filename="gamma.ics"');
            res.set('Content-Type', 'text/calendar');
            res.send(value);
        })
        console.log('Uploaded ICS');


    })
}


(async () => {
    await generateCal();
    app.listen(port, () => {
        console.log(`App listening on port:${port}`)
    })
    setInterval(async () => {
        await generateCal();
        console.log('Trigger refresh');
    }, 1000 * 60 * 5);
})()