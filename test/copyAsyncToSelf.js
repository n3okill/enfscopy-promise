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

describe("enFsCopyAsyncToSelf", function () {
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopyasynctoself");
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


    describe("> copy to self", function () {
        const src = nodePath.join(tmpPath, "src");
        const out = nodePath.join(tmpPath, "src", "out");
        const srcOut = nodePath.join(tmpPath, "src_out");
        const srcSymlink = nodePath.join(tmpPath, "src_symlink");
        const srcFile = nodePath.join(tmpPath, "src", "file.txt");
        const doubleSrcOut = nodePath.join(src, "src_out");
        const doubleSrcMiddleOut = nodePath.join(src + "_out", src);

        beforeEach(function () {
            enfsmkdirp.mkdirpSync(src);
            enfsmkdirp.mkdirpSync(out);
            enfsmkdirp.mkdirpSync(srcOut);
            enfsmkdirp.mkdirpSync(doubleSrcOut);
            if(!isWindows) {
                enfsmkdirp.mkdirpSync(doubleSrcMiddleOut);
            }
            enFs.writeFileSync(srcFile, "data", "utf8");
        });

        it("returns an error when user copies parent to itself", function () {
            return copy(src, out).catch(function (err) {
                err.should.be.instanceOf(Error);
                err.code.should.be.equal("ESELF");
            });
        });
        it("copies 'src' to 'src' itself don't throw error", function () {
            return copy(src, src).should.be.fulfilled();
        });
        it("copies 'src' to 'src/out' and directory 'src/out' does not exist", function () {
            return copy(src, out).catch(function (err) {
                err.should.be.instanceOf(Error);
                err.code.should.be.equal("ESELF");
            });
        });
        it("copies 'src to 'src_out'", function () {
            return copy(src, srcOut).should.be.fulfilled();
        });
        it("copies 'src' to 'src_symlink'", function () {
            if(isWindows) {
                return;
            }
            enFs.symlinkSync(src, srcSymlink);
            return copy(src, srcSymlink).should.be.fulfilled();
        });
        it("copies file 'src/file.txt' to file 'src/file.txt' don't throw error", function () {
            return copy(srcFile, srcFile).should.be.fulfilled();
        });
        it("copies directory 'src' to 'src/src_out'", function () {
            return copy(src, doubleSrcOut).catch(function (err) {
                err.should.be.instanceOf(Error);
                if (isWindows) {
                    err.message.should.be.equal("Error trying to copy. 'destination' is a sub-directory of 'source'");
                    return;
                }
                err.code.should.be.equal("ESELF");
            });
        });
        it("copies directory 'src' to 'src_out/src'", function () {
            return copy(src, doubleSrcMiddleOut).catch(function (err) {
                if (err && isWindows) {
                    err.message.should.be.equal("Invalid character found in path.");
                }
            });
        });
    });
});
