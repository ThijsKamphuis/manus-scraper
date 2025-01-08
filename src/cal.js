const getSchedule = require('./parse');
const login = require('./post');
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

    const isDST = (date) => {
        const lastSunday = (month) => {
            const d = new Date(date.getFullYear(), month + 1, 0);
            const day = d.getDay();
            return d.getDate() - day;
        };

        const lastSundayMarch = new Date(date.getFullYear(), 2, lastSunday(2));
        const lastSundayOctober = new Date(date.getFullYear(), 9, lastSunday(9));

        return date >= lastSundayMarch && date <= lastSundayOctober;
    };

    const offset = isDST(date) ? 2 : 1;

    const event = {
        start: [dateYear, dateMonth, dateDay, Math.abs(day.startTime.hours - offset), day.startTime.minutes],
        duration: {
            hours: day.endTime.hours - day.startTime.hours - (day.endTime.minutes < day.startTime.minutes ? 1 : 0),
            minutes: Math.abs(day.endTime.minutes - day.startTime.minutes)
        },
        title: day.department,
        location: day.store,
    };
    events.push(event);

}


async function generateCal() {
    const token = await login();
    events.length = 0;
    for (let y = 2022; y <= 2025; y++) {
        for (let j = 1; j <= 52; j++) {
            let schedule = await getSchedule(y, j, token);
            if (schedule === 0) {
                continue;
            }   
            for (let i = 0; i < schedule.length; i++) {
                generateEvent(schedule[i]);
            }
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

