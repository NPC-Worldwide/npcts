import React from "react";
import type { Attachment } from "../../../core/types";

export const AttachmentList: React.FC<{ attachments: Attachment[] }> = ({ attachments }) => {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
      {attachments.map((att) => (
        <a
          key={att.id}
          href={att.path}
          className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {att.name}
        </a>
      ))}
    </div>
  );
};
