export const passwordRules = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => Array.from(value).length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (value: string) => /\p{Lu}/u.test(value),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (value: string) => /\p{Ll}/u.test(value),
  },
  { id: "number", label: "One number", test: (value: string) => /\p{N}/u.test(value) },
  { id: "symbol", label: "One symbol", test: (value: string) => /[^\p{L}\p{N}\s]/u.test(value) },
] as const;

export function isStrongPassword(value: string): boolean {
  return value.length <= 72 && passwordRules.every((rule) => rule.test(value));
}
