const { Events, EmbedBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/transcript/:channelId', async (req, res) => {
  const channelId = req.params.channelId;
  const transcriptFilePath = path.join(__dirname, 'transcripts', `transcript_${channelId}.html`);

  try {
    if (!fs.existsSync(transcriptFilePath)) {
      res.status(404).send('Transcript not found.');
      return;
    }
    
    res.sendFile(transcriptFilePath, (err) => {
      if (err) {
        console.error('Error sending transcript:', err);
        res.status(500).send('Failed to send transcript.');
      }
    });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).send('Internal server error.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

let config = JSON.parse(fs.readFileSync('./configs/guildTicketSettings.json', 'utf8'));
let openedTickets = JSON.parse(fs.readFileSync('./configs/openedTickets.json', 'utf8'));

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      interaction.reply({ content: 'I do not have permission to manage channels.', ephemeral: true });
      return;
    }

    // Handle button interactions
    const customId = interaction.customId;
    if (customId.startsWith('ticket')) {
      await handleTicketCreation(interaction);
    } else if (customId.startsWith('close')) {
      await handleTicketClose(interaction);
    } else if (customId.startsWith('claim')) {
      await handleTicketClaim(interaction);
    } else if (customId.startsWith('transcript')) {
      await handleTicketTranscript(interaction);
    }
  },
};

let ticketUserId;

async function handleTicketCreation(interaction) {
  try {
    ticketUserId = interaction.user.id;
    openedTickets[ticketUserId] = {
      ticketId: interaction.customId,
      opened: true,
      ticketStaff: null,
    };

    // Update opened tickets configuration
    fs.writeFileSync('./configs/openedTickets.json', JSON.stringify(openedTickets));

    const guildConfig = config.find((conf) => conf.guild === interaction.guildId);
    if (!guildConfig) {
      interaction.reply({ content: 'Configuration missing for this guild.', ephemeral: true });
      return;
    }

    await interaction.deferUpdate();

    // Create the ticket channel
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      parent: guildConfig['category-ticket'],
    });

    if (!ticketChannel) {
      interaction.reply({ content: 'Failed to create ticket channel.', ephemeral: true });
      return;
    }

    openedTickets[ticketUserId].ticketId = ticketChannel.id;

    // Create the initial embed
    const ticketEmbed = new EmbedBuilder()
      .setTitle(`Ticket ${interaction.user.username}`)
      .setDescription(`Welcome to your ticket, <@${interaction.user.id}>! Please explain your issue, and a staff member will assist you shortly.`)
      .setColor('Blurple')
      .setFooter({ text: `Ticket created by ${interaction.user.username}` });

    // Create buttons for closing and claiming
    const closeButton = new ButtonBuilder()
      .setCustomId(`close_${ticketChannel.id}`)
      .setLabel('❌ Close')
      .setStyle('Danger');

    const claimButton = new ButtonBuilder()
      .setCustomId(`claim_${ticketChannel.id}`)
      .setLabel('🔒 Claim')
      .setStyle('3');

    const actionRow = new ActionRowBuilder().addComponents(claimButton, closeButton);

    // Send the initial message in the ticket channel
    await ticketChannel.send({ embeds: [ticketEmbed], components: [actionRow] });

  } catch (error) {
    console.error('Error creating ticket:', error);
    interaction.reply({ content: 'Failed to create ticket.', ephemeral: true });
  }
}

async function handleTicketClose(interaction) {
  try {
    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      interaction.reply({ content: 'This channel does not exist.', ephemeral: true });
      return;
    }

    const guildConfig = config.find((conf) => conf.guild === interaction.guildId);
    if (!guildConfig) {
      interaction.reply({ content: 'Configuration missing for this guild.', ephemeral: true });
      return;
    }

    // Move the channel to the closed category
    await channel.edit({ parent: guildConfig['category-closed'] });

    const closeEmbed = new EmbedBuilder()
      .setTitle(`Ticket ${interaction.user.username}`)
      .setDescription(`This ticket has been closed by ${interaction.user.username}. If you need further assistance, please open a new ticket.`)
      .setColor('Red')
      .setFooter({ text: `Ticket closed by ${interaction.user.username}` });

    const transEmbed = new EmbedBuilder()
      .setTitle(`Ticket ${interaction.user.username}`)
      .setDescription(`This is the transcript for ticket ${interaction.user.username}.`)
      .setColor('Red');
      
    const transcriptButton = new ButtonBuilder()
      .setLabel('📄 Transcript')
      .setURL(`http://localhost:3000/transcript/${channel.id}`)
      .setStyle('Link');

    const deleteChannelButton = new ButtonBuilder()
      .setLabel('🗑️ Delete')
      .setCustomId(`delete_${channel.id}`)
      .setStyle('Danger');

    const actionRow = new ActionRowBuilder().addComponents(transcriptButton, deleteChannelButton);

    await interaction.reply({ embeds: [closeEmbed], components: [actionRow] });

    const collector = interaction.channel.createMessageComponentCollector({ time: 50000 });
    collector.on('collect', async i => {
        if (i.customId.startsWith(`delete`)) {
            await i.update({ content: 'Deleting channel...', components: [] });
            fs.unlinkSync(path.join(__dirname, 'transcripts', `transcript_${channelId}.html`));

            await channel.delete();
        }
    });

    openedTickets[ticketUserId] = {
      ticketId: null,
      opened: false,
      ticketStaff: null,
    };

    fs.writeFileSync('./configs/openedTickets.json', JSON.stringify(openedTickets));
    handleTicketTranscript(interaction);

    await setClosedChannelPermissions(interaction, channel);
  } catch (error) {
    console.error('Error closing ticket:', error);
    interaction.reply({ content: 'Failed to close ticket.', ephemeral: true });
  }
}

