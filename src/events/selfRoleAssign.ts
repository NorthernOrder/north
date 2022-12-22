import { Role } from '@prisma/client';
import { BaseInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import {
  addRoles,
  Context,
  event,
  prettyList,
  removeRoles,
  roleIdToRoleMention,
  snakeCase,
} from '../utils';

export const updateSelfRoles = async (
  ctx: Context,
  member: GuildMember,
  selectedRoles: Role[],
  unselectedRoles: Role[],
) => {
  const added = await addRoles(member, selectedRoles);
  const removed = await removeRoles(ctx, member, unselectedRoles);

  return { removed, added };
};

export default event({
  name: 'interactionCreate',
  async handler(ctx, ...args) {
    const interaction = args[0] as BaseInteraction;
    if (!interaction.isSelectMenu()) return;

    const selfRoleMessage = await ctx.prisma.selfRoleMessages.findUnique({
      where: { customId: interaction.customId },
    });

    const roleCategory = await ctx.prisma.roleCategory.findUnique({
      where: { id: selfRoleMessage!.roleCategoryId },
      include: { roles: true },
    });

    if (!roleCategory) return;

    const roles = roleCategory.roles.filter((role) => role.selfRole);

    const selectedRoles = roles.filter((role) =>
      interaction.values.includes(snakeCase(role.name)),
    );
    const unselectedRoles = roles.filter(
      (role) => !selectedRoles.includes(role),
    );

    const member = interaction.member as GuildMember;

    const { removed, added } = await updateSelfRoles(
      ctx,
      member,
      selectedRoles,
      unselectedRoles,
    );

    const content = [];

    if (removed.length > 0) {
      content.push(`Removed ${prettyList(removed.map(roleIdToRoleMention))}`);
    }

    if (added.length > 0) {
      content.push(`Added ${prettyList(added.map(roleIdToRoleMention))}`);
    }

    if (content.length === 0) {
      content.push('Nothing changed');
    }

    const embed = new EmbedBuilder();

    embed.setTitle('Role Update');
    embed.setDescription(content.join('\n'));

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
});
