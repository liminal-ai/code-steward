import { readdir } from "node:fs/promises";
import path from "node:path";

import { LANGUAGE_BY_EXTENSION } from "../languages.js";

export const detectLanguages = async (repoPath: string): Promise<string[]> => {
  const languages = new Set<string>();
  await walkRepository(repoPath, languages);
  return [...languages].sort();
};

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const walkRepository = async (
  directoryPath: string,
  languages: Set<string>,
): Promise<void> => {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          return;
        }

        await walkRepository(path.join(directoryPath, entry.name), languages);
        return;
      }

      if (!entry.isFile()) {
        return;
      }

      const extension = path.extname(entry.name).toLowerCase();
      const language = LANGUAGE_BY_EXTENSION[extension];

      if (language) {
        languages.add(language);
      }
    }),
  );
};
