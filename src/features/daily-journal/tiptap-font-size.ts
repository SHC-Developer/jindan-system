import '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';

export type FontSizeOptions = {
  types: string[];
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string | null) => ReturnType;
      unsetFontSize: () => ReturnType;
    }
  }
}

declare module '@tiptap/extension-text-style' {
  interface TextStyleAttributes {
    fontSize?: string | null;
  }
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const style = element.getAttribute('style');
              if (style) {
                const match = style.match(/font-size:\s*([\d.]+px)/i);
                return match ? match[1] : null;
              }
              return null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: fontSize || null }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
