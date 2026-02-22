export const qaCriteria = [
  {
    id: 'EQ',
    name: 'Equipment/Element Labels',
    description: 'All major equipment, rooms, and elements are labeled'
  },
  {
    id: 'DIM',
    name: 'Dimension Strings',
    description: 'Dimension lines are present and complete'
  },
  {
    id: 'TB',
    name: 'Title Block & Scale',
    description: 'Title block present with sheet number, scale indicated'
  },
  {
    id: 'FS',
    name: 'Fire Safety Markings',
    description: 'Fire exits, fire-rated assemblies, extinguishers marked'
  },
  {
    id: 'SYM',
    name: 'Symbol Consistency',
    description: 'Symbols match legend, no undefined symbols'
  },
  {
    id: 'ANN',
    name: 'Annotations & Notes',
    description: 'General notes, callouts, and references present'
  },
  {
    id: 'CRD',
    name: 'Coordination Markers',
    description: 'Grid lines, column markers, reference bubbles present'
  },
  {
    id: 'CLR',
    name: 'Clearance & Accessibility',
    description: 'ADA clearances, door swings, egress paths shown'
  }
] as const;

export type QACriterionConfig = typeof qaCriteria[number];
