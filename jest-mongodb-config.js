module.exports = {
    mongodbMemoryServerOptions: {
        binary: {
            version: '4.4.22', // MongoDB version
            skipMD5: true, // Skip MD5 checksum check
        },
        instance : {
            dbName: 'jest', // Database name
        },
        autoStart: false,
    }
}