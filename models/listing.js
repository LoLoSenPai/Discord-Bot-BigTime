const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  // _id: mongoose.Schema.Types.ObjectId,
  id: { type: String, required: false },
  minPrice: { type: Number, required: true },
  name: { type: String, required: false },
  idBis: { type: String, required: false },
  archetypeId: { type: String, required: false },
  issuedId: { type: Number, required: false },
  orderId: { type: String, required: false },
  onSale: { type: Boolean, required: false },
});

const Item = mongoose.model("Item", itemSchema, "openloot");

module.exports = Item;
