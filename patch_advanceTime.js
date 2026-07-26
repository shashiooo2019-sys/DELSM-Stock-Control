const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const targetStr = `  const advanceTime = (days: number) => {
    const currentDate = new Date(simulatedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split('T')[0];
    setSimulatedDate(newDateStr);
    
    // Check if any "Placed" or "In Transit" POs have now reached their delivery date
    // If so, we notify or auto-receive them
    let dbUpdated = false;
    const nextLocations = [...db.stockLocations];
    const nextPOs = db.purchaseOrders.map(po => {
      if ((po.status === 'Placed' || po.status === 'In Transit') && new Date(po.expected_delivery_date) <= currentDate) {
        dbUpdated = true;
        
        // Auto-receive stock and put in default location (Shelf 1 of their primary cupboard, or create new)
        const itemLocations = db.stockLocations.filter(loc => loc.article_number === po.article_number);
        if (itemLocations.length > 0) {
          // Add to first found cupboard/shelf
          const targetLoc = nextLocations.find(l => l.location_id === itemLocations[0].location_id);
          if (targetLoc) {
            targetLoc.quantity_at_location += po.order_quantity_units;
          }
        } else {
          // Create brand new location entry
          nextLocations.push({
            location_id: \`LOC-\${Date.now()}-\${Math.random().toString(36).substr(2, 4)}\`,
            article_number: po.article_number,
            cupboard_id: "Cupboard A",
            shelf_id: "Shelf 1",
            quantity_at_location: po.order_quantity_units
          });
        }

        // Add a stock taking log entry for the auto-receive event
        const masterItem = db.stockMaster.find(m => m.article_number === po.article_number);
        const actualCount = (itemLocations.reduce((sum, l) => sum + l.quantity_at_location, 0) || 0) + po.order_quantity_units;
        
        return {
          ...po,
          status: 'Received' as POStatus
        };
      }
      return po;
    });

    if (dbUpdated) {
      updateDb({
        ...db,
        purchaseOrders: nextPOs,
        stockLocations: nextLocations
      });
    }
  };`;

const replaceStr = `  const advanceTime = (days: number) => {
    const currentDate = new Date(simulatedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split('T')[0];
    setSimulatedDate(newDateStr);
  };`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('app/page.tsx', code);
