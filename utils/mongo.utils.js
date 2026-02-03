const validateUniqueField = async (value, fieldName, collection, excludeId) => {
    // Build query dynamically
    const query = { [fieldName]: value };

    if (excludeId) {
        query.uuid = { $ne: excludeId };
    }

    const existing = await collection.findOne(query);
    return !existing; // true if unique
};

module.exports = {
    validateUniqueField,
};
