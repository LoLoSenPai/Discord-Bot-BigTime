import { EmbedBuilder, ButtonBuilder, ActionRowBuilder } from 'discord.js';
import Item from '../models/listing.js';  // Notez que l'extension `.js` peut être nécessaire pour les imports locaux
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// fonction pour mettre en pause l'exécution du programme pendant un certain temps
export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// fonction pour récupérer tous les listings depuis l'API OpenLoot
export async function fetchAllListings() {
  console.log("Récupération des listings en cours...");
  const pageSize = 200;
  let currentPage = 1;
  let totalPages = 1;
  let listings = [];

  try {
    while (currentPage <= totalPages) {
      await new Promise((resolve) => setTimeout(resolve, 2300));
      const url = `https://openloot.com/api/v2/market/listings?pageSize=${pageSize}&page=${currentPage}`;

      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response from API:', text);
        throw new Error('API responded with an error.');
      }
      const jsonResponse = await response.json();
      if (response.ok) {
        listings.push(...jsonResponse.items);
        totalPages = jsonResponse.totalPages;
        currentPage++;
        console.log(
          `Fetched ${listings.length} out of ${jsonResponse.totalItems} listings`
        );
        await new Promise((resolve) => setTimeout(resolve, 2300)); // Ajout d'une pause de 1.3 secondes entre chaque requête
      } else {
        console.log(`Error ${response.status}: ${response.statusText}`);
      }
    }
    console.log(`Total pages fetched: ${totalPages}`);
    console.log(
      `Tous les items ont été récupérés (${listings.length} au total)`
    );
  } catch (err) {
    console.log("Error during API call:", err.message);
    if (err.response) {
      console.log("Response body:", await err.response.text());
    }
  }
  // listings = listings.filter(item => Object.prototype.hasOwnProperty.call(item, 'minPrice'));
  listings = listings.filter(item => Object.hasOwn.call(item, 'minPrice'));
  return listings;
}

