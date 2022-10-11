import { Role, RoleCategory } from '@prisma/client';
import { BaseInteraction, GuildMember } from 'discord.js';
import { event, prettyList, snakeCase } from '../utils';

const hasAdditionalRolesInCategory = (
  member: GuildMember,
  roleCategory: RoleCategory & { roles: Role[] },
) => {
  for (const additionalRole of roleCategory!.roles) {
    if (member.roles.cache.has(additionalRole.id)) {
      return true;
    }
  }

  return false;
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

    const includedRoles = roleCategory.roles.filter((role) =>
      interaction.values.includes(snakeCase(role.name)),
    );

    const changed = new Array<string>();
    const member = interaction.member as GuildMember;

    if (interaction.values.length === 0) {
      for (const role of roleCategory.roles) {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role.id);
          changed.push(role.name);
        }
      }

      if (!hasAdditionalRolesInCategory(member, roleCategory)) {
        await member.roles.remove(roleCategory.id);
      }
    } else {
      if (!member.roles.cache.has(roleCategory.id)) {
        await member.roles.add(roleCategory.id);
      }

      for (const role of includedRoles) {
        await member.roles.add(role.id);
        changed.push(role.name);
      }
    }

    const prettyRoles = prettyList(changed);
    await interaction.reply({
      content:
        interaction.values.length === 0
          ? `Removed ${prettyRoles}.`
          : `Added ${prettyRoles}.`,
      ephemeral: true,
    });
  },
});
