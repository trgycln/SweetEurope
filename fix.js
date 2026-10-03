const fs = require('fs');
let content = fs.readFileSync('src/components/portal/siparisler/SiparislerClient.tsx', 'utf8');
content = content.replace(/toggleExpand\(siparis\.id, e as any\);/, 'handleRowClick(siparis.id);');
content = content.replace(/isExpanded \? 'bg-indigo-50\/50' : isPreOrder/g, `isPreOrder`);
content = content.replace(/onClick=\{\(e\) => toggleExpand\(siparis\.id, e\)\}/g, 'onClick={() => handleRowClick(siparis.id)}');
content = content.replace(/\{isExpanded \? <FiChevronDown size=\{16\} \/> : <FiChevronRight size=\{16\} \/>\}/g, '<FiChevronRight size={16} />');
fs.writeFileSync('src/components/portal/siparisler/SiparislerClient.tsx', content, 'utf8');
console.log('Fixed');
