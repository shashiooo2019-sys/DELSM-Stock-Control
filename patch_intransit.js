const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(/In Transit/g, 'Approved');
code = code.replace(/In Transit \/ Suppressed/g, 'Approved / Suppressed'); // Just in case it was part of a longer string, though the previous regex handles it.
code = code.replace(/po.status === 'Approved'/g, "po.status === 'Approved'"); // sanity check

fs.writeFileSync('app/page.tsx', code);