// fonction pour ajouter des informations supplémentaires aux listings
export async function addExtraInfoToListings(listings) {
  console.log("Récupération des informations supplémentaires en cours...");

  const filteredListings = [];

  // La taille du lot est définie ici
  const batchSize = 180;

  // Parcourir la liste par lots
  for (let i = 0; i < listings.length; i += batchSize) {
    const batchListings = listings.slice(i, i + batchSize);
    // Obtenir une liste des noms des articles du lot
    const itemNames = batchListings.map((listing) => listing.metadata.name);

    // Rechercher les articles dans la base de données
    const itemsInDb = await Item.find({ name: { $in: itemNames } });
    const itemsInDbMap = itemsInDb.reduce((map, item) => {
      map[item.name] = item;
      return map;
    }, {});

    // Parcourir les articles du lot
    for (let j = 0; j < batchListings.length; j++) {
      const {
        // eslint-disable-next-line no-unused-vars
        id,
        metadata: { name, archetypeId },
        minPrice,
      } = batchListings[j];

      const itemInDb = itemsInDbMap[name];

      if (!itemInDb) {
        filteredListings.push(batchListings[j]);
        console.log(
          `${i + j + 1} of ${listings.length
          } Item ${name} ajouté au tableau des items à filtrer`
        );
        // Si le prix minimum est le même, on ne fait rien
      } else if (itemInDb.minPrice === minPrice) {
        continue;
        // console.log(
        //   `${i + j + 1} of ${
        //     listings.length
        //   } Item ${name} trouvé dans la base de données`
        // );
      } else if (!archetypeId) {
        console.log(
          `${i + j + 1} of ${listings.length
          } archetypeId manquant pour l'objet ${name}`
        );
      } else {
        const url = `https://openloot.com/api/v2/market/listings/${archetypeId}/items?onSale=true&page=1&pageSize=1&sort=price%3Aasc`;

        try {
          const response = await fetch(url);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log(`Pause d'une demi seconde entre chaque requête`);
          const jsonResponse = await response.json();
          const archetypeItem = jsonResponse.items[0];
          const idBis = archetypeItem.id;
          const orderId = archetypeItem.orderId;
          const issuedId = archetypeItem.item.issuedId;
          const onSale = archetypeItem.onSale;

          filteredListings.push({
            ...batchListings[j],
            idBis,
            orderId,
            issuedId,
            onSale,
          });
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
  console.log(`${filteredListings.length} objets ont été filtrés.`);
  console.log(filteredListings);
  return filteredListings;
}


// fonction pour mettre à jour la base de données avec les nouveaux listings
export async function updateDatabase(listingsWithExtraInfo, client) {
  if (listingsWithExtraInfo.length === 0) {
    console.log("Aucun objet à mettre à jour.");
    return;
  }
  console.log("Mise à jour de la base de données en cours...");
  const existingItems = await Item.find({ name: { $exists: true } });
  const existingItemNames = new Set(existingItems.map((item) => item.name));

  for (const item of listingsWithExtraInfo) {
    const {
      id,
      minPrice,
      idBis,
      issuedId,
      metadata: { name, archetypeId },
      orderId,
      onSale,
    } = item;
    // Vérification si l'item existe déjà dans la base de données
    if (existingItemNames.has(name)) {
      // Si oui, récupération du listing existant
      const existingItem = existingItems.find((el) => el.name === name);
      // Vérification si le minPrice est différent
      if (existingItem.minPrice !== minPrice) {
        // Si le prix a changé, mise à jour de l'objet existant
        await Item.findOneAndUpdate(
          { name: name },
          { ...item },
          { upsert: true }
        );
        console.log("Mise à jour de l'item " + name);
      } else {
        // Sinon, on passe à l'item suivant
        continue;
      }
    } else {
      // Si non, création d'un nouvel item avec toutes les informations
      const newItem = new Item({
        // _id: new mongoose.Types.ObjectId(), // Génère un nouvel _id
        id: id,
        minPrice: minPrice,
        name: name,
        idBis: idBis,
        archetypeId: archetypeId,
        issuedId: issuedId,
        orderId: orderId,
        onSale: onSale,
      });
      console.log("Création de l'item " + name);
      console.log(newItem);
      await newItem.save();
    }
  }
  console.log("Mise à jour de la base de données terminée");

  console.log("Calcul si baisse...");
  // eslint-disable-next-line no-unused-vars
  const bulkOps = listingsWithExtraInfo.map((item) => {
    const { minPrice, metadata, orderId, issuedId } = item;
    const difPrice = existingItemNames.has(metadata.name)
      ? ((minPrice -
        existingItems.find(
          (existingItem) => existingItem.name === metadata.name
        ).minPrice) /
        existingItems.find(
          (existingItem) => existingItem.name === metadata.name
        ).minPrice) *
      100
      : null;

    if (difPrice <= -5) {
      const existingItem = existingItems.find(
        (existingItem) => existingItem.name === metadata.name
      );
      const percentDecrease =
        ((existingItem.minPrice - minPrice) / existingItem.minPrice) * 100;
      console.log(`${metadata.name} !`);
      console.log(
        `Ancien floor price: ${existingItem.minPrice} $ | Nouveau floor price: ${minPrice} $`
      );
      console.log(`Baisse de ${difPrice.toFixed(2)}%`);

      // Attribute a rarity rank
      let rarity;
      if (metadata.rarity === "common") {
        rarity = {
          value: "common",
          image:
            "<:common1:1024082214926942288><:common2:1024082217309306951><:common3:1024082219507142757>",
          color: "#D1D1D1",
        };
      } else if (metadata.rarity === "uncommon") {
        rarity = {
          value: "uncommon",
          image:
            "<:uncommon1:1024082248879849522><:uncommon2:1024082250993774652><:uncommon3:1024082253489393705>",
          color: "#0BF54E",
        };
      } else if (metadata.rarity === "rare") {
        rarity = {
          value: "rare",
          image:
            "<:rare1:1024082242345111642><:rare2:1024082244698132570><:rare3:1024082246824644708>",
          color: "#0B8EF5",
        };
      } else if (metadata.rarity === "epic") {
        rarity = {
          value: "epic",
          image:
            "<:epic1:1024082222103416874><:epic2:1024082224150220892><:epic3:1024082226767474739>",
          color: "#B20BF5",
        };
      } else if (metadata.rarity === "legendary") {
        rarity = {
          value: "legendary",
          image:
            "<:legendary1:1024082228839448647><:legendary2:1024082231267963030><:legendary3:1024082233625170062>",
          color: "#FF9900",
        };
      } else if (metadata.rarity === "mythic") {
        rarity = {
          value: "mythic",
          image:
            "<:mythic1:1092518775519187005><:mythic2:1092518777524080741><:mythic3:1092518779759624252>",
          color: "#ffcc00",
        };
      } else if (metadata.rarity === "exalted") {
        rarity = {
          value: "exalted",
          image:
            "<:exalted1:1092518768686669956><:exalted2:1092518771320701078><:exalted3:1092518773069709383>",
          color: "#ee4d58",
        };
      } else if (metadata.rarity === "exotic") {
        rarity = {
          value: "unique",
          image:
            "<:exotic1:1093365847168393277><:exotic2:1093365863303893023><:exotic3:1093365874028707953>",
          color: "#8657eb",
        };
      } else if (metadata.rarity === "transcendent") {
        rarity = {
          value: "transcendent",
          image: "<:transcendent1:1093365935785660436><:transcendent2:1093365946137202720><:transcendent3:1093365957264687114>",
          color: "#882f2f",
        };
      } else if (metadata.rarity === "unique") {
        rarity = {
          value: "unique",
          image:
            "<:unique1:1093366007428562984><:unique2:1093366025405350009><:unique3:1093366036306350140>",
          color: "#7d497f",
        };
      } else {
        rarity = {
          value: "Unregistred",
          image: "❌",
          color: "#f1f1f1",
        };
      }

      const embed = new EmbedBuilder()
        .setTitle(`# ${issuedId}  ${metadata.name} !`)
        .setURL(`https://openloot.com/checkout?orderIds=${orderId}`)
        .setDescription(`${metadata.description}`)
        .addFields(
          { name: "\u200B", value: "\u200B", inline: false },
          {
            name: `Baisse de `,
            value: `\`\`\`diff\n ${percentDecrease.toFixed(2)}%  \n\`\`\``,
            inline: true,
          },
          {
            name: ` Nouveau prix `,
            value: `\`\`\`diff\n ${minPrice} $ \n\`\`\``,
            inline: true,
          },
          {
            name: ` Ancien prix`,
            value: `\`\`\`diff\n ${existingItem.minPrice} $ \n\`\`\``,
            inline: true,
          }
        )
        .addFields(
          { name: "Rareté", value: rarity.image, inline: true },
          { name: "Max Supply", value: `\`${metadata.maxIssuance.toString()}\``, inline: true },
          { name: "Code Créateur", value: `\`RTNS \``, inline: true }
        )
        .setThumbnail(metadata.imageUrl)
        .setColor(`${rarity.color}`)
        .setTimestamp();

      const button = new ButtonBuilder()
        .setLabel("Acheter sur OpenLoot")
        .setStyle("Link")
        .setURL(
          `https://openloot.com/items/${metadata.collection}/${metadata.optionName}`
        );

      const row = new ActionRowBuilder().addComponents(button);

      const channel = client.channels.cache.get("1091352558083252234");
      channel.send({ embeds: [embed], components: [row] });
      console.log("Embed envoyé sur Discord !");
    } else if (difPrice > -5 && difPrice < 0) {
      console.log(`${metadata.name} a baissé de seulement ${difPrice.toFixed(2)}%`);
    } else if (difPrice > 0) {
      console.log(`${metadata.name} a augmenté de ${difPrice.toFixed(2)}%`);
    }
  });
  console.log("Calcul terminé");
}
