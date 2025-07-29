"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFlags = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const mid_1 = require("./mid");
let server;
let pluginId;
const FLAGS_API_PATH = '/signalk/v2/api/resources/flags';
let IMG_BASE_PATH = '';
const initFlags = (app, id) => {
    server = app;
    pluginId = id;
    initFs();
    initFlagsEndpoints();
};
exports.initFlags = initFlags;
// check path to flag resources
const initFs = async () => {
    const p = __dirname.split('/');
    const sp = p.slice(0, p.indexOf('plugin')).join('/');
    IMG_BASE_PATH = `${sp}/node_modules/flag-icons/flags`;
    try {
        // check path exists
        await (0, promises_1.access)(IMG_BASE_PATH, fs_1.constants.R_OK);
    }
    catch (error) {
        server.setPluginError(`Flags path NOT found!`);
    }
};
const initFlagsEndpoints = () => {
    server.debug(`** Registering Flag resources endpoint(s) **`);
    server.get(`${FLAGS_API_PATH}`, async (req, res) => {
        server.debug(`** ${req.method} ${req.path}`);
        try {
            const list = await listResponse();
            res.status(200).json({
                aspects: ['1x1', '4x3'],
                flags: list
            });
        }
        catch (e) {
            res.status(400).json({
                state: 'FAILED',
                statusCode: 400,
                message: e.message
            });
        }
    });
    server.get(`${FLAGS_API_PATH}/mid/:mid`, (req, res) => {
        server.debug(`** ${req.method} ${req.path}`);
        iconByMid(req.params.mid, req.params.aspect, res);
    });
    server.get(`${FLAGS_API_PATH}/:aspect/:icon`, (req, res) => {
        server.debug(`** ${req.method} ${req.path}`);
        iconResponse(req.params.icon, req.params.aspect, res);
    });
};
/**
   * Build list of flag ids
   * @param aspect Aspect ratio '1x1' or '4x3'
   * @returns array of flag ids
   */
const listResponse = async (aspect = '1x1') => {
    const entries = await (0, promises_1.readdir)(`${IMG_BASE_PATH}/${aspect}`, {
        withFileTypes: true
    });
    return entries.map((entry) => {
        if (entry.isFile()) {
            return entry.name.split('.')[0];
        }
    });
};
/**
 * Send file response for the specified flag id
 * @param aspect Aspect ratio '1x1' or '4x3'
 * @returns svg file contents
 */
const iconResponse = async (id, aspect = '1x1', res) => {
    const flag = `${IMG_BASE_PATH}/${aspect}/${id}.svg`;
    try {
        // check path exists
        await (0, promises_1.access)(flag, fs_1.constants.R_OK);
        res.sendFile(flag, (err) => {
            if (err) {
                res.status(400).json({
                    state: 'FAILED',
                    statusCode: 400,
                    message: err.message
                });
            }
        });
    }
    catch (error) {
        res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: `Flag (${id}) NOT found!`
        });
        return;
    }
};
/**
 * Send file response for the supplied mid
 * @param aspect Aspect ratio '1x1' or '4x3'
 * @returns svg file contents
 */
const iconByMid = async (mid, aspect = '4x3', res) => {
    const code = mid_1.MID[mid][0]?.toLowerCase();
    const flag = `${IMG_BASE_PATH}/${aspect}/${code}.svg`;
    try {
        // check path exists
        await (0, promises_1.access)(flag, fs_1.constants.R_OK);
        res.sendFile(flag, (err) => {
            if (err) {
                res.status(400).json({
                    state: 'FAILED',
                    statusCode: 400,
                    message: err.message
                });
            }
        });
    }
    catch (error) {
        res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: `Flag (${mid}) NOT found!`
        });
        return;
    }
};
