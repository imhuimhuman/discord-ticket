const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post')
        .setDescription('Post the ticket message to the ticket channel (or the channel you specify)')
        .addChannelOption(option => option.setName('channel').setDescription('The channel to post the ticket message to').setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        if (channel.type !== ChannelType.GuildText) return interaction.reply({ content: 'The channel you specified is not a text channel!', ephemeral: true });
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'I do not have permission to send messages in that channel!', ephemeral: true });

        }
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
        {
            return interaction.reply({ content: 'you do not have permission to do that!', ephemeral: true });
        }

        const ticketEmbed = new EmbedBuilder()
            .setTitle('Ticket')
            .setDescription('Please click the button below to create a ticket!')
            .setColor('Green')
            .setTimestamp();
        const ticketButton = new ButtonBuilder()
            .setCustomId(`ticket_${interaction.user.id}`)
            .setLabel('Support')
            .setStyle('Secondary');
        const ticketActionRow = new ActionRowBuilder().addComponents(ticketButton);
        await channel.send({ embeds: [ticketEmbed], components: [ticketActionRow] });


    }



}
