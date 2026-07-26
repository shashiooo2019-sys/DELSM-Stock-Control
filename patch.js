const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(/Accept Stock/g, 'Accept Delivery');
code = code.replace(/Not Received\n *<\/button>/, 'Reject Delivery\n                                    </button>');

// change "Approve PO" back to "Place PO" in the Dashboard recommendations to avoid confusion
code = code.replace(/>\s*Approve PO\s*<\/button>/g, '>Place PO</button>');

fs.writeFileSync('app/page.tsx', code);
