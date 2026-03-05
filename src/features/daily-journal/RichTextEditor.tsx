import React, { useEffect, useState } from 'react';
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
  const [fontSizeInput, setFontSizeInput] = useState('14');
  const [colorInput, setColorInput] = useState(DEFAULT_COLOR);

  const editor = useEditor({
    extensions: [
      StarterKit,
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

  const applyFontSize = () => {
    if (!editor) return;
    const num = parseInt(fontSizeInput, 10);
    if (Number.isNaN(num) || num < 1) return;
    const px = `${Math.min(999, num)}px`;
    editor.chain().focus().setMark('textStyle', { fontSize: px }).run();
  };

  const applyColor = (color: string) => {
    if (!editor) return;
    setColorInput(color);
    editor.chain().focus().setColor(color).run();
  };

  const toolbar = !readOnly && editor && (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {/* 폰트 크기 (px) */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={999}
          value={fontSizeInput}
          onChange={(e) => setFontSizeInput(e.target.value)}
          onBlur={applyFontSize}
          onKeyDown={(e) => e.key === 'Enter' && applyFontSize()}
          className="w-14 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-sub"
        />
        <span className="text-xs text-gray-500">px</span>
      </div>
      {/* 텍스트 색상 */}
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={colorInput}
          onChange={(e) => applyColor(e.target.value)}
          className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"
          title="텍스트 색상"
        />
      </div>
      {/* B / I / U */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="굵게"
      >
        <Bold size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="기울임"
      >
        <Italic size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="밑줄"
      >
        <UnderlineIcon size={18} />
      </button>
      {/* 문단 정렬 */}
      <span className="w-px h-6 bg-gray-300 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="왼쪽 정렬"
      >
        <AlignLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="가운데 정렬"
      >
        <AlignCenter size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="오른쪽 정렬"
      >
        <AlignRight size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-brand-sub/20 text-brand-main' : 'text-gray-600'}`}
        title="양쪽 정렬"
      >
        <AlignJustify size={18} />
      </button>
    </div>
  );

  return (
    <div className={`border border-gray-200 rounded-lg bg-white overflow-hidden ${className}`}>
      {toolbar}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
