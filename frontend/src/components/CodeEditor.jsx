import Editor from "@monaco-editor/react";

export default function CodeEditor({ language, value, onChange }) {
  return (
    <div style={{ height: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(val) => onChange(val ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
        }}
      />
    </div>
  );
}
