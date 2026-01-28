import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import type { FC, ClipboardEvent } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = import.meta.env.VITE_API_URL;

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const Chat: FC = () => {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_URL}/ai/chat`,
    }),
  });
  const [input, setInput] = useState("");
  const [images, setImages] = useState<ImageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  console.log("<<<<<<<<<<< messages >>>>>>>>>>>>>", messages);

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter((item) =>
      item.type.startsWith("image/")
    );

    if (imageItems.length > 0) {
      e.preventDefault();
      const newImages: ImageFile[] = imageItems
        .map((item) => {
          const file = item.getAsFile();
          if (!file) return null;
          return {
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
          };
        })
        .filter((img): img is ImageFile => img !== null);

      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && images.length === 0) return;

    // Send message with text and files
    if (images.length > 0) {
      const fileUIParts = await Promise.all(
        images.map(async (img) => {
          const base64 = await fileToBase64(img.file);
          return {
            type: "file" as const,
            mediaType: img.file.type,
            url: base64,
            name: img.file.name,
          };
        })
      );

      sendMessage({
        text: input.trim() || "Here are some images",
        files: fileUIParts,
      });
    } else {
      sendMessage({ text: input });
    }

    setInput("");

    // Clear images and revoke URLs
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  return (
    <>
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id}>
            <p>{message.role === "user" ? "User: " : "AI: "}</p>
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <ReactMarkdown key={index}>{part.text}</ReactMarkdown>
              ) : null
            )}
          </div>
        ))}

        {(status === "submitted" || status === "streaming") && (
          <div>
            {status === "submitted" && <div>Loading...</div>}
            <button type="button" onClick={() => stop()}>
              Stop
            </button>
          </div>
        )}
      </div>
      <div>
        {error && (
          <>
            <div>An error occurred: {error.message}</div>
            <button type="button" onClick={() => regenerate()}>
              Regenerate
            </button>
          </>
        )}
      </div>
      <form className="form" onSubmit={handleSubmit}>
        {images.length > 0 && (
          <div className="image-previews">
            {images.map((img) => (
              <div key={img.id} className="image-preview">
                <img src={img.preview} alt="Preview" />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="remove-image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          disabled={status !== "ready"}
          placeholder="Say something... (You can paste images with Ctrl+V)"
          rows={10}
        />
        <div className="button-group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={status !== "ready"}
            className="upload-button"
          >
            Upload Images
          </button>
          <button
            type="submit"
            disabled={status !== "ready"}
            className="submit-button"
          >
            Submit
          </button>
        </div>
      </form>
    </>
  );
};

export default Chat;
