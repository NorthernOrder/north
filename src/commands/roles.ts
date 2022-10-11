import {
  ActionRowBuilder,
  ColorResolvable,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  Role,
  SelectMenuBuilder,
} from 'discord.js';
import { env } from '../env';
import {
  command,
  DiscordCommandExecutor,
  Permission,
  snakeCase,
} from '../utils';

// TODO: optimize all of the prisma queries, only select fields that are used

const handleUnknownCommand: DiscordCommandExecutor = async (
  _ctx,
  interaction,
) => {
  await interaction.reply({ ephemeral: true, content: 'Unknown subcommand' });
};

const formatRoleCategoryName = (name: string, padSize: number) => {
  // const maxLength = 32;
  // const extraCharacters = 6;
  const paddingCharacter = '⠀';

  const padding = paddingCharacter.repeat(padSize);
  const extraLeftPad = name.length % 2 === 1 ? paddingCharacter : '';

  // const paddingCharacterWidth = 84 / 47;
  //
  // const availableLength = maxLength - name.length - extraCharacters;
  // const padCharacters = availableLength / paddingCharacterWidth;
  // const perSide = (padCharacters - (padCharacters % 2)) / 2;
  // const canPad = perSide - padSize >= 0;
  // const padding = paddingCharacter.repeat(canPad ? padSize : 0);
  // const extraLeftPad = padCharacters % 2 >= 1 ? paddingCharacter : '';
  //
  // console.log('\nCategory Name Formatting Info:');
  // console.log(name);
  // console.log('Available Length', availableLength);
  // console.log('Pad Characters', padCharacters);
  // console.log('Pad Per Side', perSide);
  // console.log('Requested Pad Size', padSize);
  // console.log('Extra Left Pad', !!extraLeftPad);

  return `${extraLeftPad}${padding}-- ${name} --${padding}`;
};

/**
 * Command for creating role categories in a discord server
 */
const createCategory: DiscordCommandExecutor = async (ctx, interaction) => {
  // get the amount of role categories, used later for the order
  const roleCount = await ctx.prisma.roleCategory.count();

  // get the arguments given by the user
  const name = interaction.options.getString('name')!;
  const padding = interaction.options.getNumber('padding') ?? 0;
  const formattedName = formatRoleCategoryName(name, padding);
  const order = interaction.options.getNumber('order') ?? roleCount + 1;
  let role = interaction.options.getRole('existing');

  // check if we already have a role category with given arguments
  const isExisting = await ctx.prisma.roleCategory.findFirst({
    where: { name, OR: { id: role?.id ?? '' } },
  });

  // don't create a new category if we already have an existing role category
  if (isExisting) {
    await interaction.reply({
      ephemeral: true,
      content:
        'A role category with the same name or existing role already exists',
    });
    return;
  }

  // if not attaching an existing discord role, create a new discord role
  if (!role) {
    role = await interaction.guild!.roles.create({ name, permissions: 0n });
  } else {
    await interaction.guild!.roles.edit(role.id, { name: formattedName });
  }

  // create role category in database
  await ctx.prisma.roleCategory.create({
    data: {
      name,
      order,
      padding,
      id: role.id,
    },
  });

  // complete
  await interaction.reply({ content: `Created a new role category '${name}'` });
};

/**
 * Command for editing role categories in a discord server
 */
const editCategory: DiscordCommandExecutor = async (ctx, interaction) => {
  // get the category role given by the user
  const category = interaction.options.getRole('category')!;

  // get the old data for the role category
  const old = await ctx.prisma.roleCategory.findUnique({
    where: { id: category.id },
  });

  // cancel if we couldn't find a matching role category in the database
  if (!old) {
    await interaction.reply({
      ephemeral: true,
      content: `${category.name} is not a valid role category`,
    });
    return;
  }

  const name = interaction.options.getString('name') ?? old.name;
  const padding = interaction.options.getNumber('padding') ?? old.padding;
  const formattedName = formatRoleCategoryName(name, padding);
  // get the other arguments given by the user
  const order = interaction.options.getNumber('order') ?? old.order;

  // update the role in discord
  await interaction.guild!.roles.edit(category.id, { name: formattedName });

  // update the database
  await ctx.prisma.roleCategory.update({
    where: { id: category.id },
    data: { name, order, padding },
  });

  // TODO: tell what was changed
  // complete
  await interaction.reply({ content: `Edited role category ${old.name}` });
};

