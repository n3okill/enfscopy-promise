/* global afterEach, beforeEach, describe, it, after, before, process, __dirname */
/**
 * Created by n3okill on 22-12-2015.
 */


"use strict";


const nodePath = require("path");
const nodeOs = require("os");
const enFs = require("enfspatch-promise");
const nodeCrypto = require("crypto");
const rimraf = require("rimraf");
const enfsmkdirp = require("enfsmkdirp");
const enFsCopy = require("../");
const copy = enFsCopy.copyP;
const cwd = process.cwd();

describe("enfscopy-promise", function () {
    let windowsTestLink = true;
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfscopy-promise");
    const SIZE = 16 * 64 * 1024 + 7;
    const isWindows = /^win/.test(process.platform);
    let FILES = 2;

    before(function () {
        enfsmkdirp.mkdirpSync(tmpPath);
        process.chdir(tmpPath);
        if (isWindows) {
            enFs.writeFileSync(nodePath.join(tmpPath, "windowsTest", ""));
            try {
                enFs.symlinkSync(nodePath.join(tmpPath, "windowsTestLink"), nodePath.join(tmpPath, "windowsTest"), "file");
            } catch (err) {
                if (err.code === "EPERM") {
                    console.warn("Not running tests with symlink in windows, don't have permissions, \nif you wan't to test this try running as administrator.");
                    windowsTestLink = false;
                }
            }
        }
        enFs.writeFileSync(nodePath.join(tmpPath, "TEST_enfscopy_src"), nodeCrypto.randomBytes(SIZE));
        enFs.writeFileSync(nodePath.join(tmpPath, "file.bin"), "");
        enFs.writeFileSync(nodePath.join(tmpPath, "file.css"), "");
        enFs.writeFileSync(nodePath.join(tmpPath, "file1.bin"), "");
        enFs.writeFileSync(nodePath.join(tmpPath, "file.txt"), "did it copy?\n", "utf8");
        enFs.mkdirSync(nodePath.join(tmpPath, "srca"));
        for (let i = 0; i < FILES; i++) {
            enFs.writeFileSync(nodePath.join(tmpPath, "srca", i.toString()), nodeCrypto.randomBytes(SIZE));
        }
        enFs.mkdirSync(nodePath.join(tmpPath, "srca", "subdir"));
        for (let i = 0; i < FILES; i++) {
            enFs.writeFileSync(nodePath.join(tmpPath, "srca", "subdir", i.toString()), nodeCrypto.randomBytes(SIZE));
        }
        enFs.mkdirSync(nodePath.join(tmpPath, "data"));
        enFs.writeFileSync(nodePath.join(tmpPath, "data", "f1.txt"), "file1");
        enFs.writeFileSync(nodePath.join(tmpPath, "data", "f2.txt"), "file2");
        enFs.writeFileSync(nodePath.join(tmpPath, "identicalFile"), "some data");
        enFs.writeFileSync(nodePath.join(tmpPath, "identicalFile1"), "some data");
        if (windowsTestLink) {
            enFs.symlinkSync(nodePath.join(tmpPath, "identicalFile"), nodePath.join(tmpPath, "testLink"), "file");
            enFs.symlinkSync(nodePath.join(tmpPath, "identicalFile1"), nodePath.join(tmpPath, "testLink1"), "file");
        }
    });
    after(function () {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });
    describe("> when the source is a file", function () {
        it("should copy the file", function () {
            const src = nodePath.join(tmpPath, "TEST_enfscopy_src");
            const dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
            const srcMd5 = nodeCrypto.createHash("md5").update(enFs.readFileSync(src)).digest("hex");
            return copy(src, dst).then(function () {
                const dstMd5 = nodeCrypto.createHash("md5").update(enFs.readFileSync(dst)).digest("hex");
                srcMd5.should.be.equal(dstMd5);
            });
        });
        it("should return an error if the source file does not exist", function () {
            const src = "this-file-does-not-exist.file";
            const dst = nodePath.join(tmpPath, "TEST_enfscopy_dst");
            return copy(src, dst).catch(function (err) {
                err.should.be.instanceOf(Error);
            });
        });
        it("should only copy files allowed by filter regex", function () {
            const src = nodePath.join(tmpPath, "file.bin");
            const dst = nodePath.join(tmpPath, "dstfile.html");
            const filter = /.html$|.css$/i;
            return copy(src, dst, filter).then(function () {
                return enFs.statP(dst);
            }).catch(function (errStat) {
                errStat.should.be.instanceof(Error);
            });
        });
        it("should only copy files allowed by filter function", function () {
            const src = nodePath.join(tmpPath, "file.css");
            const dst = nodePath.join(tmpPath, "dstFile.css");
            const filter = function (path/*, stats*/) {
                return path.split(".").pop() !== "css";
            };
            return copy(src, dst, filter).then(function () {
                return enFs.statP(dst);
            }).catch(function (errStat) {
                errStat.should.be.instanceOf(Error);
            });
        });
        it("accepts options object in place of filter", function () {
            const src = nodePath.join(tmpPath, "file1.bin");
            const dst = nodePath.join(tmpPath, "dstFile.bin");
            return copy(src, dst, {filter: /.html$|.css$/i}).then(function () {
                return enFs.statP(dst);
            }).catch(function (errStat) {
                errStat.should.be.instanceOf(Error);
            });
        });
        describe("> when the destination dir does not exist", function () {
            it("should create the destination directory and copy the file", function () {
                const src = nodePath.join(tmpPath, "file.txt");
                const dst = nodePath.join(tmpPath, "this", "path", "does", "not", "exist", "copied.txt");
                return copy(src, dst).then(function () {
                    enFs.readFileSync(dst, "utf8").should.be.equal("did it copy?\n");
                });
            });
        });
    });
    describe("> when the source is a directory", function () {
        describe("> when the source directory does not exist", function () {
            it("should return an error", function () {
                const src = nodePath.join(tmpPath, "this_dir_dos_not_exist");
                const dst = nodePath.join(tmpPath, "this_dir_really_does_not_matter");
                return copy(src, dst).catch(function (err) {
                    err.should.be.instanceOf(Error);
                });
            });
        });
        it("should copy the directory", function () {
            let FILES = 2;
            const src = nodePath.join(tmpPath, "srca");
            const dst = nodePath.join(tmpPath, "dsta");
            return copy(src, dst).then(function (stats) {
                let copiedSize = 0;
                let statFile;
                const statDst = enFs.statSync(dst);
                statDst.isDirectory().should.be.equal(true);
                for (let i = 0; i < FILES; i++) {
                    statFile = enFs.statSync(nodePath.join(dst, i.toString()));
                    statFile.isFile().should.be.equal(true);
                    copiedSize += statFile.size;
                }
                const dstSubDir = nodePath.join(dst, "subdir");
                const statDstSubDir = enFs.statSync(dstSubDir);
                statDstSubDir.isDirectory().should.be.equal(true);
                for (let i = 0; i < FILES; i++) {
                    statFile = enFs.statSync(nodePath.join(dstSubDir, i.toString()));
                    statFile.isFile().should.be.equal(true);
                    copiedSize += statFile.size;
                }
                copiedSize.should.be.equal(stats.copied.size);
            });
        });
        describe("> when the destination directory does not exist", function () {
            it("should create the destination directory and copy the file", function () {
                const src = nodePath.join(tmpPath, "data");
                const dst = nodePath.join(tmpPath, "this", "path", "does", "not", "exist");
                return copy(src, dst).then(function () {
                    enFs.readFileSync(nodePath.join(dst, "f1.txt"), "utf8").should.be.equal("file1");
                    enFs.readFileSync(nodePath.join(dst, "f2.txt"), "utf8").should.be.equal("file2");
                });
            });
        });
        describe("> when src directory does not exist", function () {
            it("should return an error", function () {
                return copy("/path/does/not/exist", "/to/any/place").catch(function (err) {
                    err.should.be.instanceOf(Error);
                });
            });
        });
    });
    describe("> when the src and dst are identical", function () {
        const file = nodePath.join(tmpPath, "identicalFile");
        const file1 = nodePath.join(tmpPath, "identicalFile1");
        const fileData = "some data";
        describe("> when the src and dst are the same file", function () {
            it("should not copy and not throw an error", function () {
                return copy(file, file).then(function () {
                    enFs.readFileSync(file, "utf8").should.be.equal(fileData);
                });
            });
        });
        describe("> when the src is symlink and points to dst", function () {
            it("should not copy and keep the symlink", function () {
                const src = nodePath.join(tmpPath, "testLink");
                const dst = file;
                if (isWindows && !windowsTestLink) {
                    return;
                }
                return copy(src, dst).then(function () {
                    enFs.readFileSync(dst, "utf8").should.be.equal(fileData);
                    enFs.readlinkSync(src).should.be.equal(dst);
                });
            });
        });
        describe("> when dst is symlink and points to src", function () {
            it("should not copy and keep the symlink", function () {
                const src = file1;
                const dst = nodePath.join(tmpPath, "testLink1");
                if (isWindows && !windowsTestLink) {
                    return;
                }

                return copy(src, dst).then(function () {
                    enFs.readFileSync(dst, "utf8").should.be.equal(fileData);
                    enFs.readlinkSync(dst).should.be.equal(src);
                });
            });
        });
    });
    describe("> when using dereference", function () {
        before(function () {
            if (windowsTestLink) {
                enfsmkdirp.mkdirpSync(nodePath.join(tmpPath, "src", "default"));
                enFs.writeFileSync(nodePath.join(tmpPath, "src", "default", "file"), "contents");
                enFs.symlinkSync(nodePath.join(tmpPath, "src", "default", "file"), nodePath.join(tmpPath, "src", "default", "fileLink"), "file");
                enFs.mkdirSync(nodePath.join(tmpPath, "src", "default", "dir"));
                enFs.writeFileSync(nodePath.join(tmpPath, "src", "default", "dirFile"), "contents");
                enFs.symlinkSync(nodePath.join(tmpPath, "src", "default", "dir"), nodePath.join(tmpPath, "src", "default", "dirFileLink"), "dir");
                enfsmkdirp.mkdirpSync(nodePath.join(tmpPath, "src", "deref"));
                enFs.writeFileSync(nodePath.join(tmpPath, "src", "deref", "file"), "contents");
                enFs.symlinkSync(nodePath.join(tmpPath, "src", "deref", "file"), nodePath.join(tmpPath, "src", "deref", "fileLink"), "file");
                enFs.mkdirSync(nodePath.join(tmpPath, "src", "deref", "dir"));
                enFs.writeFileSync(nodePath.join(tmpPath, "src", "deref", "dir", "dirFile"), "contents");
                enFs.symlinkSync(nodePath.join(tmpPath, "src", "deref", "dir"), nodePath.join(tmpPath, "src", "deref", "dirFileLink"), "dir");
            }
        });
        it("copies symlinks by default", function () {
            const src = nodePath.join(tmpPath, "src", "default");
            const file = nodePath.join(src, "file");
            const dir = nodePath.join(src, "dir");
            const dst = nodePath.join(tmpPath, "dst", "default");
            if (isWindows && !windowsTestLink) {
                return;
            }
            return copy(src, dst).then(function () {
                enFs.readlinkSync(nodePath.join(dst, "fileLink")).should.be.equal(file);
                enFs.readlinkSync(nodePath.join(dst, "dirFileLink")).should.be.equal(dir);
            });
        });

        it("copies file contents when dereference=true", function () {
            const src = nodePath.join(tmpPath, "src", "deref");
            const dst = nodePath.join(tmpPath, "dst", "deref");
            if (isWindows && !windowsTestLink) {
                return;
            }
            return copy(src, dst, {dereference: true}).then(function () {
                const fileSymLink = nodePath.join(dst, "fileLink");
                const dirSymLink = nodePath.join(dst, "dirFileLink");
                enFs.statSync(fileSymLink).isFile().should.be.equal(true);
                enFs.readFileSync(fileSymLink, "utf8").should.be.equal("contents");
                enFs.statSync(dirSymLink).isDirectory().should.be.equal(true);
                enFs.readdirSync(dirSymLink).should.be.eql(["dirFile"]);
            });
        });
    });
});
