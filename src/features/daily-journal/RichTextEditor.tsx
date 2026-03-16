import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { FontSize } from './tiptap-font-size';

const DEFAULT_COLOR = '#000000';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
  className = '',
}: RichTextEditorProps) {
  const [colorInput, setColorInput] = useState(DEFAULT_COLOR);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const FONT_SIZES = [12, 14, 16, 18, 24, 32];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // "1. ", "- " 등 입력 시 목록으로 변환되어 문자가 사라지는 현상 방지
        bulletList: false,
        orderedList: false,
      }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || readOnly) return;
    const handler = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) savedSelectionRef.current = { from, to };
    };
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('selectionUpdate', handler);
    };
  }, [editor, readOnly]);

  const captureSelectionOnInteraction = (e: React.MouseEvent) => {
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) savedSelectionRef.current = { from, to };
    }
  };

  const applyFontSize = (px: number) => {
    if (!editor) return;
    const fontSize = `${Math.min(999, Math.max(1, px))}px`;
    editor.chain().focus().setMark('textStyle', { fontSize }).run();
  };

  const applyColor = (color: string) => {
    if (!editor) return;
    setColorInput(color);
    const saved = savedSelectionRef.current;
    savedSelectionRef.current = null;
    const chain = editor.chain().focus();
    const withSelection = saved ? chain.setTextSelection({ from: saved.from, to: saved.to }) : chain;
    withSelection.setColor(color).run();
  };

  const toolbar = !readOnly && editor && (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {/* 폰트 크기 (px) - 버튼 클릭 시 에디터 포커스 유지를 위해 preventDefault */}
      <div className="flex items-center gap-1 flex-wrap">
        {FONT_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFontSize(size);
            }}
            className="min-w-[36px] min-h-[36px] md:min-w-[32px] md:min-h-[32px] px-2 py-1.5 text-xs font-medium rounded hover:bg-gray-200 text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-sub"
            title={`${size}px`}
          >
            {size}
          </button>
        ))}
      </div>
      {/* 텍스트 색상 */}
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={colorInput}
          onMouseDown={captureSelectionOnInteraction}
          onChange={(e) => applyColor(e.target.value)}
          className="w-10 h-10 md:w-8 md:h-8 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-0.5 border border-gray-300 rounded cursor-pointer"
          title="텍스트 색상"
        />
      </div>
      {/* B / I / U - preventDefault로 에디터 포커스 유지 */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="굵게"
      >
        <Bold size={18} />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="기울임"
      >
        <Italic size={18} />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="밑줄"
      >
        <UnderlineIcon size={18} />
      </button>
      {/* 문단 정렬 - preventDefault로 에디터 포커스 유지 */}
      <span className="w-px h-6 bg-gray-300 mx-0.5" aria-hidden />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="왼쪽 정렬"
      >
        <AlignLeft size={18} />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="가운데 정렬"
      >
        <AlignCenter size={18} />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="오른쪽 정렬"
      >
        <AlignRight size={18} />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="양쪽 정렬"
      >
        <AlignJustify size={18} />
      </button>
    </div>
  );

  return (
    <div className={`border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col ${className}`}>
      {toolbar}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none"
        />
      </div>
    </div>
  );
}
