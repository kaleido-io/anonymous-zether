module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // for more about customizing your Truffle configuration!
    networks: {
        develop: {
            host: "127.0.0.1",
            port: 7545,
            gas: 804247552,
            network_id: "*" // Match any network id
        },
        quorum1: {
            host: "127.0.0.1",
            port: 22000,
            gasPrice: 0,
            gas: 804247552,
            network_id: "*", // Match any network id
            type: "quorum"
        }
    },
    compilers: {
        solc: {
            version: "0.5.4",
        }
    }
};