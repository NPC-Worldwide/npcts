import React, { useMemo, useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { search, searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { 
  defaultKeymap, 
  history, 
  historyKeymap 
} from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const appHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#c678dd" },
  { 
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], 
    color: "#e06c75" 
  },
  { tag: [t.function(t.variableName), t.labelName], color: "#61afef" },
  { 
    tag: [t.color, t.constant(t.name), t.standard(t.name)], 
    color: "#d19a66" 
  },
  { 
    tag: [t.definition(t.name), t.function(t.definition(t.name))], 
    color: "#e5c07b" 
  },
  { 
    tag: [
      t.typeName, 
      t.className, 
      t.number, 
      t.changed, 
      t.annotation,
      t.modifier, 
      t.self, 
      t.namespace
    ], 
    color: "#d19a66" 
  },
  { tag: [t.operator, t.operatorKeyword], color: "#56b6c2" },
  { tag: [t.meta, t.comment], color: "#7f848e", fontStyle: "italic" },
  { tag: [t.string, t.inserted], color: "#98c379" },
  { tag: t.invalid, color: "#ff5555" },
]);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath?: string;
  onSave?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onSelect?: (selection: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  filePath,
  onSave,
  onContextMenu,
  onSelect,
}) => {
  const editorRef = useRef<any>(null);

  const languageExtension = useMemo(() => {
    const ext = filePath?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return javascript({ jsx: true });
      case "ts":
      case "tsx":
        return javascript({ jsx: true, typescript: true });
      case "py":
        return python();
      default:
        return javascript();
    }
  }, [filePath]);

  const extensions = useMemo(
    () => [
      languageExtension,
      history(),
      search({ top: true }),
      syntaxHighlighting(appHighlightStyle),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        {
          key: "Mod-s",
          run: () => {
            if (onSave) {
              onSave();
              return true;
            }
            return false;
          },
        },
      ]),
      EditorView.theme({
        "&": {
          height: "100%",
          backgroundColor: "#1e1e1e",
          fontSize: "14px",
        },
        ".cm-content": {
          fontFamily: "monospace",
          caretColor: "#528bff",
        },
        ".cm-gutters": {
          backgroundColor: "#1e1e1e",
          color: "#858585",
          border: "none",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#2a2a2a",
        },
        ".cm-activeLine": {
          backgroundColor: "#2a2a2a",
        },
        ".cm-selectionBackground": {
          backgroundColor: "#264f78 !important",
        },
        ".cm-cursor": {
          borderLeftColor: "#528bff",
        },
      }),
    ],
    [languageExtension, onSave]
  );

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div
      className="h-full w-full overflow-auto"
      onContextMenu={onContextMenu}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        extensions={extensions}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
};
