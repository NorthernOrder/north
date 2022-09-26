import { BaseInteraction } from 'discord.js';
import { event } from '../utils';

export default event({
  name: 'interactionCreate',
  async handler(ctx, ...args) {
    const interaction = args[0] as BaseInteraction;

    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild || !interaction.member) return;

    const sendError = async (message: string) => {
      await interaction.reply({
        content: message,
        ephemeral: true,
      });
    };

    const command = ctx.commands.get(interaction.commandName);

    if (!command) {
      console.error(`${interaction.commandName} was not found!`);
      return await sendError(
        'There was an error while executing this command!',
      );
    }

    const roles = interaction.member.roles;
    if (Array.isArray(roles))
      return await sendError(
        'There was an error while executing this command!',
      );

    const permission = ctx.permissions.get(command.permissions);
    if (!permission)
      return await sendError(
        'There was an error while executing this command!',
      );

    if (!roles.cache.has(permission.discord))
      return await sendError(
        "You don't have the permissions to use this command",
      );

    try {
      await command.execute(ctx, interaction);
    } catch (error) {
      console.error(error);
      await sendError('There was an error while executing this command!');
    }
  },
});
