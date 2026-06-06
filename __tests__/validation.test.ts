// Username validation — mirrors the rule enforced in register.tsx and my-cats.tsx
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{2,30}$/;

function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

describe('username validation', () => {
  it('accepts alphanumeric usernames', () => {
    expect(isValidUsername('ryan')).toBe(true);
    expect(isValidUsername('CatLover99')).toBe(true);
  });

  it('accepts underscores and hyphens', () => {
    expect(isValidUsername('cat_lover')).toBe(true);
    expect(isValidUsername('cat-lover')).toBe(true);
  });

  it('rejects usernames shorter than 2 characters', () => {
    expect(isValidUsername('a')).toBe(false);
    expect(isValidUsername('')).toBe(false);
  });

  it('rejects usernames longer than 30 characters', () => {
    expect(isValidUsername('a'.repeat(31))).toBe(false);
    expect(isValidUsername('a'.repeat(30))).toBe(true);
  });

  it('rejects spaces', () => {
    expect(isValidUsername('cat lover')).toBe(false);
    expect(isValidUsername(' cattinghour')).toBe(false);
  });

  it('rejects special characters', () => {
    expect(isValidUsername('cat@lover')).toBe(false);
    expect(isValidUsername('cat.lover')).toBe(false);
    expect(isValidUsername('<script>')).toBe(false);
  });
});
