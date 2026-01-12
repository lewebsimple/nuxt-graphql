import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  externals: [
    "cookie-es",
    "crossws",
    "fdir",
    "h3",
    "iron-webcrypto",
    "picomatch",
    "ufo",
  ],
  replace: {
    "process.env.PLAYGROUND_MODULE_BUILD": "undefined",
  },
});
