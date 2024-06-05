import RendererInterface, {
  ItemsRenders,
  RendererInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/renderers/renderer.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
import AttributesRendererInterface, {
  ITEM_ATTRIBUTES_RENDERER_INTERFACE_V1,
} from "@hashlips-lab/art-engine/dist/common/renderers/item-attributes-renderer.interface";
import ItemAttributesGeneratorInterface, {
  ITEM_ATTRIBUTES_GENERATOR_INTERFACE_V1,
} from "@hashlips-lab/art-engine/dist/common/generators/item-attributes-generator.interface";

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

export class ItemAttributesRendererTier
  implements RendererInterface<AttributesRendererInterface>
{
  private attributesGetter!: ItemsDataManager["getAttributes"];
  private name!: (itemUid: string) => string;
  private description!: (
    attributes: AttributesRendererInterface["attributes"]
  ) => string;
  private excludeParts: string[]; // New parameter for excluding parts

  constructor(
    constructorProps: {
      name?: (itemUid: string) => string;
      description?: (
        attributes: AttributesRendererInterface["attributes"]
      ) => string;
      excludeParts?: string[]; // New parameter for excluding parts
    } = {}
  ) {
    this.name = constructorProps.name ? constructorProps.name : () => "";
    this.description = constructorProps.description
      ? constructorProps.description
      : () => "";
    this.excludeParts = constructorProps.excludeParts ?? [];
  }

  public async init(props: RendererInitPropsInterface) {
    this.attributesGetter = props.attributesGetter;
  }

  public async render(): Promise<ItemsRenders<AttributesRendererInterface>> {
    const renders: ItemsRenders<AttributesRendererInterface> = {};

    for (const [itemUid, attributes] of Object.entries(
      this.attributesGetter() as Record<string, Attribute[]>
    )) {
      const supportedAttributes: ItemAttributesGeneratorInterface[] = attributes
        .filter(
          (attribute: Attribute) =>
            ITEM_ATTRIBUTES_GENERATOR_INTERFACE_V1 === attribute.kind
        )
        .map((attribute) => attribute.data);

      if (supportedAttributes.length < 1) {
        throw new Error(
          `Couldn't find any supported set of attributes for the current item: ${itemUid}`
        );
      }

      renders[itemUid] = [
        supportedAttributes.reduce(
          (mergedAttributes, newAttributes) => {
            mergedAttributes.data.dna.push(newAttributes.dna);

            mergedAttributes.data.name = this.name(itemUid);

            for (const key in newAttributes.attributes) {
              if (this.excludeParts.includes(key)) {
                continue; // Skip excluded parts
              }
              if (mergedAttributes.data.attributes[key] === undefined) {
                mergedAttributes.data.attributes[key] = [];
              }

              mergedAttributes.data.attributes[key].push(
                newAttributes.attributes[key]
              );
            }
            mergedAttributes.data.description = this.description(
              mergedAttributes.data.attributes
            );
            return mergedAttributes;
          },
          {
            kind: ITEM_ATTRIBUTES_RENDERER_INTERFACE_V1,
            data: {
              dna: [],
              name: "",
              description: "",
              attributes: {},
            } as AttributesRendererInterface,
          }
        ),
      ];
    }

    return renders;
  }
}