// TODO: add confirmation message
/**
 * Command for deleting role categories in a discord server
 */
const deleteCategory: DiscordCommandExecutor = async (ctx, interaction) => {
  // get the arguments given by the user
  const category = interaction.options.getRole('category')!;
  const deleteRoles = interaction.options.getBoolean('deleteroles')!;

  // check if the given category exists in db
  const roleCategory = await ctx.prisma.roleCategory.findUnique({
    where: { id: category.id },
    include: { roles: true },
  });

  // if the role category isn't in in the db, do nothing
  if (!roleCategory) {
    await interaction.reply({
      ephemeral: true,
      content: "Couldn't find a matching role category",
    });
    return;
  }

  // starting actions
  await interaction.reply({ content: 'Deleting role category...' });

  // if we should also delete the roles that are part of this category
  if (deleteRoles) {
    // first delete in discord
    for (const role of roleCategory.roles) {
      const found = await interaction.guild!.roles.fetch(role.id);
      if (!found) continue;

      await interaction.guild!.roles.delete(role.id);
    }

    // and then delete in db
    await ctx.prisma.role.deleteMany({
      where: { categoryId: roleCategory.id },
    });

    // roles deleted successfully
    await interaction.editReply({
      content: 'Deleted the roles belonging to the category...',
    });
  }

  // first delete in discord
  await interaction.guild!.roles.delete(category.id);

  // and then delete in db
  await ctx.prisma.roleCategory.delete({ where: { id: roleCategory.id } });

  // complete
  await interaction.editReply({
    content: `Deleted the role category '${roleCategory.name}'`,
  });
};

/**
 * Command for listing role categories in a discord server
 */
const listCategories: DiscordCommandExecutor = async (ctx, interaction) => {
  // get all the role categories from the db
  const categories = await ctx.prisma.roleCategory.findMany();

  // create an embed for listing all the role categories
  const embed = new EmbedBuilder();
  embed.setTitle('Role Categories');

  // join all role categories to a list
  embed.setDescription(
    categories
      .sort((a, b) => a.order - b.order)
      .map((c) => `${c.order}: ${c.name}`)
      .join('\n') || 'No categories found',
  );

  // complete
  await interaction.reply({ ephemeral: true, embeds: [embed] });
};

/**
 * Handles all `categories` subcommand group's subcommands
 */
const handleCategoriesSubcommandGroup: DiscordCommandExecutor = async (
  ctx,
  interaction,
) => {
  const command = interaction.options.getSubcommand(true);

  switch (command) {
    case 'create':
      return await createCategory(ctx, interaction);
    case 'edit':
      return await editCategory(ctx, interaction);
    case 'delete':
      return await deleteCategory(ctx, interaction);
    case 'list':
      return await listCategories(ctx, interaction);
    default:
      return await handleUnknownCommand(ctx, interaction);
  }
};

const isValidHexColor = (color: ColorResolvable) => {
  if (typeof color !== 'string') return false;

  return /^#[0-9a-fA-F]{6}$/.test(color);
};

/**
 * Command for creating roles in a discord server
 */
