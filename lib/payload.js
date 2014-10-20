var _ = require('underscore');

module.exports = function() {
  return {
    // Serialize a test run in the vnd.lotaris.rox.payload.v1+json media type.
    v1: function(testRun) {

      var payload = {
        d: testRun.duration,
        r: [
          {
            j: testRun.projectApiId,
            v: testRun.projectVersion,
            t: _.reduce(testRun.results, function(memo, result) {
              if (!result.key) {
                return memo;
              }

              var t = {
                k: result.key,
                n: result.name,
                p: result.passed,
                d: Math.round(result.duration / (result.numberOfResults || 1))
              };

              if (result.message) {
                t.m = result.message;
              }

              if (result.category) {
                t.c = result.category;
              }

              if (result.tags) {
                t.g = result.tags;
              }

              if (result.tickets) {
                t.t = result.tickets;
              }

              memo.push(t);
              return memo;
            }, [])
          }
        ]
      };

      if (testRun.uid) {
        payload.u = testRun.uid;
      }

      return payload;
    }
  };
};

module.exports['@require'] = [];
module.exports['@singleton'] = true;
