/* global afterEach, beforeEach, describe, it, after, before, process, __dirname */
/**
 * Created by n3okill on 22-12-2015.
 */


"use strict";


const nodePath = require("path");
const nodeOs = require("os");
const enFs = require("enfspatch-promise");
const rimraf = require("rimraf");
const enfsmkdirp = require("enfsmkdirp");
const enFsCopy = require("../");
const utimes = require("./utimes");
const copy = enFsCopy.copyP;
const cwd = process.cwd();

describe("enFsCopyAsyncPreserveTime", function () {
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyasynctime");
    const helpersPath = nodePath.join(__dirname, "helper");
    const isWindows = /^win/.test(process.platform);

    before(function () {
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
    });
    after(function () {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });

    describe("> modification option", function () {
        const FILE = "file1";
        describe("> when modified option is turned off", function () {
            it("should have different timestamp on copy", function () {
                const src = helpersPath;
                const dst = nodePath.join(tmpPath, "off");
                let statSrc, statDst;
                return copy(src, dst, {preserveTimestamps: false}).then(function () {
                    return enFs.statP(nodePath.join(src, FILE));
                }).then(function (statSrc_) {
                    statSrc = statSrc_;
                    return enFs.statP(nodePath.join(dst, FILE));
                }).then(function (statDst_) {
                    statDst = statDst_;
                    // the access time might actually be the same, so check only modification time
                    statSrc.mtime.getTime().should.not.be.equal(statDst.mtime.getTime());
                });
            });
        });

        describe("> when modified option is turned on", function () {
            it("should have the same timestamps on copy", function () {
                const src = helpersPath;
                const dst = nodePath.join(tmpPath, "on");
                let statSrc;
                return copy(src, dst, {preserveTimestamps: true}).then(function () {
                    return enFs.statP(nodePath.join(src, FILE));
                }).then(function (statSrc_) {
                    statSrc = statSrc_;
                    return enFs.statP(nodePath.join(dst, FILE));
                }).then(function (statDst) {
                    if (isWindows) {
                        statDst.mtime.getTime().should.be.equal(utimes.timeRemoveMillis(statSrc.mtime.getTime()));
                        statDst.atime.getTime().should.be.equal(utimes.timeRemoveMillis(statSrc.atime.getTime()));
                    } else {
                        statSrc.mtime.getTime().should.be.equal(statDst.mtime.getTime());
                        statSrc.atime.getTime().should.be.equal(statDst.atime.getTime());
                    }
                });
            });
        });
    });
});
