const getSchedule = require('./parse');
const ics = require('ics');
const fs = require('fs');
const express = require('express')
const app = express()
const port = 3069

const events = [];
function generateEvent(day) {

    const date = new Date(day.date);
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth() + 1;
    const dateDay = date.getDate();

    const event = {
        start: [dateYear, dateMonth, dateDay, Math.abs(day.startTime.hours - 2), day.startTime.minutes],
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
    events.length = 0;
    for (let j = 1; j <= 51; j++) {
        let schedule = await getSchedule(2024, j);
        if (schedule === 0) {
            continue;
        }   
        for (let i = 0; i < schedule.length; i++) {
            generateEvent(schedule[i]);
        }
    }
    fs.writeFile('events.json', JSON.stringify(events, null, 2), (err) => {
        if (err) {
            console.log(err);
            return;
        }
    });

    
    app.get('/ical.ics', (req, res) => {
        ics.createEvents(events, (error, value) => {
            if (error) {
                console.log(error);
                return;
            }
            res.set('Content-Disposition', 'attachment; filename="ical.ics"');
            res.set('Content-Type', 'text/calendar');
            res.send(value);
        });
    });
    
    console.log('Uploaded ICS');
    
}


(async () => {
    await generateCal();
    app.listen(port, () => {
        console.log(`App listening on port:${port}`)
    })
    setInterval(async () => {
        try {
            await generateCal();
            console.log('Trigger refresh');
        } catch (err) {
            console.error('Error during refresh:', err);
        }
    }, 1000 * 60 * 5);
})()

