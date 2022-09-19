import { command } from '../utils';

export default command(
  (data) => data.setName('ping').setDescription('Replies with pong'),
  async (_ctx, interaction) => {
    await interaction.reply('Pong!');
  },
);
