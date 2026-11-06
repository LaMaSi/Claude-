// Furniture definitions are pure data + a model builder name. The simulation
// (later milestones) only reads `needs`/`footprint`; the renderer only reads `model`.
import * as M from '../render/models.js';

export const FURNITURE = {
  bed:        { name: 'Bed',            footprint: [1.8, 2.2], needs: { sleep: 1 },            model: M.bed },
  fridge:     { name: 'Fridge',         footprint: [0.8, 0.75], needs: { hunger: 0.6 },        model: M.fridge },
  counter:    { name: 'Kitchen counter', footprint: [1.6, 0.7], needs: { hunger: 0.4 },        model: M.kitchenCounter },
  shower:     { name: 'Shower',         footprint: [1.1, 1.1], needs: { hygiene: 1 },          model: M.shower },
  toilet:     { name: 'Toilet',         footprint: [0.4, 0.6], needs: { hygiene: 0.3 },        model: M.toilet },
  sofa:       { name: 'Sofa',           footprint: [2.0, 0.9], needs: { social: 0.5, fun: 0.4 }, model: M.sofa },
  tv:         { name: 'TV stand',       footprint: [1.5, 0.45], needs: { fun: 1 },             model: M.tvStand },
  table:      { name: 'Dining table',   footprint: [1.5, 0.9], needs: { hunger: 0.5, social: 0.5 }, model: M.table },
  chair:      { name: 'Chair',          footprint: [0.45, 0.45], needs: {},                   model: M.chair },
  plant:      { name: 'Plant',          footprint: [0.5, 0.5], needs: {},                     model: M.plant },
  lamp:       { name: 'Floor lamp',     footprint: [0.35, 0.35], needs: {},                   model: M.floorLamp },
  bookshelf:  { name: 'Bookshelf',      footprint: [1.1, 0.35], needs: { fun: 0.5 },           model: M.bookshelf },
  rug:        { name: 'Round rug',      footprint: [2.4, 2.4], needs: {}, floorDecor: true,    model: M.rug },
  painting:   { name: 'Painting',       footprint: [0.9, 0.05], needs: {}, wallMounted: true,  model: M.painting },
};
