import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { command } from '../utils';

interface Dice {
  sides: number;
  amount: number;
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
const parseRPGNotation = (rpgSyntax: string): Dice | undefined => {
  // Extract dice amount and sides
  const result = rpgNotationRegex.exec(rpgSyntax);

  // Continue if the result is invalid
  if (!result) return;

  // Get the amount and sides from the result
  let [, amountStr, sidesStr] = result;
  // Remove undefined
  amountStr = amountStr ?? '';
  sidesStr = sidesStr ?? '';
  // If amount is empty only one dice is being rolled
  if (amountStr === '') amountStr = '1';

  // parse the amount string to a number
  const amount = parseInt(amountStr);
  const sides = parseInt(sidesStr);

  return { amount, sides };
};

const getDiceFromRPGNotation = async (
  interaction: ChatInputCommandInteraction,
  embed: EmbedBuilder,
  rpgNotation: string,
): Promise<Dice[] | void> => {
  // Function to reply with an error message
  const sendError = async (message: string) => {
    embed.setDescription(message);

    await interaction.reply({ ephemeral: true, embeds: [embed] });
  };

  // Don't accept massive amouts of dice
  const isTooLong = rpgNotation.length > 50;
  if (isTooLong) return await sendError('Too much dice');

  // Splitting the text to individual dice rolls
  const dice = rpgNotation.split(' ');

  // Verify that the notation is valid for each dice roll
  if (!dice.every((die) => rpgNotationRegex.test(die)))
    return await sendError('Invalid dice syntax');

  // Parse the notations
  const parsedDice = dice.map((die) => parseRPGNotation(die));

  // Filter out invalid dice
  return parsedDice.filter((die) => !!die) as Dice[];
};

const rollDice = async (
  interaction: ChatInputCommandInteraction,
  embed: EmbedBuilder,
  dice: Dice[],
): Promise<boolean> => {
  // Function to reply with an error message
  const sendError = async (message: string) => {
    embed.setDescription(message);

    await interaction.reply({ ephemeral: true, embeds: [embed] });

    return false;
  };

  // List to store rolls in
  const rolls = new Array<Roll>();

  // Loop through all the dice rolls
  for (const die of dice) {
    // Extract amount and size
    const { amount, sides } = die;

    // Error handling
    if (amount === 0)
      return await sendError('How am I supposed to roll zero dice?');
    if (sides === 2)
      return await sendError('Did you mean to flip a coin instead?');
    if (sides === 1)
      return await sendError(
        "A 1 sided dice? that's just 1, every single time",
      );
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
    rolls.push({ dice: `${amount} x D${sides}`, results: results.join(', ') });
  }

  embed.setTitle('Roll Results:');

  rolls.forEach((roll) =>
    embed.addFields({ name: roll.dice, value: roll.results }),
  );

  return true;
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
    const rpgNotation = interaction.options.getString('rpg');
    const sides = interaction.options.getNumber('sides') ?? 6;
    const amount = interaction.options.getNumber('amount') ?? 1;

    const embed = new EmbedBuilder();
    let success = false;

    // Set basic notation as default data
    let dice: Dice[] = [{ sides, amount }];

    // Check if we can get data through RPG notation
    if (rpgNotation) {
      const rpgNotationDice = await getDiceFromRPGNotation(
        interaction,
        embed,
        rpgNotation,
      );

      if (!rpgNotationDice) return;

      dice = rpgNotationDice;
    }

    // Roll the dice
    success = await rollDice(interaction, embed, dice);

    // If the dice roll wasn't successful, we have already sent a message
    if (!success) return;

    await interaction.reply({ ephemeral: isPrivate, embeds: [embed] });
  },
);
