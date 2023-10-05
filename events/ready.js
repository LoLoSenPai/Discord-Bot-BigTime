/* eslint-disable no-constant-condition */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fetchAllListings, addExtraInfoToListings, updateDatabase, sleep } from './scriptAlert.js';  // L'extension `.js` est nécessaire pour les imports locaux

dotenv.config();

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    await mongoose.connect(process.env.DATABASE_TOKEN || "", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    if (mongoose.connection) {
      console.log("MongoDB connected successfully");
    } else {
      console.log("MongoDB not connected");
    }
    console.log(`Ready! Logged in as ${client.user.tag}`);
    try {
      while (true) {
        console.log(`\n------APPEL FETCH_ALL_LISTINGS------`);
        const listings = await fetchAllListings();

        console.log(`\n------APPEL EXTRA_INFO_LISTINGS ------`);
        const listingsWithExtraInfo = await addExtraInfoToListings(listings);

        console.log(`\n------APPEL UPDATE_DATABASE------`);
        await updateDatabase(listingsWithExtraInfo, client);

        console.log(`\n------PAUSE DE 1 SEC AVANT LA BOUCLE------`);
        await sleep(1000); // attends 1 seconde avant de recommencer la boucle
      }
    } catch (err) {
      console.error(err);
      // Utilisez `client` pour envoyer un message d'erreur, par exemple
      const channel = client.channels.cache.get('1091352558083252234');
      channel.send(`Attention <@280514098599428097>, le bot a crash`);
    }
  },
};
