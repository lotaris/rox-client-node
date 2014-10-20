var _ = require('underscore'),
    factory = require('../lib/payload');

describe('payload', function() {

  var sampleTestRun, serializer;
  beforeEach(function() {

    serializer = factory();

    sampleTestRun = {
      uid: 'yooayedee',
      duration: 1234,
      projectApiId: 'foo',
      projectVersion: '1.0.0',
      results: [
        {
          key: 'bar',
          name: 'it should work',
          passed: true,
          duration: 1240,
          numberOfResults: 1,
          category: 'Karma',
          tags: [ 'yee', 'haw' ]
        },
        {
          key: 'baz',
          name: 'it might work',
          passed: false,
          message: 'it did not work',
          duration: 756,
          numberOfResults: 5,
          category: 'Jasmine',
          tickets: [ '100', '200', '300' ]
        },
        {
          key: 'qux',
          name: 'it should also work',
          passed: true,
          message: 'it did actually work',
          duration: 1000,
          numberOfResults: 2
        }
      ]
    };

    sampleResult = {
      d: 1234,
      u: 'yooayedee',
      r: [
        {
          j: 'foo',
          v: '1.0.0',
          t: [
            {
              k: 'bar',
              n: 'it should work',
              p: true,
              d: 1240, // 1240 / 1
              c: 'Karma',
              g: [ 'yee', 'haw' ]
            },
            {
              k: 'baz',
              n: 'it might work',
              p: false,
              m: 'it did not work',
              d: 151, // round(756 / 5)
              c: 'Jasmine',
              t: [ '100', '200', '300' ]
            },
            {
              k: 'qux',
              n: 'it should also work',
              p: true,
              m: 'it did actually work',
              d: 500 // 1000 / 2
            }
          ]
        }
      ]
    };
  });

  describe('v1', function() {

    function serialize(testRun) {
      return serializer.v1(testRun || sampleTestRun);
    }

    it("should serialize a test run", function() {
      expect(serialize()).toEqual(sampleResult);
    });

    it("should omit optional properties", function() {

      delete sampleTestRun.uid;
      delete sampleResult.u;

      _.each(sampleTestRun.results, function(result) {
        delete result.message;
        delete result.category;
        delete result.tags;
        delete result.tickets;
      });

      _.each(sampleResult.r[0].t, function(result) {
        delete result.m;
        delete result.c;
        delete result.g;
        delete result.t;
      });

      expect(serialize()).toEqual(sampleResult);
    });

    it("should omit result without a test key", function() {
      // remove key from results 0 and 2
      delete sampleTestRun.results[0].key;
      delete sampleTestRun.results[2].key;
      // expect only result 1 to be serialized
      sampleResult.r[0].t = [ sampleResult.r[0].t[1] ];
      expect(serialize()).toEqual(sampleResult);
    });

    it("should accept results without a numberOfResults property", function() {
      _.each(sampleTestRun.results, function(result, i) {
        // remove numberOfResults from each result
        delete sampleTestRun.results[i].numberOfResults;
        // expect payload duration to be the same as the result's (divided by 1)
        sampleResult.r[0].t[i].d = sampleTestRun.results[i].duration;
      });
      expect(serialize()).toEqual(sampleResult);
    });
  });
});
