import { describe, expect, it } from 'vitest';
import { correspond } from '../../src/core/router';

describe('correspond', () => {
  it('extrait les paramètres', () => {
    expect(correspond('/seance/:id', '/seance/abc%20d')).toEqual({ id: 'abc d' });
  });
  it('refuse un chemin différent', () => {
    expect(correspond('/seance/:id', '/exercice/1')).toBeNull();
    expect(correspond('/seance/:id', '/seance')).toBeNull();
  });
});
