import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = new URL('.', import.meta.url).pathname;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.User,
    Partials.Message,
    Partials.GuildMember,
    Partials.Reaction,
    Partials.ThreadMember,
  ],
});

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  import(filePath).then(module => {
    const event = module.default;
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  });
}

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  import(filePath).then(module => {
    const command = module.default;
    client.commands.set(command.data.name, command);
  });
}

const symbols = [
  "bitcoin",
  "ethereum",
  "solana",
  "star-atlas",
  "sunflower-land",
  "matic-network",
];

// Set the channel IDs for each cryptocurrency price
const channelIds = {
  btc: "1105350197506232393",
  eth: "1105350230121140265",
  sol: "1105350266930331709",
  sfl: "1105350302275752048",
  atlas: "1105350336765509713",
  matic: "1109229434629800106",
  shrapnel: "1109229488795041963",
};

// Fetch the cryptocurrency prices from CoinGecko API every 10 minutes
function fetchPrice() {
  fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join()}&vs_currencies=usd`
  )
    .then((res) => res.json())
    .then((json) => {
      console.log(json);
      // Get the prices for each symbol
      const btcPrice = json.bitcoin.usd;
      const ethPrice = json.ethereum.usd;
      const solPrice = json.solana.usd;
      const atlasPrice = json["star-atlas"].usd;
      const sflPrice = json["sunflower-land"].usd;
      const maticPrice = json["matic-network"].usd;

      // Update the channels with the current prices
      client.channels.cache
        .get(channelIds.btc)
        .setName(`BTC: ${btcPrice}💲`);
      client.channels.cache
        .get(channelIds.eth)
        .setName(`ETH: ${ethPrice}💲`);
      client.channels.cache
        .get(channelIds.sol)
        .setName(`SOL: ${solPrice}💲`);
      client.channels.cache
        .get(channelIds.atlas)
        .setName(`ATLAS: ${atlasPrice}💲`);
      client.channels.cache
        .get(channelIds.sfl)
        .setName(`SFL: ${sflPrice}💲`);
      client.channels.cache
        .get(channelIds.matic)
        .setName(`MATIC: ${maticPrice}💲`);
    })
    .catch((err) => console.error(err));

  // Fetch the floor price for Shrapnel Operators Collection
  fetch("https://api.coingecko.com/api/v3/nfts/shrapnel-operators-collection")
    .then((res) => res.json())
    .then((json) => {
      const shrapnelPrice = json.floor_price.usd;

      // Update the channel with the floor price
      client.channels.cache
        .get(channelIds.shrapnel)
        .setName(`Shrapnel Op: ${shrapnelPrice}💲`);
    })
    .catch((err) => console.error(err));
}

// Fetch the prices on startup
fetchPrice();
// pause for 10 minutes
setInterval(fetchPrice, 43200000);

client.login(process.env.TOKEN);
