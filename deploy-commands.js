import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	import(filePath).then(module => {
		const command = module.default;
		commands.push(command.data.toJSON());
	});
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
	try {
		// Attendez que toutes les commandes soient importées
		await Promise.all(commandFiles.map(file => import(path.join(commandsPath, file))));

		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID),
			// Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
