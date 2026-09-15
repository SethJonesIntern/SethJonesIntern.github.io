import type { Book } from './reading';

// The shelf, in render order: shelf groups follow SHELVES, books follow this array.
// To add a book, append one entry here. Nothing else in the repo needs editing.
export const READING_LIST: readonly Book[] = [
  {
    id: 'mythical-man-month',
    title: 'The Mythical Man-Month',
    author: 'Frederick P. Brooks Jr.',
    shelf: 'technical',
    spine: 'ink',
  },
  {
    id: 'machine-learning-in-production',
    title: 'Machine Learning in Production: From Models to Products',
    author: 'Christian Kästner',
    shelf: 'technical',
    spine: 'teal',
  },
  {
    id: 'operating-systems-three-easy-pieces',
    title: 'Operating Systems: Three Easy Pieces',
    author: 'Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau',
    shelf: 'technical',
    spine: 'sand',
  },
  {
    id: 'harry-potter',
    title: 'Harry Potter',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'clay',
    volumes: [1, 7],
  },
  {
    id: 'fire-and-blood',
    title: 'Fire & Blood',
    author: 'George R. R. Martin',
    shelf: 'fiction',
    spine: 'ink',
  },
  {
    id: 'a-song-of-ice-and-fire',
    title: 'A Song of Ice and Fire',
    author: 'George R. R. Martin',
    shelf: 'fiction',
    spine: 'teal',
    volumes: [1, 2],
  },
  {
    id: 'percy-jackson-and-the-olympians',
    title: 'Percy Jackson and the Olympians',
    author: 'Rick Riordan',
    shelf: 'fiction',
    spine: 'sand',
    volumes: [1, 5],
  },
];
