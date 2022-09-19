import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  Client,
  Collection,
  GatewayIntentBits,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord.js';
import { REST } from '@discordjs/rest';
import { join, dirname } from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { Context, DiscordCommand, DiscordEvent } from './utils.js';
import { existsSync } from 'node:fs';
// import { fileURLToPath, pathToFileURL } from 'node:url';
import fastDeepEqual from 'fast-deep-equal';

// const fileDir = dirname(fileURLToPath(import.meta.url));

async function loadEvents(ctx: Context) {
  console.log('Loading events...');

  // const eventsPath = join(fileDir, 'events');
  const eventsPath = join(__dirname, 'events');
  const eventFiles = await readdir(eventsPath);

  for (const file of eventFiles) {
    if (!(file.endsWith('ts') || file.endsWith('js'))) continue;

    const filePath = join(eventsPath, file);
    const event = require(filePath.slice(0, -3)).default as DiscordEvent;
    // const eventImport = await import(pathToFileURL(filePath).toString());
    // const event = eventImport.default as DiscordEvent;

    if (event.once) {
      ctx.client.once(event.name, (...args) => event.handler(ctx, ...args));
    } else {
      ctx.client.on(event.name, (...args) => event.handler(ctx, ...args));
    }
  }

  console.log('Events loaded!');
}

async function loadCommands(ctx: Context) {
  console.log('Loading commands...');

  // const commandsPath = join(fileDir, 'commands');
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = await readdir(commandsPath);

  for (const file of commandFiles) {
    if (!(file.endsWith('ts') || file.endsWith('js'))) continue;

    const filePath = join(commandsPath, file);
    const command = require(filePath.slice(0, -3)).default as DiscordCommand;
    // const commandImport = await import(pathToFileURL(filePath).toString());
    // const command = commandImport.default as DiscordCommand;

    ctx.commands.set(command.data.name, command);
  }

  console.log('Commands loaded!');
}

async function deployCommands(ctx: Context) {
  let deployedCommandsStr = '';
  // const deployedCommandsPath = join(fileDir, '..', 'deployedCommands.json');
  const deployedCommandsPath = join(__dirname, '..', 'deployedCommands.json');

  if (existsSync(deployedCommandsPath)) {
    console.log('Reading deployedCommands.json');

    deployedCommandsStr = await readFile(deployedCommandsPath, 'utf-8');
  }

  const currentCommands = ctx.commands.map((c) => c.data.toJSON());
  const currentCommandsStr = JSON.stringify(currentCommands);

  if (deployedCommandsStr === currentCommandsStr) {
    console.log(
      "Commands haven't changed since last start, skipping command deployment",
    );
    return;
  }

  console.log(
    deployedCommandsStr.length === 0
      ? "Commands haven't been deployed yet, deploying commands..."
      : 'Commands have changed since last start, deploying commands...',
  );

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: currentCommands,
  });

  console.log('Commands deployed successfully!');

  await writeFile(
    deployedCommandsPath,
    JSON.stringify(currentCommands),
    'utf-8',
  );

  console.log(
    deployedCommandsStr.length === 0
      ? 'Wrote deployedCommands.json'
      : 'Updated deployedCommands.json',
  );
}

const prisma = new PrismaClient();

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const commands = new Collection<string, DiscordCommand>();

  const ctx: Context = {
    client,
    prisma,
    commands,
  };

  await loadEvents(ctx);
  await loadCommands(ctx);
  await deployCommands(ctx);

  console.log('Logging in...');
  await client.login(process.env.TOKEN);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });