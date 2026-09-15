import { describe, expect, it } from 'vitest';
import {
  isPointerClick,
  isWorkshopPath,
  workshopNavLink,
  type WorkshopNavLink,
} from '../src/lib/workshop-unlock';

const ACTIVE: WorkshopNavLink = {
  href: '/workshop/',
  label: 'Workshop',
  className: 'site-nav__link is-active',
  ariaCurrent: 'page',
};

const INACTIVE: WorkshopNavLink = {
  href: '/workshop/',
  label: 'Workshop',
  className: 'site-nav__link',
  ariaCurrent: null,
};

describe('isWorkshopPath', () => {
  // Row 52 / Boundary: /workshop without slash, descendants, index.html
  it.each<[string]>([['/workshop/'], ['/workshop'], ['/workshop/clock/'], ['/workshop/index.html']])(
    'matches %j',
    (pathname) => {
      expect(isWorkshopPath(pathname)).toBe(true);
    },
  );

  // Row 52 / Boundary: look-alikes, case, relative, empty
  it.each<[unknown]>([
    ['/'],
    ['/reading/'],
    ['/workshop-annex/'],
    ['/workshops/'],
    ['/Workshop/'],
    ['workshop/'],
    [''],
    ['/blog/workshop/'],
    [null],
    [undefined],
    [42],
  ])('does not match %j', (pathname) => {
    expect(isWorkshopPath(pathname)).toBe(false);
  });

  // Boundary "pathname with a site base prefix": undefined, not tested.
});

describe('workshopNavLink', () => {
  // Row 52
  it('is active with aria-current page on /workshop/', () => {
    expect(workshopNavLink('/workshop/')).toEqual(ACTIVE);
  });

  // Row 52
  it('is inactive with null aria-current on /reading/', () => {
    expect(workshopNavLink('/reading/')).toEqual(INACTIVE);
  });

  // Row 52
  it('is active on /workshop without a trailing slash', () => {
    expect(workshopNavLink('/workshop')).toEqual(ACTIVE);
  });

  // Row 52
  it('is inactive for an undefined pathname', () => {
    expect(workshopNavLink(undefined)).toEqual(INACTIVE);
  });
});

describe('isPointerClick', () => {
  // Row 53 / Boundary: triple-click detail 3
  it.each<[number]>([[1], [2], [3]])('counts detail %s as a pointer click', (detail) => {
    expect(isPointerClick(detail)).toBe(true);
  });

  // Row 53 / Boundary: detail 0, negative, fractional, non-number
  it.each<[unknown]>([[0], [-1], [1.5], [NaN], [Infinity], ['1'], [null], [undefined], [true]])(
    'does not count detail %j as a pointer click',
    (detail) => {
      expect(isPointerClick(detail)).toBe(false);
    },
  );
});
