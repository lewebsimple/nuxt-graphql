// build.config.ts
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    {
      builder: "copy",
      input: "src/templates",
      outDir: "dist/templates",
    },
  ],
});
