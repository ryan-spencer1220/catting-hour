const NAMES = [
  "Biscuit", "Mochi", "Noodle", "Waffles", "Pudding", "Pickles", "Dumpling",
  "Pretzel", "Mango", "Toffee", "Cheddar", "Nacho", "Marmalade", "Gremlin",
  "Patches", "Mittens", "Shadow", "Whiskers", "Smudge", "Pebble", "Pumpkin",
  "Boba", "Pepper", "Ginger", "Cinnamon", "Caramel", "Velvet", "Zigzag",
  "Rascal", "Stormy", "Nimble", "Cosmo", "Bloop", "Snorkel", "Crumbs",
  "Turbine", "Wobble", "Freckle", "Doodle", "Meatball", "Sprocket", "Fudge",
];

export function generateCatName(): string {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}
