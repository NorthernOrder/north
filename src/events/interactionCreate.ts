import { BaseInteraction } from 'discord.js';
import { event } from '../utils';

export default event({
  name: 'interactionCreate',
  async handler(ctx, ...args) {
    const interaction = args[0] as BaseInteraction;

    if (!interaction.isChatInputCommand()) return;

    const command = ctx.commands.get(interaction.commandName);

    if (!command) {
      console.error(`${interaction.commandName} was not found!`);
      return;
    }

    try {
      await command.execute(ctx, interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  },
});
