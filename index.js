const MONGOOSE_TIMEOUT_ERROR_CODE = 50;
const DEFAULT_TIMEOUT = 15000; // Milliseconds
const METHODS = ['count', 'find', 'findOne', 'findOneAndRemove', 'findOneAndUpdate', 'update'];

function isTimeoutError(error) {
    return error.code === MONGOOSE_TIMEOUT_ERROR_CODE;
}

function addTimeoutToMethod(schema, method, timeout, errorHandler) {
    schema.pre(method, function () {
        this.maxTime(timeout);
    });
    schema.post(method, function (error, doc, next) {
        if (errorHandler && isTimeoutError(error)) {
            errorHandler(error);
        }
        next();
    });
}

function validateOptions(timeout, errorHandler) {
    const errors = [];
    if (typeof errorHandler !== 'function') {
        errors.push({
            field: 'errorHandler',
            message: 'Parameter provided is not a function'
        });
    }
    let intValue = parseInt(timeout, 10);
    if (Number.isNaN(intValue) || intValue.toString() !== timeout.toString()) {
        errors.push({
            field: 'timeout',
            message: 'Invalid number provided'
        });
    }
    if (errors.length) {
        const error = new Error('Invalid parameters provided');
        error.details = errors;
        throw error;
    }
}

/**
 * Plugin to add query timeouts to a schema
 * @param {Object} [options={}] - options to configure the plugin
 * @param {Number} [options.timeout=15000] - Query timeout in miliseconds
 * @param {Function} [options.errorHandler] - Function to be called with the error thrown by mongo in case the query timesout
 * @param {Object} [options.methods] - By default timeouts will be added to `count`, `find`, `findOne`,
 * `findOneAndRemove`, `findOneAndUpdate` and `update`. If you want to prevent some of those methods from
 * having timeouts, provide an object with the properties being the name of the method and false as the value
 */
function QueryTimeout(options = {}) {
    const {
        timeout = DEFAULT_TIMEOUT,
        methods = {},
        errorHandler = () => {}
    } = options;
    validateOptions(timeout, errorHandler);

    return (schema) => {
        METHODS.forEach((method) => {
            if (methods[method] === false) {
                return;
            }
            addTimeoutToMethod(schema, method, timeout, errorHandler);
        });
    };
}

QueryTimeout.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;
QueryTimeout.METHODS = METHODS;

module.exports = QueryTimeout;