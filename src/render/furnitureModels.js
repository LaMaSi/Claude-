import * as M from './models.js';
export const MODELS = {
  bed: M.bed, fridge: M.fridge, counter: M.kitchenCounter, shower: M.shower, toilet: M.toilet, sofa: M.sofa,
  tv: M.tvStand, table: M.table, chair: M.chair, plant: M.plant, lamp: M.floorLamp, bookshelf: M.bookshelf,
  rug: M.rug, painting: M.painting,
};
export const SCENERY = { tree: M.tree, pine: M.pine, bush: M.bush, flowers: () => M.flowers() };
