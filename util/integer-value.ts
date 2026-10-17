/** Normalize unsigned integer text within JavaScript's safe integer range. */
export function integerValue(
  value: string | null,
  minimum: number,
): string | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum
    ? String(number)
    : undefined;
}
