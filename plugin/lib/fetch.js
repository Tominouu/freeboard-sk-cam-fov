"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.post = exports.fetch = void 0;
const https = require("https");
const url = require("url");
const http = require("http");
// HTTP GET
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetch = (href) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opt = url.parse(href);
    opt.headers = { 'User-Agent': 'Mozilla/5.0' };
    const req = href.indexOf('https') !== -1 ? https : http;
    return new Promise((resolve, reject) => {
        req
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .get(opt, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data.toString());
                    resolve(json);
                }
                catch (error) {
                    reject(new Error(data));
                }
            });
        })
            .on('error', (error) => {
            reject(error);
        });
    });
};
exports.fetch = fetch;
// HTTP POST
const post = (href, data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opt = url.parse(href);
    (opt.method = 'POST'),
        (opt.headers = {
            'Content-Type': 'application/json'
        });
    const req = href.indexOf('https') !== -1 ? https : http;
    return new Promise((resolve, reject) => {
        const postReq = req
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .request(opt, (res) => {
            let resText = '';
            res.on('data', (chunk) => {
                resText += chunk;
            });
            res.on('end', () => {
                if (Math.floor(res.statusCode / 100) === 2) {
                    resolve({
                        statusCode: res.statusCode,
                        state: 'COMPLETED'
                    });
                }
                else {
                    reject({
                        statusCode: res.statusCode,
                        state: 'FAILED',
                        message: resText
                    });
                }
            });
        })
            .on('error', (error) => {
            reject({
                statusCode: 400,
                state: 'FAILED',
                message: error.message
            });
        });
        postReq.write(data);
        postReq.end();
    });
};
exports.post = post;
