import * as fs from "fs";
import * as path from "path";
import { ITEM_ATTRIBUTES_RENDERER_INTERFACE_V1 } from "@hashlips-lab/art-engine/dist/common/renderers/item-attributes-renderer.interface";
import { STATIC_LAYERED_IMAGES_RENDERER_INTERFACE_V1 } from "@hashlips-lab/art-engine/dist/common/renderers/static-layered-images-renderer.interface";

interface ConstructorProps {
  imagesFolder?: string;
}

interface InitProps {
  rendersGetter: () => Record<string, any[]>;
  outputPath: string;
}

export class ImagesExporter {
  private rendersGetter!: () => Record<string, any[]>;
  private outputPath!: string;
  private imagesFolder: string;
  private imagesPath!: string;

  constructor(constructorProps: ConstructorProps = {}) {
    this.imagesFolder = constructorProps.imagesFolder ?? "images";
  }

  public async init(props: InitProps) {
    this.rendersGetter = props.rendersGetter;
    this.outputPath = props.outputPath;
    this.imagesPath = path.join(this.outputPath, this.imagesFolder);
  }

  public async export() {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath);
    }
    if (!fs.existsSync(this.imagesPath)) {
      fs.mkdirSync(this.imagesPath);
    }

    for (const [itemUid, renders] of Object.entries(this.rendersGetter())) {
      // Log the renders to see what is being processed
      console.log(`Processing item ${itemUid} with renders:`, renders);

      let image = renders.find(
        (render) =>
          render.kind === STATIC_LAYERED_IMAGES_RENDERER_INTERFACE_V1 ||
          render.kind === "StaticLayeredImagesRendererInterface@v1" // Fallback check
      );

      if (!image) {
        throw new Error(`Could not find any supported image`);
      }

      let attributes = renders.find(
        (render) =>
          render.kind === ITEM_ATTRIBUTES_RENDERER_INTERFACE_V1 ||
          render.kind === "ItemAttributesRendererInterface@v1" // Fallback check
      );

      if (!attributes) {
        console.error(`Attributes not found for item ${itemUid}`, renders); // Logging error details
        throw new Error(`Could not find any supported attributes`);
      }

      fs.copyFileSync(
        image.data.path,
        path.join(this.imagesPath, `${itemUid}.png`)
      );
    }
  }
}
