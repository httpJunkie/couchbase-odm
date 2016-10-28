/**
 * @module Data Sanitizer
 * @private
 */

var _      = require('lodash');
var moment = require('moment');

var DataType        = require("../dataType");
var Instance        = require("../instance.js");
var ValidationError = require("../error/validationError.js");

var DataTypes  = DataType.types;
var sanitizers = {};

module.exports.sanitize = sanitize;
module.exports.sanitizers = sanitizers;

/**
 * @param {mixed}  val
 * @param {Object} [opt]
 * @param {sting}  [opt.propPath] - full path of property being sanitized
 * @function
 * @return {integer|float}
 */
sanitizers[DataTypes.NUMBER] = sanitizers[DataTypes.FLOAT] = function(val, opt) {

    opt = opt || {};

    if (typeof val === 'number') {
        return val;
    }

    var containsNonDigit = /[^0-9.]$/.exec(val.toString()) !== null;
    val = Number.parseFloat(val);

    if (Number.isNaN(val) || containsNonDigit) {
        throw new ValidationError((opt.propPath || 'Object data') + " value is not of type integer or float");
    }
    return val;
}

/**
 * @param {mixed}  val
 * @param {Object} [opt]
 * @param {sting}  [opt.propPath] - full path of property being sanitized
 * @function
 * @return {integer}
 */
sanitizers[DataTypes.INT] = function(val, opt) {

    opt = opt || {};

    var containsNonDigit = /[^0-9]/.exec(val.toString()) !== null;
    val = (typeof val !== 'number' && Number.parseInt(val) ) || val;

    if (Number.isNaN(val) || Math.floor(val) !== val || containsNonDigit) {
        throw new ValidationError((opt.propPath || 'Object data') + " value is not an integer number");
    }
    return val;
}

/**
 * @param {mixed}  val
 * @param {Object} [opt]
 * @param {sting}  [opt.propPath] - full path of property being sanitized
 * @function
 * @return {string}
 */
sanitizers[DataTypes.STRING] = function(val, opt) {

    opt = opt || {};

    if (!_.isString(val)) {
        throw new ValidationError((opt.propPath || 'Object data') + " value is not of type `string`");
    }
    return val.toString();
}

/**
 * @param {mixed}  val
 * @param {Object} [opt]
 * @param {sting}  [opt.propPath] - full path of property being sanitized
 * @function
 * @return {boolean|integer}
 */
sanitizers[DataTypes.BOOLEAN] = function(val, opt) {

    opt = opt || {};

    var err = new ValidationError((opt.propPath || 'Object data') + " value is not of type Boolean");
    var type = typeof val;
    if (   type !== 'boolean'
        && type !== 'number'
        || (type === 'number' && val !== 1 && val !== 0)
    ) {
        throw err;
    }

    if (val === 1) val = true;
    if (val === 0) val = false;

    return val;
}

/**
 * @param {mixed}  val
 * @param {Object} [opt]
 * @param {sting}  [opt.propPath] - full path of property being sanitized
 * @function
 * @return {Date}
 */
sanitizers[DataTypes.DATE] = function(val, opt) {

    opt = opt || {};

    var err = new ValidationError((opt.propPath || 'Object data') + " value is not valid date/date-time value");

    if (val === null) {//new Date(null) returns "Wed Dec 31 1969 19:00:00 GMT-0500 (EST)"
        throw err;
    }

    val = new Date(val);

    if ( Object.prototype.toString.call(val) !== "[object Date]" || isNaN(val.getTime())) {
        throw err;
    }

    return moment.utc(val).format();
}

/**
 * @param {mixed}   val
 * @param {Object}  opt
 * @param {Object}  opt.schema
 * @param {array}   opt.schema.enum
 * @param {integer} [opt.schema.type]
 * @param {mixed}   [opt.schema.default]
 * @param {boolean} [opt.schema.allowEmptyValue]
 * @param {sting}   [opt.propPath] - full path of property being sanitized
 *
 * @function
 * @return {mixed} `val`
 */
sanitizers[DataTypes.ENUM] = function(val, opt) {

    opt = opt || {};

    if (opt.schema.enum.indexOf(val) == -1) {
        throw new ValidationError((opt.propPath || 'Object data') + " value is not a value of enumerated type");
    }

    return val;
}

/**
 * @param {mixed}        val
 * @param {Object}       opt
 * @param {ModelManager} opt.modelManager
 * @param {Object}       opt.schema
 * @param {integer}      opt.schema.type
 * @param {array}        [opt.schema.enum]
 * @param {mixed}        [opt.schema.default]
 * @param {boolean}      [opt.schema.allowEmptyValue]
 * @param {sting}        [opt.propPath] - full path of property being sanitized
 *
 * @function
 * @return {mixed}
 */
sanitizers[DataType.Complex.toString()] = function(val, opt) {

    opt = opt || {};

    var refModel = opt.schema.type.getModel(opt.modelManager);

    //TODO it might allow value of plain object which has _id property with key string ??
    if (!(val instanceof refModel.Instance)) {
        throw new ValidationError((opt.propPath || 'Object data') + " value is not instance of `" + refModel.name + '`');
    }

    return val;
}

/**
 * @param {mixed}        val
 * @param {Object}       opt
 * @param {ModelManager} opt.modelManager
 * @param {Object}       opt.schema
 * @param {Object}       opt.schema.schema
 * @param {integer}      opt.schema.schema.type
 * @param {sting}        [opt.propPath] - full path of property being sanitized
 *
 * @function
 * @return {array}
 */
