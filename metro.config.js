const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SQLite WASM فائلز کو لوڈ کرنے کی اجازت دیں
config.resolver.assetExts.push('wasm');

module.exports = config;