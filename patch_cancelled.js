const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(/po.status !== 'Cancelled'/g, "po.status !== 'Rejected' && po.status !== 'Not Received'");

fs.writeFileSync('app/page.tsx', code);
