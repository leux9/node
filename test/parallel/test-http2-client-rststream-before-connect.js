'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');
const assert = require('assert');
const h2 = require('http2');

const server = h2.createServer();
server.on('stream', (stream) => {
  stream.on('close', common.mustCall());
  stream.respond();
  stream.end('ok');
});

server.listen(0, common.mustCall(() => {
  const client = h2.connect(`http://localhost:${server.address().port}`);
  const req = client.request();
  req.close(1);
  assert.strictEqual(req.closed, true);

  // Make sure that destroy is called.
  req._destroy = common.mustCall(req._destroy.bind(req));

  // Second call doesn't do anything.
  req.close(8);

  req.on('close', common.mustCall((code) => {
    assert.strictEqual(req.destroyed, true);
    assert.strictEqual(code, 1);
    server.close();
    client.close();
  }));

  req.on('error', common.expectsError({
    code: 'ERR_HTTP2_STREAM_ERROR',
    type: Error,
    message: 'Stream closed with error code 1'
  }));

  req.on('response', common.mustCall());
  req.resume();
  req.on('end', common.mustCall());
  req.end();
}));
