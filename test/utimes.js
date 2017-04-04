/**
 * @project enfscopy
 * @filename index.js
 * @description helper methods for enfscopy module
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.2
 */


"use strict";

const nodePath = require("path");
const nodeOs = require("os");



function kindOf(arg) {
    return arg === null ? "null" : typeof arg === "undefined" ? "undefined" : /^\[object (.*)\]$/.exec(Object.prototype.toString.call(arg))[1].toLowerCase();
}
function isDate(arg) {
    return "date" === kindOf(arg);
}

function isNumber(arg) {
    return "number" === kindOf(arg);
}


function utimesMillis(fs, path, atime, mtime, callback) {
    fs.open(path, "r+", (errOpen, fd) => {
        if (errOpen) {
            return callback(errOpen);
        }
        fs.futimes(fd, atime, mtime, (errFuTimes) => {
            if (errFuTimes) {
                return callback(errFuTimes);
            }
            fs.close(fd, (closeErr)=>{
                callback(errFuTimes || closeErr);
            });
        });
    });
}


function hasMillisRes(fs, callback) {
    let tmpFile = nodePath.join("millis-test" + (new Date()).now().toString() + Math.random().toString().slice(2));
    tmpFile = nodePath.join(nodeOs.tmpDir(), tmpFile);

    //550 millis past UNIX epoch
    const date = new Date(1435410243862);
    fs.writeFile(tmpFile, "enfscopy/utimes", (errWrite) => {
        if (errWrite) {
            return callback(errWrite);
        }
        fs.open(tmpFile, "r+", (errOpen, fd) => {
            if (errOpen) {
                return callback(errOpen);
            }
            fs.futimes(fd, date, date, (errFuTimes) => {
                if (errFuTimes) {
                    return callback(errFuTimes);
                }
                fs.close(fd, (errClose) => {
                    if (errClose) {
                        return callback(errClose);
                    }
                    fs.stat(tmpFile, (errStat, stats) => {
                        if (errStat) {
                            return callback(errStat);
                        }
                        callback(null, stats.mtime > 1435410243000);
                    });
                });
            });
        });
    });
}


//HFS, ext{2,3}, FAT do not, Node.js v0.10 does not
function hasMillisResSync(fs) {
    let tmpFile = nodePath.join("millis-test-sync" + (new Date()).now().toString() + Math.random().toString().slice(2));
    tmpFile = nodePath.join(nodeOs.tmpDir(), tmpFile);

    //550 millis past UNIX epoch
    const date = new Date(1435410243862);
    fs.writeFileSync(tmpFile, "enfscopy/utimes");
    const fd = fs.openSync(tmpFile, "r+");
    fs.futimesSync(fd, date, date);
    fs.closeSync(fd);
    return fs.statSync(tmpFile).mtime > 1435410243000;
}


function timeRemoveMillis(timestamp) {
    if (isNumber(timestamp)) {
        return Math.floor(timestamp / 1000) * 1000;
    } else if (isDate(timestamp)) {
        return new Date(Math.floor(timestamp.getTime() / 1000) * 1000);
    } else {
        throw new Error("enfscopy: timeRemoveMillis() unknown parameter type");
    }
}


module.exports = {
    utimesMillis,
    hasMillisRes,
    hasMillisResSync,
    timeRemoveMillis
};