sanitizers[DataTypes.ARRAY] = function(val, opt) {

    opt = opt || {};

    if (_.isPlainObject(opt.schema.schema) && opt.schema.schema.type) {
        var type = opt.schema.schema.type;

        if (!(val instanceof Array)) {
            throw new ValidationError((opt.propPath || 'Object data')+ " value is not of type Array");
        }

        for (var y = 0, len = val.length; y < len; y++) {
            val[y] = this[type](val[y], {
                propPath: opt.propPath,
                schema: opt.schema.schema,
                modelManager: opt.modelManager
            });
        }
    }

    return val;

}

/**
 *
 * recursive validates data against defined schema &
 * attempts to convert the data to defined type & sets default values
 *
 * @param {mixed}        data
 * @param {Object}       opt
 * @param {sting}        opt.propPath - full path of property being sanitized
 * @param {ModelManager} opt.modelManager
 * @param {boolean}      opt.includeUnlisted
 * @param {Object}       opt.schema
 * @param {integer}      [opt.schema.type]
 * @param {array}        [opt.schema.enum]
 * @param {mixed}        [opt.schema.default]
 * @param {boolean}      [opt.schema.allowEmptyValue]
 *
 * @function
 * @return {Object}
 */
sanitizers[DataTypes.HASH_TABLE] = function(data, opt) {

    opt = opt || {};

    var err = new ValidationError((opt.propPath || 'Object data') + " value is not of type Object (Hash table)");

    data = inspectEmptyValue(this.name + ' data', data, opt.schema);

    if (_.isNil(data)) {
        return data;
    } else if (!_.isPlainObject(data)) {
        throw err;
    }

    if (_.isPlainObject(opt.schema.schema)) {
        var keys = Object.keys(opt.schema.schema);

        for (var i = 0, len = keys.length; i < len; i++) {
            var name = keys[i];
            var val = data[name];

            var type = opt.schema.schema[name].type;
            var typeStr = type.toString();

            var path = opt.propPath ? opt.propPath + '.' + name : name;
            var emptyCandidate = inspectEmptyValue(path, val, opt.schema.schema[name]);

            if (_.isNil(emptyCandidate)) {
                continue;
            };
            val = emptyCandidate;

            //sanitize data value
            data[name] = sanitizers[typeStr].apply(sanitizers, [
                    val,
                    {
                        propPath: path,
                        schema: opt.schema.schema[name],
                        modelManager: opt.modelManager,
                        includeUnlisted: opt.includeUnlisted
                    }
            ]);
        }

        //exclude unexpected data
        if (opt.includeUnlisted === false) {
            var forbiddenKeys = _.difference(Object.keys(data), keys);
            for (var y = 0, len2 = forbiddenKeys.length; y < len2; y++) {
                delete data[forbiddenKeys[y]];
            }
        }

        //sanitizer should always mutate existing data object, instead of returning
        //a new one with valid data only.
        //it's because we want to preserve setters/getter which are setup on the
        //original data object
        return data;
    }

    return data;

}

/**
 * inspectEmptyValue
 *
 * @throws {ValidationError} if property can not be `null` or `undefined` (=allowEmptyValue=false)
 * @param {sting}   property - full path of property being sanitized
 * @param {mixed}   val
 * @param {Object}  [schema]
 * @param {integer} [schema.type]
 * @param {array}   [schema.enum]
 * @param {mixed}   [schema.default]
 * @param {boolean} [schema.allowEmptyValue]
 *
 * @return {mixed}  returns `default` or {null} value if property is nullable and has empty value, or {false} if value is not empty
 */
function inspectEmptyValue(property, val, schema) {
    if (_.isNil(val) && schema.hasOwnProperty('default')) {
        if (_.isPlainObject(schema.default)) {
            val = _.cloneDeep(schema.default);
        } else if (schema.default instanceof Instance) {
            val = schema.default.clone();
        } else {
            val = schema.default;
        }
    }

    if (schema.allowEmptyValue !== true && _.isNil(val)) {
        throw new ValidationError((property || 'Object value') + " value can NOT be empty (undefined or null)");
    }

    return val;
}

/**
 * sanitizeData
 *
 * recursive validates data against defined schema &
 * attempts to convert the data to defined type & sets default values
 *
 * @param {Object}  [schema]
 * @param {integer} [schema.type]
 * @param {array}   [schema.enum]
 * @param {mixed}   [schema.default]
 * @param {Object}  [schema.schema]
 * @param {boolean} [schema.allowEmptyValue=false]
 * @param {Object}  data
 * @param {Object}  [options]
 * @param {boolean} [options.includeUnlisted=false]
 *
 * @throws {ValidationError}
 * @exports Sanitizer:sanitizeData
 * @return {Object}
 */
function sanitize(schema, data, options) {

    var defaults = {
        includeUnlisted: false
    };

    options = _.merge({}, defaults, options);

    var emptyCandidate = data;
    if (schema.type !== DataTypes.HASH_TABLE) {
        emptyCandidate = inspectEmptyValue(this.name + ' data', data, schema);
        if (_.isNil(emptyCandidate)) {
            return data;
        }
    }

    //sanitize data value
    return sanitizers[schema.type.toString()].apply(sanitizers, [
            data,
            {
                propPath: '',
                schema: schema,
                modelManager: this.$modelManager,
                includeUnlisted: options.includeUnlisted
            }
    ]);
}