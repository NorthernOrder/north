import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { command } from '../utils';

interface Options {
  isPrivate: boolean;
  rpgNotation?: string;
  sides?: number;
  amount?: number;
}

// Interface for dice roll results
interface Roll {
  dice: string;
  results: string;
}

/**
 * Regex for rpg dice notation
 * first capture gets the amount of dice to roll
 * second capture gets the sides of the dice
 * the first capture can be empty
 *
 * examples:
 * 4d8, 3d6, d12
 */
const rpgNotationRegex = /^(\d*)[dD](\d+)$/;

// Function to roll a single dice
const diceRoll = (sides: number) => {
  return Math.floor(Math.random() * sides) + 1;
};

// Function to extract amount and size of dice to roll from rpg notation
const parseRPGNotation = (rpgSyntax: string): [number, number] | undefined => {
  // Extract dice amount and sides
  const result = rpgNotationRegex.exec(rpgSyntax);

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

const rollWithRPGNotation = async (
  interaction: ChatInputCommandInteraction,
  options: Options,
) => {
  const { isPrivate, rpgNotation } = options;
  const embed = new EmbedBuilder();
  // Function to reply with an error message
  const sendError = async (message: string) => {
    embed.setDescription(message);

    await interaction.reply({ ephemeral: true, embeds: [embed] });
  };

  if (!rpgNotation)
    return await sendError(
      "Error NB1763: This shouldn't happen, please inform @Ozoku",
    );

  // Don't accept massive amouts of dice
  const isTooLong = rpgNotation.length > 50;
  if (isTooLong) return await sendError('Too much dice');

  // Splitting the text to individual dice rolls
  const dice = rpgNotation.split(' ');

  // Verify that every dice roll's syntax is valid
  if (!dice.every((die) => rpgNotationRegex.test(die)))
    return await sendError('Invalid dice syntax');

  // List to store rolls in
  const rolls = new Array<Roll>();

  // Loop through all the dice rolls
  for (const die of dice) {
    // Parse dice syntax
    const parsedDiceRoll = parseRPGNotation(die);
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
};

const rollWithBasicNotation = async (
  interaction: ChatInputCommandInteraction,
  options: Options,
) => {
  const { isPrivate, sides, amount } = options;
  const embed = new EmbedBuilder();
  // Function to reply with an error message
  const sendError = async (message: string) => {
    embed.setDescription(message);

    await interaction.reply({ ephemeral: true, embeds: [embed] });
  };

  if (!sides || !amount)
    return await sendError(
      "Error NB1764: This shouldn't happen, please inform @Ozoku",
    );

  // Error handling
  if (amount === 0)
    return await sendError('How am I supposed to roll zero dice?');
  if (sides === 2)
    return await sendError('Did you mean to flip a coin instead?');
  if (sides === 1)
    return await sendError("A 1 sided dice? that's just 1, every single time");
  if (amount > 100)
    return await sendError("I don't have that many dice to roll");
  if (sides > 1000)
    return await sendError('How big of a dice are you trying to roll?');

  // List to store results in
  const results = new Array<number>();

  // Roll the dice
  for (let i = 0; i < amount; i++) {
    results.push(diceRoll(sides));
  }

  // Store the results
  const roll = { dice: `${amount} x D${sides}`, results: results.join(', ') };

  embed.setTitle('Roll Results:');

  embed.addFields({ name: roll.dice, value: roll.results });

  await interaction.reply({ ephemeral: isPrivate, embeds: [embed] });
};

export default command(
  (data) =>
    data
      .setName('roll')
      .setDescription('Roll dices, specify nothing for a normal 6 sided dice')
      .addStringOption((option) =>
        option
          .setName('rpg')
          .setDescription(
            'RPG notation - example: 4d8, you may specify multiple',
          ),
      )
      .addNumberOption((option) =>
        option.setName('sides').setDescription('Number of sides on a dice'),
      )
      .addNumberOption((option) =>
        option.setName('amount').setDescription('Amount of dice to roll'),
      )
      .addBooleanOption((option) =>
        option.setName('private').setDescription('Show result only to you'),
      ),
  async (_ctx, interaction) => {
    // Options from user
    const isPrivate = !!interaction.options.getBoolean('private');
    const rpgNotation = interaction.options.getString('rpg') || undefined;
    const sides = interaction.options.getNumber('sides') || 6;
    const amount = interaction.options.getNumber('amount') || 1;
    const options: Options = { isPrivate, rpgNotation, sides, amount };

    if (rpgNotation) return await rollWithRPGNotation(interaction, options);

    return await rollWithBasicNotation(interaction, options);
  },
);
