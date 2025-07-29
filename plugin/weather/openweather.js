"use strict";
// OpenWeather
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenWeather = void 0;
const fetch_1 = require("../lib/fetch");
const weather_service_1 = require("./weather-service");
class OpenWeather {
    settings;
    constructor(config) {
        this.settings = config;
    }
    getUrl(position) {
        const v2 = 'https://api.openweathermap.org/data/2.5/onecall';
        const v3 = 'https://api.openweathermap.org/data/3.0/onecall';
        const api = this.settings.apiVersion === 3 ? v3 : v2;
        if (!this.settings.apiKey || !position) {
            return '';
        }
        else {
            return `${api}?lat=${position.latitude}&lon=${position.longitude}&exclude=minutely,daily&appid=${this.settings.apiKey}`;
        }
    }
    fetchData = async (position) => {
        const url = this.getUrl(position);
        const response = await (0, fetch_1.fetch)(url);
        if ('cod' in response) {
            throw new Error(response.message);
        }
        else {
            return this.parseResponse(response);
        }
    };
    parseResponse = (owData) => {
        const res = {};
        res[weather_service_1.defaultStationId] = {
            id: weather_service_1.defaultStationId,
            name: 'Weather data relative to supplied position.',
            position: {
                latitude: owData.lat,
                longitude: owData.lon
            },
            observations: this.parseOWObservations(owData),
            forecasts: this.parseOWForecasts(owData),
            warnings: this.parseOWWarnings(owData)
        };
        return res;
    };
    parseOWObservations(owData) {
        //server.debug(JSON.stringify(weatherData.current))
        const data = [];
        let obs;
        if (owData && owData.current) {
            const current = owData.current;
            obs = {
                date: current.dt
                    ? new Date(current.dt * 1000).toISOString()
                    : new Date().toISOString(),
                description: current.weather[0].description ?? '',
                sun: {
                    sunrise: new Date(current.sunrise * 1000).toISOString() ?? null,
                    sunset: new Date(current.sunset * 1000).toISOString() ?? null
                },
                outside: {
                    uvIndex: current.uvi ?? null,
                    cloudCover: current.clouds ? current.clouds / 100 : null,
                    horizontalVisibility: current.visibility ?? null,
                    temperature: current.temp ?? null,
                    feelsLikeTemperature: current.feels_like ?? null,
                    dewPointTemperature: current.dew_point ?? null,
                    pressure: current.pressure ? current.pressure * 100 : null,
                    absoluteHumidity: current.humidity ? current.humidity / 100 : null,
                    precipitationType: current.rain && typeof current.rain['1h'] !== 'undefined'
                        ? 'rain'
                        : current.snow && typeof current.snow['1h'] !== 'undefined'
                            ? 'snow'
                            : null,
                    precipitationVolume: current.rain && typeof current.rain['1h'] !== 'undefined'
                        ? current.rain['1h']
                        : current.snow && typeof current.snow['1h'] !== 'undefined'
                            ? current.snow['1h']
                            : null
                },
                water: {},
                wind: {
                    speedTrue: current.wind_speed ?? null,
                    directionTrue: typeof current.wind_deg !== 'undefined'
                        ? (Math.PI / 180) * current.wind_deg
                        : null
                }
            };
            data.push(obs);
        }
        return data;
    }
    parseOWForecasts(owData, period = 'hourly') {
        //server.debug(JSON.stringify(owData[period]))
        const data = [];
        if (owData && owData[period] && Array.isArray(owData[period])) {
            const forecasts = owData[period];
            forecasts.forEach((f) => {
                const forecast = {
                    date: f.dt
                        ? new Date(f.dt * 1000).toISOString()
                        : new Date().toISOString(),
                    description: f.weather[0].description ?? '',
                    sun: {},
                    outside: {},
                    water: {},
                    wind: {}
                };
                if (period === 'daily') {
                    forecast.sun.sunrise =
                        new Date(f.sunrise * 1000).toISOString() ?? null;
                    forecast.sun.sunset = new Date(f.sunset * 1000).toISOString() ?? null;
                    forecast.outside.minTemperature = f.temp.min ?? null;
                    forecast.outside.maxTemperature = f.temp.max ?? null;
                    forecast.outside.feelsLikeTemperature = f.feels_like.day ?? null;
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    forecast.outside.feelsLikeTemperature = f.feels_like ?? null;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    forecast.outside.temperature = f.temp ?? null;
                }
                forecast.outside.dewPointTemperature = f.dew_point ?? null;
                forecast.outside.uvIndex = f.uvi ?? null;
                forecast.outside.cloudCover = f.clouds ? f.clouds / 100 : null;
                forecast.outside.pressure =
                    typeof f.pressure !== 'undefined' ? f.pressure * 100 : null;
                forecast.outside.absoluteHumidity = f.humidity
                    ? f.humidity / 100
                    : null;
                forecast.wind.speedTrue = f.wind_speed ?? null;
                forecast.wind.directionTrue =
                    typeof f.wind_deg !== 'undefined'
                        ? (Math.PI / 180) * f.wind_deg
                        : null;
                forecast.wind.gust = f.wind_gust ?? null;
                if (f.rain && typeof f.rain['1h'] !== 'undefined') {
                    forecast.outside.precipitationType = 'rain';
                    forecast.outside.precipitationVolume = f.rain['1h'] ?? null;
                }
                else if (f.snow && typeof f.snow['1h'] !== 'undefined') {
                    forecast.outside.precipitationType = 'snow';
                    forecast.outside.precipitationVolume = f.snow['1h'] ?? null;
                }
                data.push(forecast);
            });
        }
        return data;
    }
    parseOWWarnings(owData) {
        //server.debug(JSON.stringify(weatherData.alerts))
        const data = [];
        if (owData && owData.alerts) {
            const alerts = owData.alerts;
            alerts.forEach((alert) => {
                const warn = {
                    startTime: alert.start
                        ? new Date(alert.start * 1000).toISOString()
                        : null,
                    endTime: alert.end
                        ? new Date(alert.start * 1000).toISOString()
                        : null,
                    details: alert.description ?? null,
                    source: alert.sender_name ?? null,
                    type: alert.event ?? null
                };
                data.push(warn);
            });
        }
        return data;
    }
}
exports.OpenWeather = OpenWeather;
