const axios = require("axios");
const path = require("path");
const fstat = require("fs");

const { readFile, delay, retryRequest } = require("../utils/file.utils.js");

/**
 * connect to duet printer
 * @param {*} printerIp - ip address of the printer
 * @returns - connection status
 */
const connectToDuet = async (printerIp) => {
    const response = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_connect?password=`),
    );
    return response.data;
};

/**
 * upload gcode file to duet printer
 * @param {*} printerIp - ip address of the printer
 * @param {*} fileName - name of the gcode file
 * @returns
 */
const sendGcodeToDuet = async (printerIp, fileName, filePath) => {
    const fileData = readFile(filePath);

    const response = await retryRequest(() =>
        axios.post(`http://${printerIp}/rr_upload`, fileData, {
            params: { name: `/gcodes/${fileName}` },
            headers: { "Content-Type": "application/octet-stream" },
        }),
    );

    return response.data;
};

/**
 * start print on duet printer
 * @param {*} printerIp - ip address of the printer
 * @returns - print start status
 */
const startPrint = async (printerIp, fileName) => {
    const load = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_gcode`, {
            params: { gcode: `M23 ${fileName}` },
        }),
    );
    const start = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_gcode`, {
            params: { gcode: `M24` },
        }),
    );
    return start.data;
};

const pausePrint = async (printerIp) => {
    const response = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_gcode`, {
            params: { gcode: `M25` },
        }),
    );
    return response.data;
}

/**
 * get printer status
 * @param {*} printerIp - ip address of the printer
 * @returns - printer status
 */
const getPrinterStatus = async (printerIp) => {
    const response = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_model?key=state.status`),
    );
    return response.data.result;
};

const sendMacroToDuet = async (printerIp, macroFileName) => {
    const macroPath = path.join(__dirname, "../duet/macros", macroFileName);
    const gcodeContent = fstat.readFileSync(macroPath, "utf8");

    await retryRequest(() =>
        axios.post(`http://${printerIp}/rr_upload`, gcodeContent, {
            params: { name: `/macros/${macroFileName}` },
            headers: { "Content-Type": "application/octet-stream" },
        }),
    );

    const messageResponse = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_gcode`, {
            params: { gcode: `M98 P"/macros/${macroFileName}"` },
        }),
    );

    const beepResponse = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_gcode`, {
            params: { gcode: `M300 S1000 P500` },
        }),
    );

    return messageResponse.data;
};

/**
 * disconnect from duet printer
 * @param {*} printerIp - ip address of the printer
 * @returns - disconnect status
 */
const disconnectFromDuet = async (printerIp) => {
    const response = await retryRequest(() =>
        axios.get(`http://${printerIp}/rr_disconnect`),
    );
    return response.data;
};

module.exports = {
    connectToDuet,
    sendGcodeToDuet,
    startPrint,
    getPrinterStatus,
    disconnectFromDuet,
    sendMacroToDuet,
    pausePrint
};
