const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/lib/supabase/database.types.ts');

try {
    // Try reading as utf-8 first
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it looks like garbage (Mojibake)
    if (content.includes('硥潰瑲')) {
        console.log('Detected UTF-16 LE interpreted as UTF-8. Re-reading as utf-16le...');
        content = fs.readFileSync(filePath, 'utf16le');
    }

    // Write back as UTF-8
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully converted to UTF-8');
} catch (err) {
    console.error('Error:', err);
}
