import { env } from './env';
import {
  ActivityType,
  Client,
  Collection,
  GatewayIntentBits,
  Routes,
} from 'discord.js';
import { REST } from '@discordjs/rest';
import { join } from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import {
  Context,
  DiscordCommand,
  DiscordEvent,
  Permission,
  PermissionData,
} from './utils';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

async function loadEvents(ctx: Context) {
  console.log('Loading events...');

  const eventsPath = join(__dirname, 'events');
  const eventFiles = await readdir(eventsPath);

  for (const file of eventFiles) {
    if (!(file.endsWith('ts') || file.endsWith('js'))) continue;

    const filePath = join(eventsPath, file);
    const eventImport = await import(pathToFileURL(filePath).toString());
    const event = eventImport.default.default as DiscordEvent;

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

  const commandsPath = join(__dirname, 'commands');
  const commandFiles = await readdir(commandsPath);

  for (const file of commandFiles) {
    if (!(file.endsWith('ts') || file.endsWith('js'))) continue;

    const filePath = join(commandsPath, file);
    const commandImport = await import(pathToFileURL(filePath).toString());
    const command = commandImport.default.default as DiscordCommand;

    ctx.commands.set(command.data.name, command);
  }

  console.log('Commands loaded!');
}

async function deployCommands(ctx: Context) {
  let deployedCommandsStr = '';
  const deployedCommandsPath = join(
    __dirname,
    '..',
    'data',
    'deployedCommands.json',
  );

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

  const rest = new REST({ version: '10' }).setToken(env.TOKEN);

  await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
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

function loadPermissions(ctx: Context) {
  ctx.permissions.set(Permission.Everyone, {
    id: Permission.Everyone,
    name: 'Everyone',
    discord: env.PERMISSION_EVERYONE,
  });

  ctx.permissions.set(Permission.Staff, {
    id: Permission.Staff,
    name: 'Staff',
    discord: env.PERMISSION_STAFF,
  });

  ctx.permissions.set(Permission.Admin, {
    id: Permission.Admin,
    name: 'Admin',
    discord: env.PERMISSION_ADMIN,
  });

  ctx.permissions.set(Permission.Owner, {
    id: Permission.Owner,
    name: 'Owner',
    discord: env.PERMISSION_OWNER,
  });
}

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildPresences,
    ],
  });

  const commands = new Collection<string, DiscordCommand>();
  const permissions = new Collection<number, PermissionData>();

  const ctx: Context = {
    client,
    commands,
    permissions,
  };

  loadPermissions(ctx);
  await loadEvents(ctx);
  await loadCommands(ctx);
  await deployCommands(ctx);

  console.log('Logging in...');
  await client.login(env.TOKEN);

  client.user!.setActivity({
    name: 'v0.4',
    type: ActivityType.Playing,
  });
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
