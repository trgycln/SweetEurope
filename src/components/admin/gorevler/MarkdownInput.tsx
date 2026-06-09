'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function MarkdownInput({
    defaultValue,
    name,
    id,
}: {
    defaultValue: string;
    name: string;
    id: string;
}) {
    const [value, setValue] = useState(defaultValue);

    return (
        <div data-color-mode="light" className="rounded-lg border border-gray-300 overflow-hidden">
            <MDEditor
                value={value}
                onChange={(val) => setValue(val || '')}
                preview="edit"
                hideToolbar={false}
                height={300}
                textareaProps={{ placeholder: "Görev detayları (Markdown desteklenir)..." }}
                className="border-0 shadow-none"
            />
            {/* Bu gizli input ile form action'ına değeri gönderiyoruz */}
            <input type="hidden" name={name} id={id} value={value} />
        </div>
    );
}
