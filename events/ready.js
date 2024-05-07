const { Events, GuildEmojiManager } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const serverId = '1197030554546208838'; // Replace with your server ID
const jsonFilePath = './configs/bloxFruitsEmojis.json'; // Path to the JSON file

function sanitizeEmojiName(name) {
    // Replace invalid characters with underscores
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    // Truncate name to meet the required length
    return sanitized.slice(0, 32);
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        
    }
};
