const getSchedule = require('./parse');
const {login} = require('./post');
const ics = require('ics');
const fs = require('fs');
const express = require('express')
const app = express()
const port = 3069



const client = require('prom-client');
const gateway = new client.Pushgateway('http://192.168.1.203:9091');
const register = new client.Registry();

const requestsGauge = new client.Gauge({
    name: 'requests',
    help: 'All requests',
    labelNames: ['ip', 'browser', 'time']
});
const refreshGauge = new client.Gauge({
    name: 'calendar_refresh',
    help: 'Canlendar refreshes',
    labelNames: ['time']
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

    
    
}

app.use((req, res, next) => {
    const ip = req.ip;
    const browser = req.headers['user-agent'];
    // const currentTime = new Date();
    // currentTime.setHours(currentTime.getHours() + 1);
    const time = currentTime.toLocaleString();
    
    requestsGauge.set({ip: ip, browser: browser, time: time}, 1);

    gateway.pushAdd({ jobName: 'requests_gauge' }, (err) => {
        if (err) {
            console.error('Failed to push metrics to Pushgateway:', err);
        }
    });
    next();
});


(async () => {
    app.set('trust proxy', true)
    await generateCal();
    app.listen(port, () => {
        console.log(`App listening on port:${port}`)
    })


    setInterval(async () => {
        const randomDelay = Math.floor(Math.random() * 60);
        await new Promise(resolve => setTimeout(resolve, randomDelay * 60 * 1000));
        try {
            await generateCal();
            refreshGauge.set({time: new Date().toLocaleString()}, 1);
            gateway.pushAdd({ jobName: 'calendar_refresh_gauge' }, (err) => {
                if (err) {
                    console.error('Failed to push metrics to Pushgateway:', err);
                }
            });
            console.log(new Date().toLocaleString() + ' Refreshed');
        } catch (err) {
            console.error('Error during refresh:', err);
        }
    }, 1000 * 60 * 60 * 3);
})