async function setClosedChannelPermissions(interaction, channel) {
  try {
    const guildConfig = config.find((conf) => conf.guild === interaction.guildId);
    const staffRoleIds = guildConfig['staff-roles'];

    if (!guildConfig) {
      interaction.reply({ content: 'Configuration missing for this guild.', ephemeral: true });
      return;
    }

    // Set permissions for @everyone and staff roles in the closed channel
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
      SendMessages: false,
      ViewChannel: true,
    });

    for (const roleId of staffRoleIds) {
      await channel.permissionOverwrites.edit(roleId, {
        SendMessages: false,
        ViewChannel: true,
      });
    }
  } catch (error) {
    console.error('Error setting closed channel permissions:', error);
    interaction.reply({ content: 'Failed to set permissions.', ephemeral: true });
  }
}

async function handleTicketClaim(interaction) {
  try {
    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      interaction.reply({ content: 'This channel does not exist.', ephemeral: true });
      return;
    }

    const guildConfig = config.find((conf) => conf.guild === interaction.guildId);
    const staffRoleIds = guildConfig['staff-roles'];

    if (!guildConfig) {
      interaction.reply({ content: 'Configuration missing for this guild.', ephemeral: true });
      return;
    }

    // Check if the user has permission to claim the ticket
    const hasPermission = interaction.member.roles.cache.some((role) => staffRoleIds.includes(role.id));
    if (!hasPermission) {
      interaction.reply({ content: 'You do not have permission to claim this ticket.', ephemeral: true });
      return;
    }

    // Allow the ticket creator to send messages in the channel
    await channel.permissionOverwrites.edit(ticketUserId, {
      SendMessages: true,
      ViewChannel: true,
    });

    // Deny send permissions for other staff roles in the claimed channel
    for (const roleId of staffRoleIds) {
      if (roleId !== interaction.member.roles.highest.id) {
        await channel.permissionOverwrites.edit(roleId, {
          SendMessages: false,
          ViewChannel: true,
        });
      }
    }

    // Allow interaction.user to send messages in the channel
    await channel.permissionOverwrites.edit(interaction.user.id, {
      SendMessages: true,
      ViewChannel: true,
    });

    // Disallow everyone from sending messages
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
      SendMessages: false,
      ViewChannel: false,
    });

    openedTickets[ticketUserId]['ticketStaff'] = interaction.user.id;
    fs.writeFileSync('./configs/openedTickets.json', JSON.stringify(openedTickets));

    // Send confirmation message
    interaction.reply({ content: 'You have claimed this ticket.', ephemeral: true });
    const claimEmbed = new EmbedBuilder()   
      .setTitle(`Ticket Claimed`)
      .setDescription(`This ticket has been claimed by ${interaction.user.username}.`)
      .setColor('Green');
    await channel.send({ embeds: [claimEmbed] });



  } catch (error) {
    console.error('Error claiming ticket:', error);
    interaction.reply({ content: 'Failed to claim ticket.', ephemeral: true });
  }
}

async function handleTicketTranscript(interaction) {
  try {
    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      interaction.reply({ content: 'This channel does not exist.', ephemeral: true });
      return;
    }

    // Create the transcript
    const transcript = await discordTranscripts.createTranscript(channel);
    const transcriptFilePath = path.join(__dirname, 'transcripts', `transcript_${channelId}.html`);

    if (!fs.existsSync(path.join(__dirname, 'transcripts'))) {
      fs.mkdirSync(path.join(__dirname, 'transcripts'));
    }

    // Save the transcript file
    fs.writeFileSync(transcriptFilePath, transcript.attachment.toString());

  } catch (error) {
    console.error('Error handling transcript:', error);
    interaction.reply({ content: 'Failed to handle transcript.', ephemeral: true });
  }
}