const createRole: DiscordCommandExecutor = async (ctx, interaction) => {
  // get the amount of roles, used later for the order
  const roleCount = await ctx.prisma.role.count();

  // get the arguments given by the user
  const category = interaction.options.getRole('category')!;
  const name = interaction.options.getString('name')!;
  let color =
    (interaction.options.getString('color') as ColorResolvable | null) ??
    Colors.Default;
  const order = interaction.options.getNumber('order') ?? roleCount + 1;
  const selfRole = interaction.options.getBoolean('selfrole') ?? false;
  let role = interaction.options.getRole('existing');
  const description =
    interaction.options.getString('description') ?? 'No Description';

  // check if we already have a role with given arguments
  const isExisting = await ctx.prisma.role.findFirst({
    where: { name, OR: { id: role?.id ?? '' } },
  });

  // don't create a new category if we already have an existing role
  if (isExisting) {
    await interaction.reply({
      ephemeral: true,
      content: 'A role with the same name or role already exists',
    });
    return;
  }

  // get the given role category
  const roleCategory = await ctx.prisma.roleCategory.findUnique({
    where: { id: category.id },
  });

  // cancel if we couldn't find a matching role category in the database
  if (!roleCategory) {
    await interaction.reply({
      ephemeral: true,
      content: "Couldn't find a matching role category",
    });
    return;
  }

  // if we have a hex color, check that it is valid
  if (color && !isValidHexColor(color)) {
    await interaction.reply({
      ephemeral: true,
      content: 'Invalid color',
    });
    return;
  }

  // if not attaching an existing discord role, create a new discord role
  if (!role) {
    role = await interaction.guild!.roles.create({
      name,
      permissions: 0n,
      color,
    });
  } else {
    // otherwise edit the existing discord role to match given arguments
    const serverRole = await interaction.guild!.roles.fetch(role.id);
    if (color === Colors.Default) {
      color = serverRole!.color;
    }
    await interaction.guild!.roles.edit(role.id, { name, color });
  }

  // save role in database
  await ctx.prisma.role.create({
    data: {
      name,
      order,
      selfRole,
      description,
      id: role.id,
      categoryId: roleCategory.id,
    },
  });

  // complete
  await interaction.reply({ content: `Created a new role '${name}'` });
};

/**
 * Command for editing roles in a discord server
 */
const editRole: DiscordCommandExecutor = async (ctx, interaction) => {
  // get the role given by the user
  const role = interaction.options.getRole('role')!;

  // get the old data for the role
  const old = await ctx.prisma.role.findUnique({
    where: { id: role.id },
    include: { category: true },
  });

  // cancel if we couldn't find a matching role in the database
  if (!old) {
    await interaction.reply({
      ephemeral: true,
      content: `${role.name} is not a stored role`,
    });
    return;
  }

  // get the old category role
  const oldCategoryRole = await interaction.guild!.roles.fetch(old.category.id);
  // A stupid guard clause that shouldn't be required
  if (!oldCategoryRole) return;

  // get the other arguments given by the user
  const name = interaction.options.getString('name') ?? old.name;
  const category = interaction.options.getRole('category') ?? oldCategoryRole;
  const order = interaction.options.getNumber('order') ?? old.order;
  let color = interaction.options.getString('color') as ColorResolvable | null;
  const selfRole = interaction.options.getBoolean('selfrole') ?? old.selfRole;
  const description =
    interaction.options.getString('description') ?? old.description;

  // get the new category from the database
  const newCategory = await ctx.prisma.roleCategory.findUnique({
    where: { id: category.id },
  });

  // cancel if we couldn't find a matching role category in the database
  if (!newCategory) {
    await interaction.reply({
      ephemeral: true,
      content: `${category.name} is not a valid role category`,
    });
    return;
  }

  // if we have a hex color, check tat it is valid
  if (color && !isValidHexColor(color)) {
    await interaction.reply({
      ephemeral: true,
      content: 'Invalid color',
    });
    return;
  }

  // update the role in discord
  const serverRole = await interaction.guild!.roles.fetch(role.id);
  if (!color) {
    color = serverRole!.color;
  }
  await interaction.guild!.roles.edit(role.id, { name, color });

  // update the database
  await ctx.prisma.role.update({
    where: { id: role.id },
    data: {
      name,
      order,
      selfRole,
      description,
    },
  });

  // TODO: tell what was changed
  // complete
  await interaction.reply({ content: `Edited role ${old.name}` });
};

/**
 * Command for deleting roles in a discord server
 */
