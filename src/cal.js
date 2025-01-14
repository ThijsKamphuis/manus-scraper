const getSchedule = require('./parse');
const ics = require('ics');
const fs = require('fs');
const express = require('express')
const app = express()
const port = 3069


const client = require('prom-client');
const gateway = new client.Pushgateway('http://localhost:9091');
const register = new client.Registry();

const requestsGauge = new client.Gauge({
    name: 'requests',
    help: 'All requests',
    labelNames: ['ip', 'browser', 'time']
});




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

    
    
}


(async () => {
    app.use((req, res, next) => {
        const ip = req.ip;
        const browser = req.headers['user-agent'];
        const time = new Date().toLocaleString();
        
        // Set the Gauge metric for each request with method, route, and time
        requestsGauge.set({ip: ip, browser: browser, time: time}, 1);
    
        // Push the updated metrics to Pushgateway
        gateway.pushAdd({ jobName: 'requests_gauge' }, (err) => {
            if (err) {
                console.error('Failed to push metrics to Pushgateway:', err);
            }
        });
        next();
    });

    app.set('trust proxy', true)
    app.listen(port, () => {
        console.log(`App listening on port:${port}`)
    })

    app.get('/ical.ics', async (req, res) => {
        await generateCal();
        ics.createEvents(events, (error, value) => {
            if (error) {
                console.log(error);
                return;
            }
            res.set('Content-Disposition', 'attachment; filename="ical.ics"');
            res.set('Content-Type', 'text/calendar');
            res.send(value);
        });
        console.log("IP: " + req.ip);
        console.log("Browser: " + req.headers['user-agent']);
        console.log("Time: " + new Date().toLocaleString());
    });

    

})()

