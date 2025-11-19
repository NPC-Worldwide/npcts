import React from "react";

export const Markdown: React.FC<{ content: string }> = ({ content }) => {
  return <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap">{content}</div>;
};
