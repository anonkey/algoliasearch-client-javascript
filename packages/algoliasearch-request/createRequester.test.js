// @flow

import createRequester from './createRequester';
import type { HttpModule, Timeouts, Hosts } from './types';

it('requires the right arguments', () => {
  const falseInvocations = [
    () =>
      createRequester({
        apiKey: '',
      }),
    () =>
      createRequester({
        appId: '',
      }),
    () =>
      createRequester({
        appId: '',
        apiKey: '',
        httpRequester: {},
      }),
  ];

  falseInvocations.map(invocation => expect(invocation).toThrow());
  falseInvocations.map(invocation => {
    try {
      invocation();
    } catch (e) {
      expect(e).toMatchSnapshot();
    }
  });

  expect(() =>
    createRequester({
      appId: '',
      apiKey: '',
      httpRequester: () => {},
    })
  ).not.toThrow();
});

it('first read request uses first host', () => {
  const httpRequester = jest.fn(() => Promise.resolve());
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  requester({
    method: '',
    requestType: 'read',
  });

  const firstArgs = httpRequester.mock.calls[0];
  const { url: { hostname } } = firstArgs[0];
  expect(hostname).toEqual('the_crazy_app-dsn.algolia.net');
});

it('first write request uses first host', () => {
  const httpRequester = jest.fn(() => Promise.resolve());
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  requester({
    method: '',
    requestType: 'write',
  });

  const firstArgs = httpRequester.mock.calls[0];
  const { url: { hostname } } = firstArgs[0];
  expect(hostname).toEqual('the_crazy_app.algolia.net');
});

it.skip('uses a different host when the request needs to be retried', () => {
  const httpRequester = jest.fn(
    () =>
      httpRequester.mock.calls.length === 1
        ? Promise.reject(new Error())
        : Promise.resolve()
  );
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  requester({
    method: '',
    requestType: 'read',
  }); // retries

  const usedHosts = [
    httpRequester.mock.calls[0][0].url.hostname,
    httpRequester.mock.calls[2][0].url.hostname,
  ];
  expect(usedHosts[0]).toEqual('the_crazy_app-dsn.algolia.net'); // first try
  expect(usedHosts[1]).toEqual('the_crazy_app-1.algolianet.com'); // second try
});

it.skip('uses the "up" host on second request when first fails', () => {
  const httpRequester = jest.fn(
    () =>
      httpRequester.mock.calls.length === 1
        ? Promise.reject(new Error())
        : Promise.resolve()
  );
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  requester({
    method: '',
    requestType: 'read',
  }); // retries
  requester({
    method: '',
    requestType: 'read',
  });

  const usedHosts = [
    httpRequester.mock.calls[0][0].url.hostname,
    httpRequester.mock.calls[1][0].url.hostname,
    httpRequester.mock.calls[2][0].url.hostname,
  ];
  expect(usedHosts[0]).toEqual('the_crazy_app-dsn.algolia.net'); // first try
  expect(usedHosts[1]).toEqual('the_crazy_app-1.algolianet.com'); // first retry
  expect(usedHosts[2]).toEqual('the_crazy_app-1.algolianet.com'); // second request
});

it('resolves when the response is successful', () => {
  const httpRequester = jest.fn(() => Promise.resolve({}));
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  expect(
    requester({
      method: '',
      requestType: 'write',
    })
  ).resolves.toEqual({});
});

it.skip("retries when there's an application error", () => {
  const httpRequester = jest.fn(
    () =>
      httpRequester.mock.calls.length === 1
        ? Promise.reject(
            new Error({
              reason: 'application',
            })
          )
        : Promise.resolve({})
  );
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  // it eventually resolves
  expect(
    requester({
      method: '',
      requestType: 'write',
    })
  ).resolves.toEqual({});

  // requester was called twice
  expect(httpRequester.mock.calls).toHaveLength(2);
});

it.skip("retries when there's a network error", () => {
  const httpRequester = jest.fn(
    () =>
      httpRequester.mock.calls.length === 1
        ? Promise.reject(
            new Error({
              reason: 'network',
            })
          )
        : Promise.resolve({})
  );
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  // it eventually resolves
  expect(
    requester({
      method: '',
      requestType: 'write',
    })
  ).resolves.toEqual({});

  // requester was called twice
  expect(httpRequester.mock.calls).toHaveLength(2);
});

it.skip("retries when there's a dns error", () => {
  const httpRequester = jest.fn(
    () =>
      httpRequester.mock.calls.length === 1
        ? Promise.reject(
            new Error({
              reason: 'dns',
            })
          )
        : Promise.resolve({})
  );
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  // it eventually resolves
  expect(
    requester({
      method: '',
      requestType: 'write',
    })
  ).resolves.toEqual({});

  // requester was called twice
  expect(httpRequester.mock.calls.length).toBe(2);
});

it.skip("retries when there's a timeout", () => {
  const httpRequester = jest.fn(
    () =>
      httpRequester.mock.calls.length === 1
        ? Promise.reject(
            new Error({
              reason: 'timeout',
            })
          )
        : Promise.resolve({})
  );
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  // it eventually resolves
  expect(
    requester({
      method: '',
      requestType: 'write',
    })
  ).resolves.toEqual({});

  // requester was called twice
  expect(httpRequester.mock.calls.length).toBe(2);
});

it.skip('second try after a timeout has increments the timeout', () => {
  const httpRequester = jest.fn(
    () =>
      httpRequester.mock.calls.length === 1
        ? Promise.reject(
            new Error({
              reason: 'timeout',
            })
          )
        : Promise.resolve({})
  );
  const requester = createRequester({
    appId: 'the_crazy_app',
    apiKey: '',
    httpRequester,
  });

  expect(/* the current timeout */).toBeGreaterThan(/* the original timeout */);
});

it.skip('rejects when all timeouts are reached', () => {});

it.skip('rejects when all hosts are used', () => {});

it.skip('sets host index back to 0 after it rejects', () => {});

it.skip('two instances of createRequester share the same host index', () => {});

it.skip('host indices are reset to 0 after Xs', () => {});