const deleteRole: DiscordCommandExecutor = async (ctx, interaction) => {
  // get the arguments given by the user
  const role = interaction.options.getRole('role')!;

  // check if the given role exists in db
  const exists = await ctx.prisma.role.findUnique({
    where: { id: role.id },
  });

  // if the role isn't in in the db, do nothing
  if (!exists) {
    await interaction.reply({
      ephemeral: true,
      content: "Couldn't find the role",
    });
    return;
  }

  // starting actions
  await interaction.reply({ content: 'Deleting role...' });

  // first delete in discord
  await interaction.guild?.roles.delete(role.id);

  // and then delete in db
  await ctx.prisma.role.delete({ where: { id: role.id } });

  // complete
  await interaction.editReply({ content: `Deleted the role '${role.name}'` });
};

/**
 * Command for listing categorized roles in a discord server
 */
const listRoles: DiscordCommandExecutor = async (ctx, interaction) => {
  // get the arguments given by the user
  const category = interaction.options.getRole('category');

  // if a category wasn't provided, list all roles
  if (!category) {
    // get all the role categories from the db with roles
    const categories = await ctx.prisma.roleCategory.findMany({
      include: { roles: true },
    });

    // create an embed for listing all the roles
    const embed = new EmbedBuilder();
    embed.setTitle('Roles');

    // list all the categories in the embed
    categories
      .sort((a, b) => a.order - b.order)
      .forEach((category) => {
        embed.addFields({
          name: category.name,
          value: category.roles.map((r) => r.name).join(', ') || 'None found',
        });
      });

    // complete
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  // get the role category from the db
  const roleCategory = await ctx.prisma.roleCategory.findUnique({
    where: { id: category.id },
    include: { roles: true },
  });

  // there won't be anything to show if the role category doesn't exist
  if (!roleCategory) {
    await interaction.reply({
      ephemeral: true,
      content: `${category.name} is not a valid role category`,
    });
    return;
  }

  // create an embed for listing the roles in the category
  const embed = new EmbedBuilder();
  embed.setTitle(`${roleCategory.name} Roles`);

  // join all roles to a list
  embed.setDescription(roleCategory.roles.map((r) => r.name).join(', '));

  // complete
  await interaction.reply({ ephemeral: true, embeds: [embed] });
};

/**
 * Sorts all the roles in a discord server based on the order of categories and roles in db
 */
const sortRoles: DiscordCommandExecutor = async (ctx, interaction) => {
  const roleManager = interaction.guild?.roles;
  if (!roleManager) return;

  const roleCategories = await ctx.prisma.roleCategory.findMany({
    include: { roles: true },
  });

  // Sorting role categories based on the order
  const sortedCategories = roleCategories.sort((a, b) => a.order - b.order);

  // Sorting discord roles based on their position, used later for sorting
  // unmanaged roles
  const unmanagedRoles = [
    ...roleManager.cache
      .sorted((a, b) => b.rawPosition - a.rawPosition)
      .values(),
  ];

  // count of roles in server
  const roleCount = unmanagedRoles.length;
  // remove the first few roles that shouldn't be sorted
  unmanagedRoles.splice(0, env.NO_SORT_ROLE_COUNT);

  // new array that will contain sorted roles
  const rolesInOrder = new Array<Role>();

  // populate rolesInOrder
  for (const roleCategory of sortedCategories) {
    // first handle role category itself
    const roleCategoryIdx = unmanagedRoles.findIndex(
      (role) => role.id === roleCategory.id,
    );
    if (roleCategoryIdx === -1)
      throw new Error("Couldn't find roleCategory in discord");

    // cut role category from unmanaged roles
    const [cutRoleCategory] = unmanagedRoles.splice(roleCategoryIdx, 1);
    rolesInOrder.push(cutRoleCategory!);

    // now handle all of the roles in the role category
    for (const role of roleCategory.roles) {
      const roleIdx = unmanagedRoles.findIndex((r) => r.id === role.id);
      if (roleIdx === -1) throw new Error("Couldn't find role in discord");

      // cut role from unmanaged roles
      const [cutRole] = unmanagedRoles.splice(roleIdx, 1);
      rolesInOrder.push(cutRole!);
    }

    // combination of sorted roles and unmanaged roles in reverse order
    const allRoles = rolesInOrder.concat(unmanagedRoles).reverse();

    const rolesWithPositions = [];
    for (let i = roleCount - 1; i >= 0; i--) {
      // ignore the few first roles that shouldn't be sorted
      const nthRole = roleCount - i - 1;
      if (env.NO_SORT_ROLE_COUNT > nthRole) continue;

      // set the position
      rolesWithPositions.push({ role: allRoles[i]!, position: i + 1 });
    }
    // update role positions in discord
    await roleManager.setPositions(rolesWithPositions);
  }
};

/**
 * Replaces the self role messages in the roles channel in a discord server with updated ones
 */
const updateSelfRoles: DiscordCommandExecutor = async (ctx, interaction) => {
  const messages = await ctx.prisma.selfRoleMessages.findMany({
    include: { category: true },
  });

  const channel = await interaction.guild!.channels.fetch(
    env.SELF_ROLE_CHANNEL,
  );
  if (!channel?.isTextBased()) return;

  for (const message of messages) {
    await channel.messages.delete(message.id);
  }

  await ctx.prisma.selfRoleMessages.deleteMany();

  const roleCategories = await ctx.prisma.roleCategory.findMany({
    include: { roles: true },
  });
  const selfRoleCategories = roleCategories.filter((category) =>
    category.roles.some((role) => role.selfRole),
  );

  for (const category of selfRoleCategories) {
    const embed = new EmbedBuilder();
    embed.setTitle(`Assign ${category.name}`);
    embed.setDescription(
      category.roles
        .map((role) => `<@&${role.id}> - ${role.description}`)
        .join('\n'),
    );

    const options = category.roles.map((role) => ({
      label: role.name,
      value: snakeCase(role.name),
    }));

    const customId = `${interaction.guild!.id}-${snakeCase(category.name)}`;
    const row = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('Nothing selected')
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(...options),
    ) as any;

    const msg = await channel.send({ embeds: [embed], components: [row] });

    await ctx.prisma.selfRoleMessages.create({
      data: { id: msg.id, roleCategoryId: category.id, customId },
    });
  }
};

