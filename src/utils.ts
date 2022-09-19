import { PrismaClient } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  SlashCommandBuilder,
} from 'discord.js';

export interface Context {
  client: Client;
  prisma: PrismaClient;
  commands: Collection<string, DiscordCommand>;
}

export interface DiscordEvent {
  name: string;
  once?: boolean;
  handler(ctx: Context, ...args: any[]): Promise<void>;
}

export const event = (e: DiscordEvent) => e;

export interface DiscordCommand {
  data: SlashCommandBuilder;
  execute(
    ctx: Context,
    interaction: ChatInputCommandInteraction,
  ): Promise<void>;
}

export type DiscordCommandData = (
  data: SlashCommandBuilder,
) => Partial<SlashCommandBuilder>;
export type DiscordCommandExecutor = (
  ctx: Context,
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

export const command = (
  data: DiscordCommandData,
  execute: DiscordCommandExecutor,
): DiscordCommand => {
  return {
    data: data(new SlashCommandBuilder()) as any,
    execute,
  };
};
