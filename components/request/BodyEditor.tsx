import { useState } from "react";
import type { BodyType, FormDataField } from "@/types";

interface BodyEditorProps {
  bodyType: BodyType;
  body: {
    raw?: string;
    json?: string;
    formData?: FormDataField[];
    urlEncoded?: { name: string; value: string }[];
    binary?: string;
  };
  onBodyTypeChange: (type: BodyType) => void;
  onBodyChange: (body: BodyEditorProps["body"]) => void;
}

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "json", label: "JSON" },
  { value: "form-data", label: "Form Data" },
  { value: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  { value: "raw", label: "Raw" },
  { value: "binary", label: "Binary" },
];

export function BodyEditor({ bodyType, body, onBodyTypeChange, onBodyChange }: BodyEditorProps) {
  const [rawType, setRawType] = useState<"text" | "xml" | "html">("text");

  const handleJsonChange = (value: string) => {
    onBodyChange({ ...body, json: value });
  };

  const handleRawChange = (value: string) => {
    onBodyChange({ ...body, raw: value });
  };

  const addFormField = () => {
    const formData = body.formData || [];
    onBodyChange({
      ...body,
      formData: [...formData, { name: "", value: "", type: "text", enabled: true }],
    });
  };

  const updateFormField = (index: number, field: keyof FormDataField, value: string | boolean) => {
    const formData = body.formData || [];
    const newFormData = [...formData];
    newFormData[index] = { ...newFormData[index], [field]: value };
    onBodyChange({ ...body, formData: newFormData });
  };

  const deleteFormField = (index: number) => {
    const formData = body.formData || [];
    onBodyChange({ ...body, formData: formData.filter((_, i) => i !== index) });
  };

  const addUrlEncodedField = () => {
    const urlEncoded = body.urlEncoded || [];
    onBodyChange({
      ...body,
      urlEncoded: [...urlEncoded, { name: "", value: "" }],
    });
  };

  const updateUrlEncodedField = (index: number, field: string, value: string) => {
    const urlEncoded = body.urlEncoded || [];
    const newUrlEncoded = [...urlEncoded];
    newUrlEncoded[index] = { ...newUrlEncoded[index], [field]: value };
    onBodyChange({ ...body, urlEncoded: newUrlEncoded });
  };

  const deleteUrlEncodedField = (index: number) => {
    const urlEncoded = body.urlEncoded || [];
    onBodyChange({ ...body, urlEncoded: urlEncoded.filter((_, i) => i !== index) });
  };

  const formatJson = () => {
    if (body.json) {
      try {
        const parsed = JSON.parse(body.json);
        onBodyChange({ ...body, json: JSON.stringify(parsed, null, 2) });
      } catch (e) {
        // Invalid JSON, don't format
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Body Type Selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {BODY_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onBodyTypeChange(type.value)}
            className={`px-3 py-1 text-xs rounded whitespace-nowrap ${
              bodyType === type.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-auto">
        {bodyType === "none" && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            This request does not have a body
          </div>
        )}

        {bodyType === "json" && (
          <div className="relative h-full">
            <button
              onClick={formatJson}
              className="absolute right-2 top-2 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded z-10"
            >
              Format
            </button>
            <textarea
              value={body.json || ""}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder='{\n  "key": "value"\n}'
              className="w-full h-full p-3 text-xs font-mono bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
            />
          </div>
        )}

        {bodyType === "raw" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 px-3 py-1 border-b border-border">
              {(["text", "xml", "html"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setRawType(type)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    rawType === type ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
            <textarea
              value={body.raw || ""}
              onChange={(e) => handleRawChange(e.target.value)}
              placeholder="Raw text content"
              className="flex-1 w-full p-3 text-xs font-mono bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
            />
          </div>
        )}

        {bodyType === "form-data" && (
          <div className="p-2">
            {(body.formData || []).map((field, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={field.enabled !== false}
                  onChange={(e) => updateFormField(index, "enabled", e.target.checked)}
                  className="w-3 h-3"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateFormField(index, "type", e.target.value)}
                  className="px-2 py-1.5 text-xs bg-input border border-border rounded"
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateFormField(index, "name", e.target.value)}
                  placeholder="Key"
                  className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded"
                />
                {field.type === "text" ? (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateFormField(index, "value", e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded"
                  />
                ) : (
                  <input
                    type="file"
                    className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded"
                  />
                )}
                <button
                  onClick={() => deleteFormField(index)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={addFormField} className="w-full py-1.5 text-xs text-primary hover:bg-primary/10 rounded">
              + Add Field
            </button>
          </div>
        )}

        {bodyType === "x-www-form-urlencoded" && (
          <div className="p-2">
            {(body.urlEncoded || []).map((field, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateUrlEncodedField(index, "name", e.target.value)}
                  placeholder="Key"
                  className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateUrlEncodedField(index, "value", e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded"
                />
                <button
                  onClick={() => deleteUrlEncodedField(index)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={addUrlEncodedField} className="w-full py-1.5 text-xs text-primary hover:bg-primary/10 rounded">
              + Add Field
            </button>
          </div>
        )}

        {bodyType === "binary" && (
          <div className="p-4 text-center">
            <input type="file" className="w-full text-xs text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
