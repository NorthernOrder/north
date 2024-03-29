import {
  ChatInputCommandInteraction,
  Client,
  Collection,
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
export const userIdToUserMention = (id: string) => `<@${id}>`;
