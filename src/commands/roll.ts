import { EmbedBuilder } from 'discord.js';
import { command } from '../utils';

// Interface for dice roll results
interface Roll {
  dice: string;
  results: string;
}

/**
 * Regex for dice
 * first capture gets the amount of dice to roll
 * second capture gets the sides of the dice
 * the first capture can be empty
 *
 * examples:
 * 4d8, 3d6, d12
 */
const diceStringRegex = /^(\d*)[dD](\d+)$/;

// Function to roll a single dice
const diceRoll = (sides: number) => {
  return Math.floor(Math.random() * sides) + 1;
};

// Function to extract amount and size of dice to roll from a string
const parseDiceRoll = (diceRoll: string): [number, number] | undefined => {
  // Extract dice amount and sides
  const result = diceStringRegex.exec(diceRoll);

  // Continue if the result is invalid
  if (!result) return;

  // Get the amount and sides from the result
  let [, amountStr, sizeStr] = result;
  // Remove undefined
  amountStr = amountStr ?? '';
  sizeStr = sizeStr ?? '';
  // If amount is empty only one dice is being rolled
  if (amountStr === '') amountStr = '1';

  // parse the amount string to a number
  const amount = parseInt(amountStr);
  const size = parseInt(sizeStr);

  return [amount, size];
};

export default command(
  (data) =>
    data
      .setName('roll')
      .setDescription('Roll dices')
      .addStringOption((option) =>
        option
          .setName('dice')
          .setDescription('the dice to roll - syntax example: 4d8')
          .setRequired(true),
      )
      .addBooleanOption((option) =>
        option.setName('private').setDescription('Show result only to you'),
      ),
  async (_ctx, interaction) => {
    const embed = new EmbedBuilder();

    const isPrivate = !!interaction.options.getBoolean('private');

    // Function to reply with an error message
    const sendError = async (message: string) => {
      embed.setDescription(message);

      await interaction.reply({ ephemeral: true, embeds: [embed] });
    };

    // The text from the user as a single string
    const diceStr = interaction.options.getString('dice') as string;

    // Don't accept massive amouts of dice
    const isTooLong = diceStr.length > 50;
    if (isTooLong) return await sendError('Too much dice');

    // Splitting the text to individual dice rolls
    const dice = diceStr.split(' ');

    // Verify that every dice roll's syntax is valid
    if (!dice.every((die) => diceStringRegex.test(die)))
      return await sendError('Invalid dice syntax');

    // List to store rolls in
    const rolls = new Array<Roll>();

    // Loop through all the dice rolls
    for (const die of dice) {
      // Parse dice syntax
      const parsedDiceRoll = parseDiceRoll(die);
      if (!parsedDiceRoll) return await sendError('Invalid dice syntax');

      // Extract amount and size
      const [amount, size] = parsedDiceRoll;

      // Error handling
      if (amount === 0)
        return await sendError('How am I supposed to roll zero dice?');
      if (size === 2)
        return await sendError('Did you mean to flip a coin instead?');
      if (size === 1)
        return await sendError(
          "A 1 sided dice? that's just 1, every single time",
        );
      if (amount > 100)
        return await sendError("I don't have that many dice to roll");
      if (size > 1000)
        return await sendError('How big of a dice are you trying to roll?');

      // List to store results in
      const results = new Array<number>();

      // Roll the dice
      for (let i = 0; i < amount; i++) {
        results.push(diceRoll(size));
      }

      // Store the results
      rolls.push({ dice: `${amount} x D${size}`, results: results.join(', ') });
    }

    embed.setTitle('Roll Results:');

    rolls.forEach((roll) =>
      embed.addFields({ name: roll.dice, value: roll.results }),
    );

    await interaction.reply({ ephemeral: isPrivate, embeds: [embed] });
  },
);
