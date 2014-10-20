var _ = require('underscore'),
    factory = require('../lib/api'),
    matchers = require('./support/matchers.helpers'),
    q = require('q');

describe('api', function() {

  var api, requestMock, responses;
  beforeEach(function() {

    matchers.addMatchers(this);

    responses = [];
    requestMock = jasmine.createSpy();
    requestMock.andCallFake(function(options, callback) {
      var res = responses.shift();
      if (res instanceof Error) {
        callback(res);
      } else {
        callback(undefined, res, res.body);
      }
    });

    api = factory(requestMock);
  });

  function testRequest(options, expectedResult, callback) {

    var fulfilledSpy = jasmine.createSpy('success'),
        rejectedSpy = jasmine.createSpy('failure');

    api.request(options).then(fulfilledSpy, rejectedSpy);

    waitsFor(function() {
      return fulfilledSpy.calls.length || rejectedSpy.calls.length;
    }, 'the request to be completed', 100);

    runs(function() {
      var spy = expectedResult ? fulfilledSpy : rejectedSpy;
      expect(spy).toHaveBeenCalled();
      if (spy.calls.length) {
        callback(spy.calls[0].args[0]);
      }
    });
  }

  function addResponse(statusCode, body) {
    responses.push({
      statusCode: statusCode,
      body: JSON.stringify(body)
    });
  }

  function addErrorResponse(message) {
    responses.push(new Error(message));
  }

  describe("request", function() {

    var validOptions;
    beforeEach(function() {
      validOptions = {
        apiUrl: 'http://example.com/api',
        apiKeyId: 'foo',
        apiKeySecret: 'bar',
        apiRel: [ 'v1:link' ],
        method: 'POST',
        body: { yee: 'haw' },
        json: true
      };
    });

    it("should GET the relation href then make the request", function() {

      addResponse(200, { _links: { 'v1:link': { href: 'http://example.com/api/resource' } } });
      addResponse(201, { foo: 'bar' });

      testRequest(validOptions, true, function(res) {

        expect(requestMock.calls.length).toEqual(2);
        expectHyperlinkRequest(0, 'http://example.com/api');

        expect(requestMock.calls[1].args[0]).toEqual({
          url: 'http://example.com/api/resource',
          method: 'POST',
          body: { yee: 'haw' },
          json: true,
          headers: {
            Authorization: 'RoxApiKey id="foo" secret="bar"'
          }
        });

        expect(res.statusCode).toEqual(201);
        expect(JSON.parse(res.body)).toEqual({ foo: 'bar' });
      });
    });

    it("should allow one hyperlink to be given as a string instead of an array", function() {

      addResponse(200, { _links: { 'v1:link': { href: 'http://example.com/api/resource' } } });
      addResponse(201, { foo: 'bar' });

      testRequest(_.extend(validOptions, { apiRel: 'v1:link' }), true, function(res) {

        expect(requestMock.calls.length).toEqual(2);
        expectHyperlinkRequest(0, 'http://example.com/api');

        expect(requestMock.calls[1].args[0]).toEqual({
          url: 'http://example.com/api/resource',
          method: 'POST',
          body: { yee: 'haw' },
          json: true,
          headers: {
            Authorization: 'RoxApiKey id="foo" secret="bar"'
          }
        });

        expect(res.statusCode).toEqual(201);
        expect(JSON.parse(res.body)).toEqual({ foo: 'bar' });
      });
    });

    it("should support multiple hyperlinks", function() {

      addResponse(200, { _links: { 'v1:link': { href: 'http://example.com/api/resource' } } });
      addResponse(200, { _links: { 'v2:otherLink': { href: 'http://example.com/api/otherResource' } } });
      addResponse(201, { foo: 'bar' });

      testRequest(_.extend(validOptions, { apiRel: [ 'v1:link', 'v2:otherLink' ] }), true, function(res) {

        expect(requestMock.calls.length).toEqual(3);
        expectHyperlinkRequest(0, 'http://example.com/api');
        expectHyperlinkRequest(1, 'http://example.com/api/resource');

        expect(requestMock.calls[2].args[0]).toEqual({
          url: 'http://example.com/api/otherResource',
          method: 'POST',
          body: { yee: 'haw' },
          json: true,
          headers: {
            Authorization: 'RoxApiKey id="foo" secret="bar"'
          }
        });

        expect(res.statusCode).toEqual(201);
        expect(JSON.parse(res.body)).toEqual({ foo: 'bar' });
      });
    });

    it("should not reject the returned promise if the status code of the response indicates failure", function() {

      addResponse(200, { _links: { 'v1:link': { href: 'http://example.com/api/resource' } } });
      addResponse(500, { foo: 'bar' });

      testRequest(validOptions, true, function(res) {

        expect(requestMock.calls.length).toEqual(2);
        expectHyperlinkRequest(0, 'http://example.com/api');

        expect(requestMock.calls[1].args[0]).toEqual({
          url: 'http://example.com/api/resource',
          method: 'POST',
          body: { yee: 'haw' },
          json: true,
          headers: {
            Authorization: 'RoxApiKey id="foo" secret="bar"'
          }
        });

        expect(res.statusCode).toEqual(500);
        expect(JSON.parse(res.body)).toEqual({ foo: 'bar' });
      });
    });

    it("should reject the returned promise if a hyperlink request fails", function() {

      addErrorResponse('bug');

      testRequest(validOptions, false, function(err) {
        expect(requestMock.calls.length).toEqual(1);
        expectHyperlinkRequest(0, 'http://example.com/api');
        expect(err).toBeAnError('bug');
      });
    });

    it("should reject the returned promise if a hyperlink request returns an unexpected status code", function() {

      addResponse(404, { foo: 'bar' });

      testRequest(validOptions, false, function(err) {
        expect(requestMock.calls.length).toEqual(1);
        expectHyperlinkRequest(0, 'http://example.com/api');
        expect(err).toBeAnError('ROX Center API responded with unexpected status code 404 (response: {"foo":"bar"})');
      });
    });

    it("should reject the returned promise if a hyperlink response contains no links", function() {

      addResponse(200, { foo: 'bar' });

      testRequest(validOptions, false, function(err) {
        expect(requestMock.calls.length).toEqual(1);
        expectHyperlinkRequest(0, 'http://example.com/api');
        expect(err).toBeAnError('Expected hal+json response to have a "_links" property (response: {"foo":"bar"})');
      });
    });

    it("should reject the returned promise if a hyperlink response doesn't contain the required link", function() {

      var body = { _links: { foo: { href: 'http://example.com/bar' } } };
      addResponse(200, body);

      testRequest(validOptions, false, function(err) {
        expect(requestMock.calls.length).toEqual(1);
        expectHyperlinkRequest(0, 'http://example.com/api');
        expect(err).toBeAnError('Expected hal+json response to have link "v1:link" (response links: ' + JSON.stringify(body._links) + ')');
      });
    });

    it("should reject the returned promise if a hyperlink response is missing the href", function() {

      var body = { _links: { 'v1:link': { foo: 'bar' } } };
      addResponse(200, body);

      testRequest(validOptions, false, function(err) {
        expect(requestMock.calls.length).toEqual(1);
        expectHyperlinkRequest(0, 'http://example.com/api');
        expect(err).toBeAnError('Expected link v1:link in hal+json response to have an "href" property (link: ' + JSON.stringify(body._links['v1:link']) + ')');
      });
    });

    it("should reject the returned promise if the request fails", function() {

      addResponse(200, { _links: { 'v1:link': { href: 'http://example.com/api/resource' } } });
      addErrorResponse('bug');

      testRequest(validOptions, false, function(err) {

        expect(requestMock.calls.length).toEqual(2);
        expectHyperlinkRequest(0, 'http://example.com/api');

        expect(requestMock.calls[1].args[0]).toEqual({
          url: 'http://example.com/api/resource',
          method: 'POST',
          body: { yee: 'haw' },
          json: true,
          headers: {
            Authorization: 'RoxApiKey id="foo" secret="bar"'
          }
        });

        expect(err).toBeAnError('bug');
      });
    });

    it("should not allow giving an URL", function() {
      testRequest(_.extend(validOptions, { url: 'http://example.com' }), false, function(err) {
        expect(err).toBeAnError('ROX Center API is an hypermedia API and does not support setting the URL directly; the "apiUrl" option must be the root of the API, and the "apiRel" option must be an array of the hyperlinks to reach the desired resource');
      });
    });

    it("should require the apiUrl option", function() {
      testRequest(_.omit(validOptions, 'apiUrl'), false, function(err) {
        expect(err).toBeAnError('The root of the API must be given as the "apiUrl" option');
      });
    });

    it("should require the apiKeyId option", function() {
      testRequest(_.omit(validOptions, 'apiKeyId'), false, function(err) {
        expect(err).toBeAnError('The ROX Center API key ID must be given as the "apiKeyId" option');
      });
    });

    it("should require the apiKeySecret option", function() {
      testRequest(_.omit(validOptions, 'apiKeySecret'), false, function(err) {
        expect(err).toBeAnError('The ROX Center API key secret must be given as the "apiKeySecret" option');
      });
    });

    it("should require the apiRel option", function() {
      testRequest(_.omit(validOptions, 'apiRel'), false, function(err) {
        expect(err).toBeAnError('The "apiRel" option must be an array of the hyperlinks to reach the desired resource');
      });
    });

    it("should require at least one hyperlink", function() {
      testRequest(_.extend(validOptions, { apiRel: [] }), false, function(err) {
        expect(err).toBeAnError('The "apiRel" option must contain at least one hyperlink');
      });
    });

    function expectHyperlinkRequest(index, url) {
      expect(requestMock.calls[index].args[0]).toEqual({
        url: url,
        method: 'GET',
        headers: {
          Accept: 'application/hal+json',
          Authorization: 'RoxApiKey id="foo" secret="bar"'
        }
      });
    }
  });
});
