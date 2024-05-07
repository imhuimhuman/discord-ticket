const { Events, Collection} = require('discord.js');
const cooldowns = new Collection();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }     

        if (!cooldowns.has(interaction.commandName)) {
            cooldowns.set(interaction.commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(interaction.commandName);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return interaction.reply({ content: `Please wait \`${timeLeft.toFixed(1)}\` more second(s) before reusing the \`${interaction.commandName}\` command.`, ephemeral: true });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);



        try {
            if (interaction.isCommand()) {
                await command.execute(interaction);
            } else if (interaction.isAutocomplete()) {
                await command.autocomplete(interaction);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },
};
