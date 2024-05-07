const { SlashCommandBuilder, ChannelType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

let config = JSON.parse(fs.readFileSync('./configs/guildTicketSettings.json', 'utf8'));

const updateConfig = (guildId, key, value) => {
    let settings = config.find((settings) => settings.guild === guildId);
    if (!settings) {
        settings = { guild: guildId, categoryTicket: null, categoryClosed: null, categoryOverflow: null, 'staff-roles': [] };
        config.push(settings);
    }
    settings[key] = value;
    fs.writeFileSync('./configs/guildTicketSettings.json', JSON.stringify(config, null, 2));
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-ticket')
        .setDescription('Configure the ticket system')
        .addSubcommand(subcommand => subcommand
            .setName('manage-roles')
            .setDescription('Set the roles for managing tickets')            
        )
        .addSubcommand(subcommand => subcommand
            .setName('category-ticket')
            .setDescription('Set the category for open tickets')
            .addChannelOption(option => option
                .setName('category')
                .setDescription('The category for open tickets')
                .addChannelTypes(ChannelType.GuildCategory)))
        .addSubcommand(subcommand => subcommand
            .setName('category-closed')
            .setDescription('Set the category for closed tickets')
            .addChannelOption(option => option
                .setName('category')
                .setDescription('The category for closed tickets')
                .addChannelTypes(ChannelType.GuildCategory)))
        .addSubcommand(subcommand => subcommand
            .setName('category-overflow')
            .setDescription('Set the category for overflow tickets')
            .addChannelOption(option => option
                .setName('category')
                .setDescription('The category for overflow tickets')
                .addChannelTypes(ChannelType.GuildCategory))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: false });
        const guild = interaction.guild;
        switch (subcommand)
        {
            case 'category-ticket':
                channel = interaction.options.getChannel('category');
                
                updateConfig(guild.id, 'category-ticket', channel.id);
                const emhed = new EmbedBuilder()
                    .setTitle('Ticket System')
                    .setDescription(`The category for open tickets has been set to **${channel}**\n\n**Note:** If you want to change the category, you have to run this command again.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: `${interaction.user.displayAvatarURL()}`})
                    .setColor('Green');
                await interaction.editReply({ embeds: [emhed], ephemeral: true });
                config = JSON.parse(fs.readFileSync('./configs/guildTicketSettings.json', 'utf8'));

            break;
            case 'category-closed':
                channel = interaction.options.getChannel('category');

                updateConfig(guild.id, 'category-closed', channel.id);
                const emhed2 = new EmbedBuilder()
                    .setTitle('Ticket System')
                    .setDescription(`The category for closed tickets has been set to **${channel}**\n\n**Note:** If you want to change the category, you have to run this command again.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: `${interaction.user.displayAvatarURL()}`})
                    .setColor('Green');
                await interaction.editReply({ embeds: [emhed2], ephemeral: true });
                 config = JSON.parse(fs.readFileSync('./configs/guildTicketSettings.json', 'utf8'));

            break;
            case 'category-overflow':
                channel = interaction.options.getChannel('category');

                updateConfig(guild.id, 'category-overflow', channel.id);
                const emhed3 = new EmbedBuilder()
                    .setTitle('Ticket System')
                    .setDescription(`The category for overflow tickets has been set to **${channel}**\n\n**Note:** If you want to change the category, you have to run this command again.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: `${interaction.user.displayAvatarURL()}`})
                    .setColor('Green');
                await interaction.editReply({ embeds: [emhed3], ephemeral: true });
                config = JSON.parse(fs.readFileSync('./configs/guildTicketSettings.json', 'utf8'));

            break;
            case 'manage-roles':
                const emhed4 = new EmbedBuilder()
                    .setTitle('Ticket System')
                    .setDescription(`Please use the buttons below to either add, remove or view the roles for managing tickets.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: `${interaction.user.displayAvatarURL()}`})
                    .setColor('Blurple');
                const addRole = new ButtonBuilder()
                    .setCustomId('addRole')
                    .setLabel('Add Role')
                    .setStyle('3'); 
                const removeRole = new ButtonBuilder()
                    .setCustomId('removeRole')
                    .setLabel('Remove Role')
                    .setStyle('4'); 
                const viewRoles = new ButtonBuilder()   
                    .setCustomId('viewRoles')
                    .setLabel('View Roles')
                    .setStyle('2'); 

                const frow = new ActionRowBuilder().addComponents(addRole, removeRole, viewRoles);

                await interaction.editReply({ embeds: [emhed4], components: [frow], ephemeral: false });
                const filter = i => i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
                collector.on('collect', async i => {
                    try {
                        if (i.customId === 'addRole') {
                            const modal = new ModalBuilder()
                            .setTitle('Add Roles')
                            .setComponents([])
                            .setCustomId('addRoleModal');
                            const roleID = new TextInputBuilder()
                            .setCustomId('roleID')
                            .setPlaceholder('Enter the role ID')
                            .setLabel('Role ID')
                            .setMinLength(15)
                            .setStyle(TextInputStyle.Short)
                            .setMaxLength(30);
                            const row = new ActionRowBuilder().addComponents(roleID);

                            modal.addComponents(row);
                            await i.showModal(modal);
    
                        }
                        if (i.customId === 'removeRole') {
                            const modal = new ModalBuilder()
                            .setTitle('Remove Roles')
                            .setCustomId('removeRoleModal');
                            const roleID = new TextInputBuilder()
                            .setCustomId('roleID')
                            .setPlaceholder('Enter the role ID')
                            .setLabel('Role ID')
                            .setMinLength(15)
                            .setStyle(TextInputStyle.Short)
                            .setMaxLength(30);
                            const row = new ActionRowBuilder().addComponents(roleID);

                            modal.addComponents(row);
                            await i.showModal(modal);

                        }
                        if (i.customId === 'viewRoles') {
                            await i.deferUpdate();
                            const currentRoles = config.find((settings) => settings.guild === guild.id)['staff-roles'];
                            const emhed = new EmbedBuilder()
                                .setTitle('Ticket System')
                                .setColor('Blurple');
                            if (currentRoles.length === 0) {
                                emhed.setDescription('There are no staff roles set.');
                                await i.followUp({ embeds: [emhed] });
                                return;
                            }

                            for (roleId of currentRoles) {
                                emhed.addFields({ name: 'Role', value: `<@&${roleId}>`, inline: false });
                            }                               
                            await i.followUp({ embeds: [emhed] });

                        }
                    } catch (err) {
                        console.log(err);

                    }


                    interaction.awaitModalSubmit({ time: 900000 })
                    .then( async i => {
                        try {
                            await i.deferUpdate()
    
     
    
                            if (i.customId === 'addRoleModal') {
                                const roleID = i.fields.getTextInputValue('roleID');
                                const role = await guild.roles.cache.get(roleID);
    
    
                                if (!role) {
                                    const emhed = new EmbedBuilder()
                                        .setTitle('Ticket System')
                                        .setColor('Red')
                                        .setDescription(`The role with the ID **${roleID}** <@&${roleID}>does not exist.`);
                                    const o = await i.followUp({ embeds: [emhed] });
                                    setTimeout( async () => { await o.delete(); return }, 3000);
                                    return;

    
                                }
                                else {
                                    const currentRoles = config.find((settings) => settings.guild === guild.id)['staff-roles'];
                                    if (currentRoles.includes(roleID)) {
                                        const emhed = new EmbedBuilder()
                                            .setTitle('Ticket System')
                                            .setColor('Red')
                                            .setDescription(`The role with the ID **${roleID}** is already a staff role.`);
                                        const o =  await i.followUp({ embeds: [emhed] });
                                        setTimeout( async () => { await o.delete(); }, 3000);
                                        return;
                                    }
    
                                    currentRoles.push(roleID);
    
    
                                    updateConfig(guild.id, 'staff-roles', currentRoles);
                                    const emhed = new EmbedBuilder()
                                        .setTitle('Staff Role Added')
                                        .setColor('Green')
                                        .setDescription(`The role with the ID **${roleID}** has been added as a staff role.`);
                                    const o = await i.followUp({ embeds: [emhed] });
                                    setTimeout( async () => { await o.delete(); }, 3000);
                                    
    
                                }
                            } else if (i.customId === 'removeRoleModal') {
                                const roleID = i.fields.getTextInputValue('roleID');
                                const role = await guild.roles.cache.get(roleID);
                                
                                if (!role) {
                                    const emhed = new EmbedBuilder()
                                        .setTitle('Ticket System')
                                        .setColor('Red')
                                        .setDescription(`The role with the ID **${roleID}** does not exist.`);
                                    const o = await i.followUp({ embeds: [emhed] });
                                    setTimeout( async () => { await o.delete(); return }, 3000);
                                    return;

                                }
                                else {
                                    const currentRoles = config.find((settings) => settings.guild === guild.id)['staff-roles'];
                                    if (!currentRoles.includes(roleID)) {
                                        const emhed = new EmbedBuilder()
                                            .setTitle('Ticket System')
                                            .setColor('Red')
                                            .setDescription(`The role with the ID **${roleID}** is not a staff role.`);
                                        const o =  await i.followUp({ embeds: [emhed] });
                                        setTimeout( async () => { await o.delete(); }, 3000);
                                    }
                                    currentRoles.splice(currentRoles.indexOf(roleID), 1);
                                    updateConfig(guild.id, 'staff-roles', currentRoles);
                                    const emhed = new EmbedBuilder()

                                        .setTitle('Staff Role Removed')
                                        .setColor('Green')
                                        .setDescription(`The role with the ID **${roleID}** has been removed as a staff role.`);
                                    const o = await i.followUp({ embeds: [emhed] });    
                                    setTimeout( async () => { await o.delete(); }, 3000);
                                }
                            } 
                        } catch (err) {
                            console.log(err);
    
                        }
    
                    })

                });
               
            
                
        };

    },
};
