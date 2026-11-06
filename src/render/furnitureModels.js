import * as M from './models.js';
export const MODELS = {
  bed: M.bed, pantry: M.pantry, hearth: M.hearth, tub: M.tub, washstand: M.washstand, settle: M.settle,
  harp: M.harp, table: M.table, stool: M.stool, plant: M.plant, candlestand: M.candlestand,
  bookshelf: M.bookshelf, rug: M.rug, banner: M.banner, chest: M.chest, barrel: M.barrel,
};
export const SCENERY = {
  tree: M.tree, pine: M.pine, bush: M.bush, flowers: () => M.flowers(), well: M.well, haystack: M.haystack, veg: M.vegPatch, barrel: () => M.barrel(),
};
