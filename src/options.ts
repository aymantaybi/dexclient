const provider = {
    timeout: 10000,
    reconnect: {
        auto: true,
        delay: 10,
        maxAttempts: 10,
        onTimeout: false
    }
}

export default { provider };