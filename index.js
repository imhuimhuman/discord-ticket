const { Client, GatewayIntentBits, Collection, ContextMenuCommandBuilder} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token} = require('./config.json');


 

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildVoiceStates,

	],
});
client.cooldowns = new Collection();
client.commands = new Collection();

const getAllFiles = (dir) => {
    const files = fs.readdirSync(dir);
    let allFiles = [];

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // If the file is a directory, recursively call getAllFiles
            const nestedFiles = getAllFiles(filePath);
            allFiles = allFiles.concat(nestedFiles);
        } else {
            // If the file is a JavaScript file, add it to the array
            if (file.endsWith('.js')) {
                allFiles.push(filePath);
            }
        }
    });

    return allFiles;
};

const eventsPath = path.join(__dirname, 'events');
const eventFiles = getAllFiles(eventsPath);

for (const file of eventFiles) {
    const event = require(file);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}


const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
        if ('data' in command && command.data instanceof ContextMenuCommandBuilder) {
			client.commands.set(command.data.name, command);
          } else if ('data' in command && 'execute' in command) {
            // Existing logic for slash commands
			client.commands.set(command.data.name, command);
          } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
          }
	}
}


client.login(token);

