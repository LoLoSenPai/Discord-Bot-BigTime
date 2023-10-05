
module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};

// if (interaction.isButton()) {
//   if (interaction.customId === "openloot") {

//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.goto(
//       `https://oryon-merch.com`
//     //   `https://openloot.com/checkout?orderIds=${id}`
//     );

//     // Remplir le champ de code créateur
//     await page.type("#creatorCode", "LOLO_SENPAI");

//     // Cliquer sur le bouton "Pay with Balance"
//     await page.waitForSelector(".chakra-button.css-1k2u2lg");
//     const buttonPay = await page.$(".chakra-button.css-1k2u2lg");
//     await buttonPay.click();

//     // Attendre que la page se charge
//     await page.waitForNavigation({ waitUntil: "networkidle0" });

//     setTimeout(async () => {
//       await browser.close();
//     }, 30000); // mettre une pause de 30 secondes avant de fermer la page
//   }
// }
