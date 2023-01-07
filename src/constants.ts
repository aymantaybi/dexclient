const websocketProviderOptions = {
  timeout: 10000,
  clientConfig: {
    maxReceivedFrameSize: 100000000,
    maxReceivedMessageSize: 100000000,
    keepalive: true,
    keepaliveInterval: 10000,
  },
  reconnect: {
    auto: true,
    delay: 100,
    maxAttempts: Infinity,
    onTimeout: true,
  },
};

export { websocketProviderOptions };
