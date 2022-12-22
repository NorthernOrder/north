import { PrismaClient, Role, RoleCategory } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export interface PermissionData {
  id: number;
  name: string;
  discord: string;
}

export enum Permission {
  Everyone = 1,
  Staff = 2,
  Admin = 3,
  Owner = 4,
}

export interface Context {
  client: Client;
  prisma: PrismaClient;
  commands: Collection<string, DiscordCommand>;
  permissions: Collection<number, PermissionData>;
}

export interface DiscordEvent {
  name: string;
  once?: boolean;
  handler(ctx: Context, ...args: any[]): Promise<void>;
}

export const event = (e: DiscordEvent) => {
  return {
    ...e,
    handler: async (ctx: Context, ...args: any[]) => {
      try {
        await e.handler(ctx, ...args);
      } catch (error) {
        console.error(`Caught an error from '${e.name}':`, error);
      }
    },
  };
};

export interface DiscordCommand {
  data: SlashCommandBuilder;
  execute(
    ctx: Context,
    interaction: ChatInputCommandInteraction,
  ): Promise<void>;
  permissions: Permission;
}

export type DiscordCommandData = (
  data: SlashCommandBuilder,
) =>
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

export type DiscordCommandExecutor = (
  ctx: Context,
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

export const command = (
  data: DiscordCommandData,
  execute: DiscordCommandExecutor,
  permissions = Permission.Everyone,
): DiscordCommand => {
  return {
    data: data(new SlashCommandBuilder()) as any,
    execute,
    permissions,
  };
};

export const snakeCase = (str: string) =>
  str.toLowerCase().replaceAll(' ', '_');
export const titleCase = (str: string) =>
  str
    .split('_')
    .map((s) => [s[0]!.toUpperCase(), s.slice(1)].join(''))
    .join(' ');

export const prettyList = (list: any[]) => {
  if (list.length === 1) return list[0]!;

  return (
    list.slice(0, list.length - 1).join(', ') + ' & ' + list[list.length - 1]
  );
};

export const roleIdToRoleMention = (id: string) => `<@&${id}>`;

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

export const addRoles = async (member: GuildMember, roles: Role[]) => {
  const added = new Array<string>();

  for (const role of roles) {
    if (!member.roles.cache.has(role.categoryId)) {
      await member.roles.add(role.categoryId);
    }

    if (member.roles.cache.has(role.id)) continue;

    await member.roles.add(role.id);
    added.push(role.id);
  }

  return added;
};

export const removeRoles = async (
  ctx: Context,
  member: GuildMember,
  roles: Role[],
) => {
  const removed = new Array<string>();

  for (const role of roles) {
    if (!member.roles.cache.has(role.id)) continue;

    await member.roles.remove(role.id);
    removed.push(role.id);

    const roleCategory = await ctx.prisma.roleCategory.findUnique({
      where: { id: role.categoryId },
      include: { roles: true },
    });

    if (!hasAdditionalRolesInCategory(member, roleCategory!)) {
      await member.roles.remove(role.categoryId);
    }
  }

  return removed;
};