/**
 * Command for updating roles from database in a discord server
 */
const updateRoles: DiscordCommandExecutor = async (ctx, interaction) => {
  const order = interaction.options.getBoolean('order') ?? true;
  const selfrole = interaction.options.getBoolean('selfrole') ?? true;

  await interaction.reply({ content: 'Updating roles...' });

  if (order) {
    await sortRoles(ctx, interaction);
    await interaction.editReply({ content: 'Sorted roles' });
  }

  if (selfrole) {
    await updateSelfRoles(ctx, interaction);
    await interaction.editReply({ content: 'Updated self roles' });
  }
};

/**
 * Handles all other `roles` command's subcommands
 */
const handleOtherCommands: DiscordCommandExecutor = async (
  ctx,
  interaction,
) => {
  const command = interaction.options.getSubcommand(true);

  switch (command) {
    case 'create':
      return await createRole(ctx, interaction);
    case 'edit':
      return await editRole(ctx, interaction);
    case 'delete':
      return await deleteRole(ctx, interaction);
    case 'list':
      return await listRoles(ctx, interaction);
    case 'update':
      return await updateRoles(ctx, interaction);
    default:
      return await handleUnknownCommand(ctx, interaction);
  }
};

export default command(
  (data) =>
    data
      .setName('roles')
      .setDescription('Manage server roles')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommandGroup((subgroup) =>
        subgroup
          .setName('categories')
          .setDescription('Manage server role categories')
          .addSubcommand((sub) =>
            sub
              .setName('create')
              .setDescription('Creates a role category')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the role category')
                  .setRequired(true),
              )
              .addNumberOption((option) =>
                option
                  .setName('order')
                  .setDescription(
                    'Ordering of the category. If omitted, the category will be appended',
                  ),
              )
              .addRoleOption((option) =>
                option
                  .setName('existing')
                  .setDescription(
                    'Convert an existing, unmanaged role category to a managed one',
                  ),
              )
              .addNumberOption((option) =>
                option
                  .setName('padding')
                  .setDescription(
                    'Amount of padding on sides of the category name',
                  ),
              ),
          )
          .addSubcommand((sub) =>
            sub
              .setName('edit')
              .setDescription('Edit a role category')
              .addRoleOption((option) =>
                option
                  .setName('category')
                  .setDescription('The role category to edit')
                  .setRequired(true),
              )
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('New name for the role category'),
              )
              .addNumberOption((option) =>
                option
                  .setName('order')
                  .setDescription('Ordering of the category in list'),
              )
              .addNumberOption((option) =>
                option
                  .setName('padding')
                  .setDescription(
                    'Amount of padding on sides of the category name',
                  ),
              ),
          )
          .addSubcommand((sub) =>
            sub
              .setName('delete')
              .setDescription('Delete a role category')
              .addRoleOption((option) =>
                option
                  .setName('category')
                  .setDescription('The role category to delete')
                  .setRequired(true),
              )
              .addBooleanOption((option) =>
                option
                  .setName('deleteroles')
                  .setDescription(
                    'Should we also delete the roles that belong to this role category',
                  )
                  .setRequired(true),
              ),
          )
          .addSubcommand((sub) =>
            sub.setName('list').setDescription('Lists all the role categories'),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('create')
          .setDescription('Create a new role')
          .addRoleOption((option) =>
            option
              .setName('category')
              .setDescription('The category to assign the role to')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('The name of the role')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('color')
              .setDescription('The color of the role. No color by default'),
          )
          .addNumberOption((option) =>
            option
              .setName('order')
              .setDescription(
                'Ordering of the role. If omitted, the role will be appended',
              ),
          )
          .addBooleanOption((option) =>
            option
              .setName('selfrole')
              .setDescription(
                'If the role should be assignable by users. Disabled by default',
              ),
          )
          .addRoleOption((option) =>
            option
              .setName('existing')
              .setDescription(
                'Convert an existing, unmanaged role to a managed one',
              ),
          )
          .addStringOption((option) =>
            option
              .setName('description')
              .setDescription('Description for the role'),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('edit')
          .setDescription('Edit a role')
          .addRoleOption((option) =>
            option
              .setName('role')
              .setDescription('The role to edit')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option.setName('name').setDescription('New name for the role'),
          )
          .addNumberOption((option) =>
            option
              .setName('order')
              .setDescription('Ordering of the role in list'),
          )
          .addStringOption((option) =>
            option.setName('color').setDescription('The color of the role'),
          )
          .addRoleOption((option) =>
            option
              .setName('category')
              .setDescription('The category of the role'),
          )
          .addBooleanOption((option) =>
            option
              .setName('selfrole')
              .setDescription('If the role should be assignable by users'),
          )
          .addStringOption((option) =>
            option
              .setName('description')
              .setDescription('Description for the role'),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('delete')
          .setDescription('Delete a role')
          .addRoleOption((option) =>
            option
              .setName('role')
              .setDescription('The role to delete')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('list')
          .setDescription('Lists roles')
          .addRoleOption((option) =>
            option
              .setName('category')
              .setDescription(
                'Category to list roles of. If omitted, lists all roles along with categories',
              ),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('update')
          .setDescription('Update roles from the database')
          .addBooleanOption((option) =>
            option.setName('order').setDescription('Should update role order'),
          )
          .addBooleanOption((option) =>
            option
              .setName('selfrole')
              .setDescription('Should update selfroles'),
          ),
      ),
  async (ctx, interaction) => {
    const categoriesGroup = interaction.options.getSubcommandGroup(false);

    switch (categoriesGroup) {
      case 'categories':
        return await handleCategoriesSubcommandGroup(ctx, interaction);
      default:
        return await handleOtherCommands(ctx, interaction);
    }
  },
  Permission.Admin,
);
