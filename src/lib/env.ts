// Vite injects import.meta.env; under tsx (smoke, tests) it is undefined — hence the optional chain.
export const IS_DEV: boolean = Boolean(import.meta.env?.DEV);
