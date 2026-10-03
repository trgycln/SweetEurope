const fs = require('fs');

function refactor() {
    let content = fs.readFileSync('src/components/portal/siparisler/SiparislerClient.tsx', 'utf8');

    // 1. Remove state variable
    content = content.replace('const [expandedId, setExpandedId] = useState<string | null>(null);', '');

    // 2. Replace toggleExpand
    const toggleFunc = `    const toggleExpand = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Tekli akordiyon: Açık olana tıklanırsa kapanır, başka birine tıklanırsa diğeri otomatik kapanıp yenisi açılır
        setExpandedId(prev => (prev === id ? null : id));
    };`;
    
    const handleRowClick = `    const handleRowClick = (siparisId: string) => {
        const url = isAdmin 
            ? \`/\${locale}/admin/operasyon/siparisler/\${siparisId}\` 
            : \`/\${locale}/portal/siparisler/\${siparisId}\`;
        router.push(url);
    };`;

    if (content.includes(toggleFunc)) {
        content = content.replace(toggleFunc, handleRowClick);
    } else {
        // Try replacing with different line endings
        content = content.replace(toggleFunc.replace(/\n/g, '\r\n'), handleRowClick);
    }

    // 3. Remove isExpanded variables
    content = content.replace(/const isExpanded = expandedId === siparis\.id;/g, '');

    // 4. Update onClick for desktop rows
    content = content.replace(/onClick=\{\(\) => toggleExpand\(siparis\.id\)\}/g, 'onClick={() => handleRowClick(siparis.id)}');

    // 5. Update desktop conditional classes
    const desktopClassesOld = `className={\`group border-b border-slate-100 transition-colors cursor-pointer
                                                            \${isExpanded ? 'bg-slate-50 shadow-sm relative z-10' 
                                                                : isPreOrder ? 'bg-amber-50/30 hover:bg-amber-50' 
                                                                : isPinned ? 'bg-amber-50/20 hover:bg-slate-50/80' : 'hover:bg-slate-50/80'}\`}`;
    
    const desktopClassesNew = `className={\`group border-b border-slate-100 transition-colors cursor-pointer
                                                            \${isPreOrder ? 'bg-amber-50/30 hover:bg-amber-50' 
                                                                : isPinned ? 'bg-amber-50/20 hover:bg-slate-50/80' : 'hover:bg-slate-50/80'}\`}`;
    
    content = content.replace(desktopClassesOld, desktopClassesNew);
    content = content.replace(desktopClassesOld.replace(/\n/g, '\r\n'), desktopClassesNew);

    // 6. Delete AnimatePresence block for desktop
    const startDesktop = '<AnimatePresence>';
    const endDesktop = '</AnimatePresence>';
    while (content.includes(startDesktop)) {
        const s = content.indexOf(startDesktop);
        const e = content.indexOf(endDesktop, s);
        if (s !== -1 && e !== -1) {
            content = content.slice(0, s) + content.slice(e + endDesktop.length);
        } else {
            break;
        }
    }

    // 7. Update mobile onClick
    const mobileDivOld = `<div onClick={() => toggleExpand(siparis.id)} className="p-4 flex flex-col gap-3 cursor-pointer">`;
    const mobileDivNew = `<div onClick={(e) => { if ((e.target as HTMLElement).closest('button, a')) return; handleRowClick(siparis.id); }} className="p-4 flex flex-col gap-3 cursor-pointer">`;
    content = content.replace(new RegExp(mobileDivOld.replace(/[.*+?^$\{key\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), mobileDivNew);

    // 8. Update mobile conditional classes
    const mobileClassesOld = `className={\`rounded-xl border transition-all overflow-hidden relative \${
                                            isExpanded 
                                                ? 'bg-white border-slate-900 shadow-lg' 
                                                : isPreOrder`;
    const mobileClassesNew = `className={\`rounded-xl border transition-all overflow-hidden relative \${
                                            isPreOrder`;
    content = content.replace(mobileClassesOld, mobileClassesNew);
    content = content.replace(mobileClassesOld.replace(/\n/g, '\r\n'), mobileClassesNew);

    // 9. Remove mobile isExpanded block
    // We can do this by finding '{isExpanded && (' and finding the matching closing brace.
    let searchIdx = 0;
    while (true) {
        let blockStart = content.indexOf('{isExpanded && (', searchIdx);
        if (blockStart === -1) break;
        
        let braceCount = 0;
        let blockEnd = -1;
        for (let i = blockStart; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    blockEnd = i + 1;
                    break;
                }
            }
        }
        
        if (blockEnd !== -1) {
            content = content.slice(0, blockStart) + content.slice(blockEnd);
        } else {
            searchIdx = blockStart + 1;
        }
    }

    // Fix imports
    content = content.replace(/, AnimatePresence /g, ' ');
    content = content.replace(/AnimatePresence, /g, '');
    
    fs.writeFileSync('src/components/portal/siparisler/SiparislerClient.tsx', content, 'utf8');
}

try {
    refactor();
    console.log("Success");
} catch(e) {
    console.error(e);
}
