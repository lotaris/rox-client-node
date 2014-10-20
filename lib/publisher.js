var _ = require('underscore'),
    q = require('q');

module.exports = function(api) {

  return {
    upload: function(payload, options) {
      return q({ payload: payload, options: options })
        .then(buildOptions)
        .then(api.request)
        .then(checkResponse);
    }
  };

  function buildOptions(data) {

    var requestOptions = _.pick(data.options, 'apiUrl', 'apiKeyId', 'apiKeySecret'),
        serializedPayload = JSON.stringify(data.payload);

    return _.extend(requestOptions, {
      apiRel: 'v1:test-payloads',
      method: 'POST',
      body: serializedPayload,
      headers: {
        'Content-Type': 'application/vnd.lotaris.rox.payload.v1+json',
        'Content-Length': serializedPayload.length,
      }
    });
  }

  function checkResponse(res) {
    if (res.statusCode !== 202) {
      throw new Error('Server responded with unexpected status code ' + res.statusCode + ' (response: ' + res.body + ')');
    }
  }
};

module.exports['@require'] = [ 'api' ];
module.exports['@singleton'] = true;
