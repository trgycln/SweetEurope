import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function dumpKategoriler() {
  const { data, error } = await supabase.from('kategoriler').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Build a tree
  const byId = {};
  data.forEach(c => byId[c.id] = { ...c, children: [] });
  
  const roots = [];
  data.forEach(c => {
    if (c.ust_kategori_id) {
      if(byId[c.ust_kategori_id]) {
          byId[c.ust_kategori_id].children.push(byId[c.id]);
      } else {
          roots.push(byId[c.id]);
      }
    } else {
      roots.push(byId[c.id]);
    }
  });
  
  function printTree(nodes, level = 0) {
    let out = '';
    nodes.forEach(n => {
      out += '  '.repeat(level) + `- ${n.ad?.tr} (${n.id})\n`;
      if (n.children.length > 0) {
        out += printTree(n.children, level + 1);
      }
    });
    return out;
  }
  
  const output = printTree(roots);
  console.log(output);
  fs.writeFileSync('scripts/kategoriler_tree.txt', output);
}

dumpKategoriler();
