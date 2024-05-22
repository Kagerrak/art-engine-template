import RendererInterface, {
  ItemsRenders,
  RendererInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/renderers/renderer.interface";
import StaticLayeredImagesRendererInterface, {
  STATIC_LAYERED_IMAGES_RENDERER_INTERFACE_V1,
} from "@hashlips-lab/art-engine/dist/common/renderers/static-layered-images-renderer.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
import ImageLayersGeneratorInterface, {
  IMAGE_LAYERS_GENERATOR_INTERFACE_V1,
} from "@hashlips-lab/art-engine/dist/common/generators/image-layers-generator.interface";
import * as path from "path";
import * as fs from "fs";
import ImageProcessorInterface from "@hashlips-lab/art-engine/dist/common/processors/image-processor.interface";
import PerformanceTracker from "@hashlips-lab/art-engine/dist/utils/loggers/performance/performance.logger";
import { SharpImageProcessor } from "@hashlips-lab/art-engine/dist/utils/processors/sharp";
import { RENDERERS_TEMP_CACHE_DIR } from "@hashlips-lab/art-engine/dist/utils/managers/cache/cache.constants";

interface Attribute {
  kind: string;
  data: {
    dna: string;
    attributes: {
      [key: string]: string;
    };
    assets: Array<{
      path: string;
      xOffset: number;
      yOffset: number;
      zOffset: number;
    }>;
  };
}

export class ImageLayersRendererTier
  implements RendererInterface<StaticLayeredImagesRendererInterface>
{
  private attributesGetter!: ItemsDataManager["getAttributes"];
  private tempRenderDir!: string;
  private imageProcessor!: ImageProcessorInterface;
  private width!: number;
  private height!: number;
  private excludeParts: string[];

  constructor(constructorProps: {
    width: number;
    height: number;
    imageProcessor?: ImageProcessorInterface;
    excludeParts?: string[]; // New parameter for excluding parts
  }) {
    this.width = constructorProps.width;
    this.height = constructorProps.height;
    this.imageProcessor =
      constructorProps.imageProcessor ?? new SharpImageProcessor();
    this.excludeParts = constructorProps.excludeParts ?? [];
  }

  public async init(props: RendererInitPropsInterface) {
    this.attributesGetter = props.attributesGetter;
    this.tempRenderDir = path.join(props.cachePath, RENDERERS_TEMP_CACHE_DIR);
  }

  public async render(): Promise<
    ItemsRenders<StaticLayeredImagesRendererInterface>
  > {
    const renders: ItemsRenders<StaticLayeredImagesRendererInterface> = {};

    for (const [itemUid, attributes] of Object.entries(
      this.attributesGetter() as Record<string, Attribute[]>
    )) {
      const timerUid = PerformanceTracker.trackTask(
        "Image render",
        `Item ${itemUid}`
      );
      if (!fs.existsSync(this.tempRenderDir)) {
        fs.mkdirSync(this.tempRenderDir);
      }

      const supportedAssets: ImageLayersGeneratorInterface["assets"] =
        attributes
          .filter(
            (attribute: Attribute) =>
              IMAGE_LAYERS_GENERATOR_INTERFACE_V1 === attribute.kind
          )
          .reduce(
            (
              mergedAttributes: ImageLayersGeneratorInterface["assets"],
              newAttributes: Attribute
            ) => mergedAttributes.concat(newAttributes.data.assets),
            []
          );

      if (supportedAssets.length < 1) {
        throw new Error(
          `Couldn't find any supported set of attributes for the current item: ${itemUid}`
        );
      }

      // Filter out the assets that should be excluded
      let assets = supportedAssets
        .filter(
          (asset) =>
            !this.excludeParts.includes(
              asset.path.split("/").pop()?.split("__")[0] || ""
            )
        )
        .sort((a, b) => a.zOffset - b.zOffset);

      const outputPath = path.join(this.tempRenderDir, `${itemUid}.png`);

      await this.imageProcessor.createImageWithLayers({
        width: this.width,
        height: this.height,
        outputPath: outputPath,
        assets: assets,
      });

      const outputStats = fs.statSync(outputPath);

      renders[itemUid] = [
        {
          kind: STATIC_LAYERED_IMAGES_RENDERER_INTERFACE_V1,
          data: {
            path: outputPath,
          },
        },
      ];

      PerformanceTracker.endTask(timerUid);
    }

    return renders;
  }
}
