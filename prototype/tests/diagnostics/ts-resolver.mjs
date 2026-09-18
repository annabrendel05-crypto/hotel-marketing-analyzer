import { registerHooks } from "node:module";

// Node strips TypeScript types, but the app's bundler resolves extensionless imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.endsWith(".ts")
      && specifier.startsWith(".")
      && !/\.[a-z]+$/i.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});
