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
const copy = enFsCopy.copyP;
const cwd = process.cwd();

describe("enFsCopyAsyncDevNull", function () {
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyAsyncDev");
    const isWindows = /^win/.test(process.platform);

    before(function () {
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
    });
    afterEach(function () {
        rimraf.sync(tmpPath + nodePath.sep + "*");
    });
    after(function () {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });
    describe("+ copy()", function () {
        it("should return an error", function () {
            // no /dev/null on windows
            if (isWindows) {
                return;
            }
            return copy("/dev/null", nodePath.join(tmpPath, "file.txt")).then(function () {
                enFs.lstatSync(nodePath.join(tmpPath, "file.txt")).size.should.be.equal(0);
            });
        });
    });
});
