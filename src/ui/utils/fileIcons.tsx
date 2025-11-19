import React from 'react';
import { Code2, FileText, FileJson, BarChart3, File } from 'lucide-react';

export const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const iconProps = { size: 16, className: "flex-shrink-0" };
    
    switch(ext) {
        case 'py': return <Code2 {...iconProps} className={`${iconProps.className} text-blue-500`} />;
        case 'js': case 'jsx': case 'ts': case 'tsx': return <Code2 {...iconProps} className={`${iconProps.className} text-yellow-400`} />;
        case 'md': return <FileText {...iconProps} className={`${iconProps.className} text-green-400`} />;
        case 'json': return <FileJson {...iconProps} className={`${iconProps.className} text-orange-400`} />;
        case 'csv': case 'xlsx': case 'xls': return <BarChart3 {...iconProps} className={`${iconProps.className} text-green-500`} />;
        case 'docx': case 'doc': return <FileText {...iconProps} className={`${iconProps.className} text-blue-600`} />;
        case 'pdf': return <FileText {...iconProps} className={`${iconProps.className} text-purple-400`} />;
        case 'pptx': return <FileText {...iconProps} className={`${iconProps.className} text-red-500`} />;
        case 'tex': return <FileText {...iconProps} className={`${iconProps.className} text-yellow-500`} />;
        default: return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
    }
};
