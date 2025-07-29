"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeather = exports.listWeather = exports.stopWeather = exports.initWeather = exports.WEATHER_POLL_INTERVAL = exports.defaultStationId = void 0;
// **** Experiment: OpenWeather integration ****
const server_api_1 = require("@signalk/server-api");
const openweather_1 = require("./openweather");
// default weather station context
exports.defaultStationId = `freeboard-sk`;
let server;
let pluginId;
const wakeInterval = 60000;
let lastWake; // last wake time
let lastFetch; // last successful fetch
let fetchInterval = 3600000; // 1hr
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let timer;
const errorCountMax = 5; // max number of consecutive errors before terminating timer
let errorCount = 0; // number of consecutive fetch errors (no position / failed api connection, etc)
let weatherData;
let weatherService;
let weatherServiceName;
exports.WEATHER_POLL_INTERVAL = [60, 30, 15];
const initWeather = (app, id, config) => {
    server = app;
    pluginId = id;
    fetchInterval = (config.pollInterval ?? 60) * 60000;
    if (isNaN(fetchInterval)) {
        fetchInterval = 60 * 60000;
    }
    server.debug(`*** Weather: settings: ${JSON.stringify(config)}`);
    server.debug(`*** fetchInterval: ${fetchInterval}`);
    weatherService = new openweather_1.OpenWeather(config);
    weatherServiceName = 'openweather';
    initMeteoEndpoints();
    if (!timer) {
        server.debug(`*** Weather: startTimer..`);
        timer = setInterval(() => fetchWeatherData(), wakeInterval);
    }
    fetchWeatherData();
};
exports.initWeather = initWeather;
/** Initialise API endpoints */
const initMeteoEndpoints = () => {
    const meteoPath = '/signalk/v2/api/meteo';
    server.get(`${meteoPath}`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}`);
        const r = await (0, exports.listWeather)({});
        res.status(200);
        res.json(r);
    });
    server.get(`${meteoPath}/:id`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}/:id`);
        const r = weatherData && weatherData[req.params.id]
            ? weatherData[req.params.id]
            : {};
        res.status(200);
        res.json(r);
    });
    server.get(`${meteoPath}/:id/observations`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}/:id/observations`);
        const r = weatherData &&
            weatherData[req.params.id] &&
            weatherData[req.params.id].observations
            ? weatherData[req.params.id].observations
            : {};
        res.status(200);
        res.json(r);
    });
    server.get(`${meteoPath}/:id/observations/:index`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}/:id/observations/:index`);
        const r = weatherData &&
            weatherData[req.params.id] &&
            weatherData[req.params.id].observations &&
            weatherData[req.params.id].observations[req.params.index]
            ? weatherData[req.params.id].observations[req.params.index]
            : {};
        res.status(200);
        res.json(r);
    });
    server.get(`${meteoPath}/:id/forecasts`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}/:id/forecasts`);
        const r = weatherData &&
            weatherData[req.params.id] &&
            weatherData[req.params.id].forecasts
            ? weatherData[req.params.id].forecasts
            : {};
        res.status(200);
        res.json(r);
    });
    server.get(`${meteoPath}/:id/forecasts/:index`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}/:id/forecasts/:index`);
        const r = weatherData &&
            weatherData[req.params.id] &&
            weatherData[req.params.id].forecasts &&
            weatherData[req.params.id].forecasts[req.params.index]
            ? weatherData[req.params.id].forecasts[req.params.index]
            : {};
        res.status(200);
        res.json(r);
    });
    server.get(`${meteoPath}/:id/warnings`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}/:id/warnings`);
        const r = weatherData &&
            weatherData[req.params.id] &&
            weatherData[req.params.id].warnings
            ? weatherData[req.params.id].warnings
            : {};
        res.status(200);
        res.json(r);
    });
    server.get(`${meteoPath}/:id/warnings/:index`, async (req, res) => {
        server.debug(`${req.method} ${meteoPath}/:id/warnings/:index`);
        const r = weatherData &&
            weatherData[req.params.id] &&
            weatherData[req.params.id].warnings &&
            weatherData[req.params.id].warnings[req.params.index]
            ? weatherData[req.params.id].warnings[req.params.index]
            : {};
        res.status(200);
        res.json(r);
    });
};
/** stop weather service */
const stopWeather = () => {
    stopTimer();
    lastFetch = fetchInterval - 1;
};
exports.stopWeather = stopWeather;
/** stop interval timer */
const stopTimer = () => {
    if (timer) {
        server.debug(`*** Weather: Stopping timer.`);
        clearInterval(timer);
    }
};
/**
 * Handle fetch errors
 * @param msg mesgage to log
 */
const handleError = (msg) => {
    console.log(msg);
    errorCount++;
    if (errorCount >= errorCountMax) {
        // max retries exceeded.... going to sleep
        console.log(`*** Weather: Failed to fetch data after ${errorCountMax} attempts.\nRestart ${pluginId} plugin to retry.`);
        stopTimer();
    }
    else {
        console.log(`*** Weather: Error count = ${errorCount} of ${errorCountMax}`);
        console.log(`*** Retry in  ${wakeInterval / 1000} seconds.`);
    }
};
/** Fetch weather data from provider */
const fetchWeatherData = () => {
    server.debug(`*** Weather: fetchWeatherData()`);
    // runaway check
    if (lastWake) {
        const dt = Date.now() - lastWake;
        const flagValue = wakeInterval - 10000;
        if (dt < flagValue) {
            server.debug(`Watchdog -> Awake!...(${dt / 1000} secs)... stopping timer...`);
            stopTimer();
            server.setPluginError('Weather timer stopped by watchdog!');
            return;
        }
    }
    lastWake = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pos = server.getSelfPath('navigation.position');
    if (!pos) {
        handleError(`*** Weather: No vessel position detected!`);
        return;
    }
    server.debug(`*** Vessel position: ${JSON.stringify(pos.value)}.`);
    // check if fetchInterval has lapsed
    if (lastFetch) {
        const e = Date.now() - lastFetch;
        if (e < fetchInterval) {
            server.debug(`*** Weather: Next poll due in ${Math.round((fetchInterval - e) / 60000)} min(s)... sleeping for ${wakeInterval / 1000} seconds...`);
            return;
        }
    }
    if (errorCount < errorCountMax) {
        server.debug(`*** Weather: Calling service API.....`);
        server.debug(`Position: ${JSON.stringify(pos.value)}`);
        server.debug(`*** Weather: polling weather provider.`);
        weatherService
            .fetchData(pos.value)
            .then((data) => {
            server.debug(`*** Weather: data received....`);
            server.debug(JSON.stringify(data));
            errorCount = 0;
            lastFetch = Date.now();
            lastWake = Date.now();
            weatherData = data;
            emitMeteoDeltas();
            checkForWarnings();
        })
            .catch((err) => {
            handleError(`*** Weather: ERROR polling weather provider!`);
            console.log(err.message);
            server.setPluginError(err.message);
        });
    }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listWeather = async (params) => {
    server.debug(`getWeather ${JSON.stringify(params)}`);
    const res = {};
    if (weatherData) {
        for (const o in weatherData) {
            const { id, name, position } = weatherData[o];
            res[o] = { id, name, position };
        }
    }
    return res;
};
exports.listWeather = listWeather;
const getWeather = async (path, property
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => {
    server.debug(`getWeather ${path}, ${property}`);
    if (!weatherData) {
        return {};
    }
    const station = weatherData[path];
    if (!station) {
        throw `Weather station ${path} not found!`;
    }
    if (property) {
        const value = property.split('.').reduce((acc, val) => {
            return acc[val];
        }, station);
        return value ?? {};
    }
    else {
        return station;
    }
};
exports.getWeather = getWeather;
// check  for weather warnings in returned data
const checkForWarnings = () => {
    if ('defaultStationId' in weatherData) {
        if (weatherData[exports.defaultStationId].warnings &&
            Array.isArray(weatherData[exports.defaultStationId].warnings)) {
            server.debug(`*** No. Warnings ${weatherData[exports.defaultStationId].warnings.length}`);
            if (weatherData[exports.defaultStationId].warnings.length !== 0) {
                emitWarningNotification(weatherData[exports.defaultStationId].warnings[0]);
            }
            else {
                emitWarningNotification();
            }
        }
        else {
            emitWarningNotification();
        }
    }
};
// emit weather warning notification
const emitWarningNotification = (warning) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let delta;
    if (warning) {
        server.debug(`** Setting Notification **`);
        server.debug(JSON.stringify(warning));
        delta = {
            path: 'notifications.meteo.warning',
            value: {
                state: server_api_1.ALARM_STATE.warn,
                method: [server_api_1.ALARM_METHOD.visual],
                message: warning.details
                    ? warning.details
                    : warning.type ?? warning.source
            }
        };
    }
    else {
        server.debug(`** Clearing Notification **`);
        delta = {
            path: 'notifications.meteo.warning',
            value: {
                state: server_api_1.ALARM_STATE.normal,
                method: [],
                message: ''
            }
        };
    }
    server.handleMessage(pluginId, {
        context: `meteo.${exports.defaultStationId}`,
        updates: [{ values: [delta] }]
    }, server_api_1.SKVersion.v2);
};
// Meteo methods
const emitMeteoDeltas = () => {
    const pathRoot = 'environment';
    const deltaValues = [];
    server.debug('**** METEO - emit deltas*****');
    if (weatherData) {
        deltaValues.push({
            path: 'navigation.position',
            value: weatherData[exports.defaultStationId].position
        });
        const obs = weatherData[exports.defaultStationId].observations;
        server.debug('**** METEO *****');
        if (obs && Array.isArray(obs)) {
            server.debug('**** METEO OBS *****');
            obs.forEach((o) => {
                deltaValues.push({
                    path: ``,
                    value: { name: weatherServiceName }
                });
                if (typeof o.date !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.date`,
                        value: o.date
                    });
                }
                if (typeof o.outside.horizontalVisibility !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.horizontalVisibility`,
                        value: o.outside.horizontalVisibility
                    });
                }
                if (typeof o.sun.sunrise !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.sun.sunrise`,
                        value: o.sun.sunrise
                    });
                }
                if (typeof o.sun.sunset !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.sun.sunset`,
                        value: o.sun.sunset
                    });
                }
                if (typeof o.outside.uvIndex !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.uvIndex`,
                        value: o.outside.uvIndex
                    });
                }
                if (typeof o.outside.cloudCover !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.cloudCover`,
                        value: o.outside.cloudCover
                    });
                }
                if (typeof o.outside.temperature !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.temperature`,
                        value: o.outside.temperature
                    });
                }
                if (typeof o.outside.dewPointTemperature !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.dewPointTemperature`,
                        value: o.outside.dewPointTemperature
                    });
                }
                if (typeof o.outside.feelsLikeTemperature !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.feelsLikeTemperature`,
                        value: o.outside.feelsLikeTemperature
                    });
                }
                if (typeof o.outside.pressure !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.pressure`,
                        value: o.outside.pressure
                    });
                }
                if (typeof o.outside.relativeHumidity !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.relativeHumidity`,
                        value: o.outside.relativeHumidity
                    });
                }
                if (typeof o.outside.absoluteHumidity !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.absoluteHumidity`,
                        value: o.outside.absoluteHumidity
                    });
                }
                if (typeof o.outside.precipitationType !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.outside.precipitationType`,
                        value: o.outside.precipitationType
                    });
                }
                if (typeof o.wind.speedTrue !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.wind.speedTrue`,
                        value: o.wind.speedTrue
                    });
                }
                if (typeof o.wind.directionTrue !== 'undefined') {
                    deltaValues.push({
                        path: `${pathRoot}.wind.directionTrue`,
                        value: o.wind.directionTrue
                    });
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updates = {
                values: deltaValues
            };
            server.handleMessage(pluginId, {
                context: `meteo.${exports.defaultStationId}`,
                updates: [updates]
            }, server_api_1.SKVersion.v1);
        }
    }
};
