const fs = require("fs");

/**
 *
 * @param {*} fileName
 * @param {*} filePath
 * @param {*} allowed_extensions
 * @returns
 */
const checkFileExtensions = (fileName, allowed_extensions) => {
    const file_extension = fileName.slice(fileName.lastIndexOf("."));
    if (!allowed_extensions.includes(file_extension.toLowerCase())) {
        console.log(file_extension);
        return false;
    }
    return true;
};

const cleanUp = (folderPath) => {};

const moveFile = (oldPath, newPath) => {
    fs.rename(oldPath, newPath, function (err) {
        if (err) throw err;
        console.log("File moved from " + oldPath + " to " + newPath);
    });
};
module.exports = { checkFileExtensions, moveFile };
