var _ = require('underscore'),
    q = require('q');

module.exports = function(request) {

  return {
    request: function(options) {
      return q(options).then(buildOptions).then(getRelation).then(makeRequest);
    }
  };

  function buildOptions(options) {
    if (options.url) {
      throw new Error('ROX Center API is an hypermedia API and does not support setting the URL directly; the "apiUrl" option must be the root of the API, and the "apiRel" option must be an array of the hyperlinks to reach the desired resource');
    } else if (!options.apiUrl) {
      throw new Error('The root of the API must be given as the "apiUrl" option');
    } else if (!options.apiKeyId) {
      throw new Error('The ROX Center API key ID must be given as the "apiKeyId" option');
    } else if (!options.apiKeySecret) {
      throw new Error('The ROX Center API key secret must be given as the "apiKeySecret" option');
    } else if (!options.apiRel) {
      throw new Error('The "apiRel" option must be an array of the hyperlinks to reach the desired resource');
    }

    var actualOptions = _.clone(options);
    actualOptions.apiRel = _.isArray(options.apiRel) ? options.apiRel : [ options.apiRel ];

    if (!actualOptions.apiRel.length) {
      throw new Error('The "apiRel" option must contain at least one hyperlink');
    }

    return actualOptions;
  }

  function makeRequest(options) {

    delete options.apiRel;
    delete options.apiUrl;

    if (!options.headers) {
      options.headers = {};
    }

    options.headers.Authorization = 'RoxApiKey id="' + options.apiKeyId + '" secret="' + options.apiKeySecret + '"';

    delete options.apiKeyId;
    delete options.apiKeySecret;

    var deferred = q.defer();
    request(options, function(err, res) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(res);
      }
    });

    return deferred.promise;
  }

  function extractRelation(options, res) {

    var body = JSON.parse(res.body),
        links = body._links;
    if (!links) {
      throw new Error('Expected hal+json response to have a "_links" property (response: ' + res.body + ')');
    }

    var relName = options.apiRel.shift(),
        rel = links[relName];
    if (!rel) {
      throw new Error('Expected hal+json response to have link "' + relName + '" (response links: ' + JSON.stringify(links) + ')');
    } else if (!rel.href) {
      throw new Error('Expected link ' + relName + ' in hal+json response to have an "href" property (link: ' + JSON.stringify(rel) + ')');
    }

    options.url = rel.href;
  }

  function getRelation(options) {

    var requestOptions = {
      url: options.url || options.apiUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/hal+json',
        'Authorization': 'RoxApiKey id="' + options.apiKeyId + '" secret="' + options.apiKeySecret + '"'
      }
    };

    var deferred = q.defer(),
        promise = deferred.promise,
        startTime = new Date().getTime();

    request(requestOptions, function(err, res) {
      if (err) {
        deferred.reject(err);
      } else if (res.statusCode !== 200) {
        deferred.reject(new Error('ROX Center API responded with unexpected status code ' + res.statusCode + ' (response: ' + res.body + ')'));
      } else {
        extractRelation(options, res);
        if (options.apiRel.length) {
          deferred.resolve(getRelation(options));
        } else {
          deferred.resolve(options);
        }
      }
    });

    return deferred.promise;
  }
};

module.exports['@require'] = [ 'request' ];
module.exports['@singleton'] = true;
