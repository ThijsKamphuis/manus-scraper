require('dotenv').config()
async function getRawSchedule(year, week) {
    const resp = await fetch("https://server.manus.plus/intergamma/app/token", {
        "body": `client_id=employee&grant_type=password&username=${process.env.USER}&password=${process.env.PASSWORD}`,
        "method": "POST"
    });

    const token = (await resp.json()).access_token;

    let workdays = await fetch(`https://server.manus.plus/intergamma/api/node/03829bee-d212-44bc-95e5-1e2dc52a48cb/employee/ec36fb30-40b4-4fe9-bdb8-8f28908d6363/schedule/${year}/${week}/fromData`, {
    "headers": {
        "authorization": `Bearer ${token}`,
    },
    "method": "GET"
    });
    return (await workdays.json());
}

module.exports = getRawSchedule;
