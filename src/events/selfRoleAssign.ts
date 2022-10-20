import { Role, RoleCategory } from '@prisma/client';
import { BaseInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import {
  Context,
  event,
  prettyList,
  roleIdToRoleMention,
  snakeCase,
} from '../utils';

type RoleCategoryWithRoles = RoleCategory & { roles: Role[] };

const hasAdditionalRolesInCategory = (
  member: GuildMember,
  roleCategory: RoleCategoryWithRoles,
) => {
  for (const additionalRole of roleCategory!.roles) {
    if (member.roles.cache.has(additionalRole.id)) {
      return true;
    }
  }

  return false;
};

const updateSelfRoles = async (
  member: GuildMember,
  roleCategory: RoleCategoryWithRoles,
  selectedRoles: Role[],
  unselectedRoles: Role[],
) => {
  const removed = new Array<string>();
  const added = new Array<string>();

  for (const role of unselectedRoles) {
    if (!member.roles.cache.has(role.id)) continue;

    await member.roles.remove(role.id);
    removed.push(role.id);
  }

  for (const role of selectedRoles) {
    if (member.roles.cache.has(role.id)) continue;

    await member.roles.add(role.id);
    added.push(role.id);
  }

  if (!hasAdditionalRolesInCategory(member, roleCategory)) {
    await member.roles.remove(roleCategory.id);
  }

  if (
    hasAdditionalRolesInCategory(member, roleCategory) &&
    !member.roles.cache.has(roleCategory.id)
  ) {
    await member.roles.add(roleCategory.id);
  }

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

    const selectedRoles = roleCategory.roles.filter((role) =>
      interaction.values.includes(snakeCase(role.name)),
    );
    const unselectedRoles = roleCategory.roles.filter(
      (role) => !selectedRoles.includes(role),
    );

    const member = interaction.member as GuildMember;

    const { removed, added } = await updateSelfRoles(
      member,
      roleCategory,
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
