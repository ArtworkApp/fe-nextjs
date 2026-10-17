/** Country and territory names provided by the runtime's English locale data. */
export const COUNTRY_NAMES = (() => {
  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const names = new Set<string>();

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const regionCode = String.fromCharCode(first, second);
      const name = displayNames.of(regionCode);
      if (name && name !== regionCode) names.add(name);
    }
  }

  return [...names].sort((first, second) => first.localeCompare(second));
})();
