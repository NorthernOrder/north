import { PermissionFlagsBits } from 'discord.js';
import { command, Permission } from '../utils';

export default command(
  (data) =>
    data
      .setName('delete')
      .setDescription('Delete messages')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addNumberOption((option) =>
        option.setName('amount').setDescription('Amount of messages to delete'),
      ),
  async (_ctx, interaction) => {
    if (!interaction.channel) return;
    if (interaction.channel.isDMBased()) return;
    if (!interaction.channel.isTextBased()) return;

    const amount = interaction.options.getNumber('amount') ?? 1;

    await interaction.reply({
      ephemeral: true,
      content: `Deleting ${amount} messages...`,
    });

    await interaction.channel.bulkDelete(amount);

    await interaction.editReply({
      content: `Successfully deleted ${amount} messages.`,
    });
  },
  Permission.Staff,
);
