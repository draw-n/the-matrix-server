const axios = require("axios");
const { readFile, delay } = require("../utils/file.utils.js");
/**
 * connect to duet printer
 * @param {*} printerIp - ip address of the printer
 * @returns - connection status
 */
const connectToDuet = async (printerIp) => {
    const response = await axios.get(
        `http://${printerIp}/rr_connect?password=`
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

    const response = await axios.post(
        `http://${printerIp}/rr_upload`,
        fileData,
        {
            params: { name: `/gcodes/${fileName}` },
            headers: { "Content-Type": "application/octet-stream" },
        }
    );

    return response.data;
};

/**
 * start print on duet printer
 * @param {*} printerIp - ip address of the printer
 * @returns - print start status
 */
const startPrint = async (printerIp, fileName) => {
    const load = await axios.get(`http://${printerIp}/rr_gcode`, {
        params: { gcode: `M23 ${fileName}` },
    });
    delay(2000); // wait for 2 seconds to ensure the file is loaded
    const start = await axios.get(`http://${printerIp}/rr_gcode`, {
        params: { gcode: `M24` },
    });
    return start.data;
};

/**
 * get printer status
 * @param {*} printerIp - ip address of the printer
 * @returns - printer status
 */
const getPrinterStatus = async (printerIp) => {
    const response = await axios.get(`http://${printerIp}/rr_model?key=state`);
    return response.data.result;
};

/**
 * disconnect from duet printer
 * @param {*} printerIp - ip address of the printer
 * @returns - disconnect status
 */
const disconnectFromDuet = async (printerIp) => {
    const response = await axios.get(`http://${printerIp}/rr_disconnect`);
    return response.data;
};

module.exports = {
    connectToDuet,
    sendGcodeToDuet,
    startPrint,
    getPrinterStatus,
    disconnectFromDuet,
};
