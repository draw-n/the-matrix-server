const axios = require("axios");

const retrieveDepartments = async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.data.gov/ed/collegescorecard/v1/schools?id=221999&api_key=${process.env.COLLEGE_SCORECARD_API}&fields=school.name,latest.programs.cip_4_digit.title`
        );
        const values = response.data.results[0]["latest.programs.cip_4_digit"];
        const departments = [
            ...new Set(values.map((dept) => dept.title)),
        ].sort();
        return res.status(200).json(departments);
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            message: "Error retrieving departments from College Scorecard API.",
            error: err.message,
        });
    }
};
module.exports = { retrieveDepartments };
