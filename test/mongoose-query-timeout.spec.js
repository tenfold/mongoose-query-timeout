const sinon = require('sinon');
const { expect } = require('chai');
const QueryTimeout = require('../index');

describe('mongoose-query-timeout.spec.js', function () {
    let sandbox;

    function createMockSchema() {
        return {
            timeout: QueryTimeout.DEFAULT_TIMEOUT,
            maxTime(timeout) {
                this.timeout = timeout;
            },
            pre(method, callback) {
                callback.call(this);
            },
            post(method, callback) {
                this.postCallback = callback;
            },
            postCallback(error, doc, next) {
                next();
            }
        };
    }

    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('Should throw an error if provided timeout is an invalid number', function () {
        const schema = createMockSchema();
        const options = {
            timeout: 'NaN'
        };
        expect(QueryTimeout.bind(QueryTimeout, options))
            .to.throw(Error)
            .with.deep.nested.property('details[0].message', 'Invalid number provided');
    });

    it('Should throw an error if provided errorHandler is an invalid function', function () {
        const schema = createMockSchema();
        const options = {
            errorHandler: 'Not a function'
        };
        expect(QueryTimeout.bind(QueryTimeout, options))
            .to.throw(Error)
            .with.deep.nested.property('details[0].message', 'Parameter provided is not a function');
    });

    it('should use the default timeout in case none is provided', function () {
        const schema = createMockSchema();
        sinon.spy(schema, 'maxTime');
        QueryTimeout()(schema);
        expect(schema.maxTime.firstCall.args[0]).to.be.eql(QueryTimeout.DEFAULT_TIMEOUT);
    });

    it('should use the provided timeout', function () {
        const schema = createMockSchema();
        sinon.spy(schema, 'maxTime');
        QueryTimeout({ timeout: 5000 })(schema);
        expect(schema.maxTime.firstCall.args[0]).to.be.eql(5000);
    });

    it('should set timeout for the default schema methods', function () {
        const schema = createMockSchema();
        sinon.spy(schema, 'pre');
        QueryTimeout()(schema);
        const expectedMethods = QueryTimeout.METHODS;
        const calls = schema.pre.getCalls();
        const actualMethods = calls.map((call) => call.args[0]);
        expect(actualMethods).to.include.members(expectedMethods);
    });

    it('shouldn\'t set timeout to method specified in options', function () {
        const schema = createMockSchema();
        sinon.spy(schema, 'pre');
        QueryTimeout({ methods: { find: false } })(schema);
        const calls = schema.pre.getCalls();
        const actualMethods = calls.map((call) => call.args[0]);
        expect(actualMethods).to.not.include('find');
    });

    it('should invoke the error handler with the error thrown by mongo', function () {
        const schema = createMockSchema();
        const errorHandler = sinon.stub();
        const error = new Error('unit test error');
        error.code = 50;
        error.codeName = 'ExceededTimeLimit';

        QueryTimeout({ errorHandler })(schema);
        schema.postCallback(error, null, () => {});
        sinon.assert.calledOnce(errorHandler);
    });
});