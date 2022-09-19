import { EmbedBuilder } from 'discord.js';
import { command } from '../utils';

const coinFlip = () => Math.random() >= 0.5;

const coinify = (isHeads: boolean) => (isHeads ? 'heads' : 'tails');

export default command(
  (data) =>
    data
      .setName('flip')
      .setDescription('Flip coins')
      .addNumberOption((option) =>
        option.setName('coins').setDescription('Amount of coins to flip'),
      )
      .addBooleanOption((option) =>
        option.setName('private').setDescription('Show result only to you'),
      ),
  async (_ctx, interaction) => {
    const embed = new EmbedBuilder();

    const coins = interaction.options.getNumber('coins');
    const isPrivate = !!interaction.options.getBoolean('private');

    const send = async (desc: string, isPrivate: boolean) => {
      embed.setDescription(desc);

      await interaction.reply({ ephemeral: isPrivate, embeds: [embed] });
    };

    if (coins === null) {
      if (Math.random() < 0.03)
        return await send("It landed on it's side.", isPrivate);

      return await send(`It landed on ${coinify(coinFlip())}`, isPrivate);
    }

    if (coins.toString().length > 3)
      return await send('WTF are you trying to do?', true);

    if (coins < 0)
      return await send(
        'How am I supposed to flip a negative amount of coins?',
        true,
      );
    if (coins < 1)
      return await send('How am I supposed to flip zero coins?', true);
    if (coins < 2)
      return await send(
        "Did you know that you don't need to type the amount if you are only flipping one coin?",
        true,
      );

    let heads = 0;
    let tails = 0;

    for (let i = 0; i < coins; i++) {
      coinFlip() ? heads++ : tails++;
    }

    embed.addFields(
      { name: 'Heads:', value: heads.toString() },
      { name: 'Tails:', value: tails.toString() },
    );

    await interaction.reply({ ephemeral: isPrivate, embeds: [embed] });
  },
);
