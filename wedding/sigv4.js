/* Minimal AWS Signature V4 for S3 requests from the browser (admin page only). */
(function (root) {
  var enc = new TextEncoder();
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function sha256(str) { return crypto.subtle.digest('SHA-256', enc.encode(str)).then(hex); }
  function hmac(key, str) {
    var k = typeof key === 'string' ? enc.encode(key) : key;
    return crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then(function (ck) { return crypto.subtle.sign('HMAC', ck, enc.encode(str)); });
  }
  function rfc3986(s) { return encodeURIComponent(s).replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); }); }

  // Returns { url, headers } ready for fetch. `now` is optional (for tests).
  function sign(opts) {
    var u = new URL(opts.url);
    var method = (opts.method || 'GET').toUpperCase();
    var now = opts.now || new Date();
    var amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    var dateStamp = amzDate.slice(0, 8);
    var region = opts.region, service = 's3';
    var canonicalUri = u.pathname.split('/').map(function (seg) { return rfc3986(decodeURIComponent(seg)); }).join('/');
    var params = [];
    u.searchParams.forEach(function (v, k) { params.push([rfc3986(k), rfc3986(v)]); });
    params.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0); });
    var canonicalQuery = params.map(function (p) { return p[0] + '=' + p[1]; }).join('&');
    var scope = dateStamp + '/' + region + '/' + service + '/aws4_request';
    var payloadHash, signedHeaders;
    return sha256(opts.body || '').then(function (ph) {
      payloadHash = ph;
      var headers = { host: u.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
      signedHeaders = Object.keys(headers).sort().join(';');
      var canonicalHeaders = Object.keys(headers).sort().map(function (k) { return k + ':' + headers[k] + '\n'; }).join('');
      var canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
      return sha256(canonicalRequest);
    }).then(function (crHash) {
      var stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crHash].join('\n');
      return hmac('AWS4' + opts.secretAccessKey, dateStamp)
        .then(function (k) { return hmac(k, region); })
        .then(function (k) { return hmac(k, service); })
        .then(function (k) { return hmac(k, 'aws4_request'); })
        .then(function (k) { return hmac(k, stringToSign); })
        .then(function (sig) {
          return {
            url: u.toString(),
            signature: hex(sig),
            headers: {
              'x-amz-content-sha256': payloadHash,
              'x-amz-date': amzDate,
              Authorization: 'AWS4-HMAC-SHA256 Credential=' + opts.accessKeyId + '/' + scope + ', SignedHeaders=' + signedHeaders + ', Signature=' + hex(sig)
            }
          };
        });
    });
  }

  function s3fetch(creds, method, url, init) {
    init = init || {};
    return sign({ url: url, method: method, body: init.body, region: creds.region, accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey })
      .then(function (s) {
        var h = Object.assign({}, init.headers || {}, s.headers);
        return fetch(s.url, { method: method, headers: h, body: init.body, cache: 'no-store' });
      });
  }
  root.S3Sign = { sign: sign, fetch: s3fetch };
})(typeof window !== 'undefined' ? window : globalThis);
