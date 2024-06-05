const {
  ArtEngine,
  inputs,
  generators,
  renderers,
  exporters,
} = require("@hashlips-lab/art-engine");
import { ImagesExporter } from "./custom/exporters/image-exporter";
import { ItemAttributesRendererTier } from "./custom/renderers/tier-attributes-renderer";
import { ImageLayersRendererTier } from "./custom/renderers/tier-image-renderer";

const BASE_PATH = __dirname;

const ae = new ArtEngine({
  cachePath: `${BASE_PATH}/cache`,
  outputPath: `${BASE_PATH}/output`,
  useCache: false,

  inputs: {
    wolves: new inputs.ImageLayersInput({
      assetsBasePath: `${BASE_PATH}/nft-data2`,
    }),
  },

  generators: [
    new generators.ImageLayersAttributesGenerator({
      dataSet: "wolves",
      startIndex: 1,
      endIndex: 40,
    }),
  ],

  renderers: [
    // new renderers.ItemAttributesRenderer({
    //   name: (itemUid: string) => `Ape ${itemUid}`,
    //   description: (attributes: any) => {
    //     return `This is a token with "${attributes["Background"][0]}" as Background`;
    //   },
    // }),
    // new renderers.ImageLayersRenderer({
    //   width: 2048,
    //   height: 2048,
    // }),
    new ItemAttributesRendererTier({
      name: (itemUid: string) => `Ape ${itemUid}`,
      description: (attributes: any) => {
        return `This is a token with "${attributes["Skin-fur"][0]}" as Body`;
      },
      // excludeParts: ["Aura-element"],
    }),
    new ImageLayersRendererTier({
      width: 2048,
      height: 2048,
      // excludeParts: ["Aura-element"],
    }),
  ],

  exporters: [
    new ImagesExporter(),
    new exporters.Erc721MetadataExporter({
      imageUriPrefix: "ipfs://__CID__/",
    }),

    // new ImagesExporter(),

    // new exporters.SolMetadataExporter({
    //   imageUriPrefix: "ipfs://__CID__/",
    //   symbol: "APES",
    //   sellerFeeBasisPoints: 200,
    //   collectionName: "The Apes",
    //   creators: [
    //     {
    //       address: "__SOLANA_WALLET_ADDRESS_HERE__",
    //       share: 100,
    //     },
    //   ],
    // }),
  ],
});

(async () => {
  await ae.run();
  await ae.printPerformance();
})();
