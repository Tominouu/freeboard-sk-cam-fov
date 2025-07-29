"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAlarms = void 0;
const server_api_1 = require("@signalk/server-api");
const uuid = require("uuid");
const STANDARD_ALARMS = [
    'mob',
    'fire',
    'sinking',
    'flooding',
    'collision',
    'grounding',
    'listing',
    'adrift',
    'piracy',
    'abandon',
    'aground'
];
let server;
let pluginId;
const ALARM_API_PATH = '/signalk/v2/api/alarms';
const initAlarms = (app, id) => {
    server = app;
    pluginId = id;
    server.debug(`** initAlarms() **`);
    if (server.registerActionHandler) {
        server.debug(`** Registering Alarm Action Handler(s) **`);
        STANDARD_ALARMS.forEach((i) => {
            server.debug(`** Registering ${i} Handler **`);
            server.registerPutHandler('vessels.self', `notifications.${i}`, handleV1PutRequest);
        });
    }
    initAlarmEndpoints();
};
exports.initAlarms = initAlarms;
const initAlarmEndpoints = () => {
    server.debug(`** Registering Alarm Action API endpoint(s) **`);
    server.post(`${ALARM_API_PATH}/:alarmType`, (req, res, next) => {
        server.debug(`** ${req.method} ${ALARM_API_PATH}/${req.params.alarmType}`);
        if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
            next();
            return;
        }
        try {
            const id = uuid.v4();
            const msg = req.body.message
                ? req.body.message
                : req.params.alarmType;
            const r = handleAlarm('vessels.self', `notifications.${req.params.alarmType}.${id}`, Object.assign({
                message: msg,
                method: [server_api_1.ALARM_METHOD.sound, server_api_1.ALARM_METHOD.visual],
                state: server_api_1.ALARM_STATE.emergency
            }, buildAlarmData()));
            res.status(r.statusCode).json(Object.assign(r, { id: id }));
        }
        catch (e) {
            res.status(400).json({
                state: 'FAILED',
                statusCode: 400,
                message: e.message
            });
        }
    });
    server.post(`${ALARM_API_PATH}/:alarmType/:id/silence`, (req, res) => {
        server.debug(`** ${req.method} ${req.path}`);
        if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
            res.status(200).json({
                state: 'COMPLETED',
                statusCode: 200,
                message: `Unsupported Alarm (${req.params.alarmType}).`
            });
            return;
        }
        try {
            const al = server.getSelfPath(`notifications.${req.params.alarmType}.${req.params.id}`);
            if (al && al.value) {
                server.debug('Alarm value....');
                if (al.value.method && al.value.method.includes('sound')) {
                    server.debug('Alarm has sound... silence!!!');
                    al.value.method = al.value.method.filter((i) => i !== 'sound');
                    const r = handleAlarm('vessels.self', `notifications.${req.params.alarmType}.${req.params.id}`, al.value);
                    res.status(r.statusCode).json(r);
                }
                else {
                    server.debug('Alarm has no sound... no action required.');
                    res.status(200).json({
                        state: 'COMPLETED',
                        statusCode: 200,
                        message: `Alarm (${req.params.alarmType}) is already silent.`
                    });
                }
            }
            else {
                throw new Error(`Alarm (${req.params.alarmType}.${req.params.id}) has no value or was not found!`);
            }
        }
        catch (e) {
            res.status(400).json({
                state: 'FAILED',
                statusCode: 400,
                message: e.message
            });
        }
    });
    server.delete(`${ALARM_API_PATH}/:alarmType/:id`, (req, res, next) => {
        server.debug(`** ${req.method} ${ALARM_API_PATH}/${req.params.alarmType}`);
        if (!STANDARD_ALARMS.includes(req.params.alarmType)) {
            next();
            return;
        }
        try {
            const r = handleAlarm('vessels.self', `notifications.${req.params.alarmType}.${req.params.id}`, {
                message: '',
                method: [],
                state: server_api_1.ALARM_STATE.normal
            });
            res.status(r.statusCode).json(r);
        }
        catch (e) {
            res.status(400).json({
                state: 'FAILED',
                statusCode: 400,
                message: e.message
            });
        }
    });
};
const handleV1PutRequest = (context, path, value, cb) => {
    cb(handleAlarm(context, path, value));
};
const buildAlarmData = () => {
    const pos = server.getSelfPath('navigation.position');
    const r = {
        createdAt: new Date().toISOString()
    };
    if (pos) {
        r.position = pos.value;
    }
    return r;
};
const handleAlarm = (context, path, value) => {
    server.debug(`context: ${context}`);
    server.debug(`path: ${path}`);
    server.debug(`value: ${JSON.stringify(value)}`);
    if (!path) {
        server.debug('Error: no path provided!');
        return {
            state: 'COMPLETED',
            resultStatus: 400,
            statusCode: 400,
            message: `Invalid reference!`
        };
    }
    const pa = path.split('.');
    const alarmType = pa[1];
    server.debug(`alarmType: ${JSON.stringify(alarmType)}`);
    if (STANDARD_ALARMS.includes(alarmType)) {
        server.debug(`****** Sending Delta (Std Alarm Notification): ******`);
        emitNotification({
            path: path,
            value: value ?? null
        });
        return { state: 'COMPLETED', resultStatus: 200, statusCode: 200 };
    }
    else {
        return {
            state: 'COMPLETED',
            resultStatus: 400,
            statusCode: 400,
            message: `Invalid reference!`
        };
    }
};
// ** send notification delta message **
const emitNotification = (msg) => {
    const delta = {
        updates: [{ values: [msg] }]
    };
    server.handleMessage(pluginId, delta, server_api_1.SKVersion.v2);
};
