import { SlashCommandBuilder } from 'discord.js';
import { command } from '../utils.js';

export default command({
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(_ctx, interaction) {
    await interaction.reply('Pong!');
  },
});
