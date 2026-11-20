'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {state,availableCost}=require('../inventory-core.js');
const db=(purchases=[],sales=[],deliveries=[],adjustments=[])=>({purchases,sales,deliveries,adjustments});
test('sold-out old stock does not dilute the cost of a later purchase',()=>{
 const d=db([{id:'p1',product:'x',qty:100,baseTotal:100000,date:'2026-01-01'},{id:'p2',product:'x',qty:100,baseTotal:200000,date:'2026-02-01'}],[{id:'s1',product:'x',qty:100,date:'2026-01-15'}]);
 const st=state(d,'x');assert.equal(st.lots.reduce((n,l)=>n+l.qty,0),100);assert.equal(st.lots[0].unitCost,2000);
});
test('FIFO consumes the oldest batch first',()=>{
 const d=db([{id:'p1',product:'x',qty:10,baseTotal:1000,date:'2026-01-01'},{id:'p2',product:'x',qty:10,baseTotal:2000,date:'2026-01-02'}],[{id:'s1',product:'x',qty:12,date:'2026-01-03'}]);
 const st=state(d,'x');assert.equal(st.lots.reduce((n,l)=>n+l.qty,0),8);assert.equal(st.lots[0].unitCost,200);
});
test('delivery is included in the purchase batch cost',()=>{
 const d=db([{id:'p1',product:'x',qty:10,baseTotal:1000,date:'2026-01-01'}],[],[{id:'d1',purchaseId:'p1',amount:500}]);
 assert.equal(state(d,'x').lots[0].unitCost,150);
});
test('write-off reduces stock and leaves the correct remaining layer',()=>{
 const d=db([{id:'p1',product:'x',qty:10,baseTotal:1000,date:'2026-01-01'}],[],[],[{id:'a1',product:'x',type:'writeoff',qty:3,date:'2026-01-02',cost:300,unitCost:100}]);
 assert.equal(state(d,'x').lots.reduce((n,l)=>n+l.qty,0),7);
});
test('restocked customer return is added after the original sale',()=>{
 const d=db([{id:'p1',product:'x',qty:5,baseTotal:500,date:'2026-01-01'}],[{id:'s1',product:'x',qty:3,date:'2026-01-02'}],[],[{id:'r1',product:'x',type:'return',qty:1,date:'2026-01-02',saleId:'s1',unitCost:100,restock:true}]);
 assert.equal(state(d,'x').lots.reduce((n,l)=>n+l.qty,0),3);
});
test('over-selling is exposed as a shortage',()=>{
 const d=db([{id:'p1',product:'x',qty:2,baseTotal:200,date:'2026-01-01'}],[{id:'s1',product:'x',qty:3,date:'2026-01-02'}]);
 assert.equal(state(d,'x').shortage,1);
 assert.equal(availableCost(d,'x',1).shortage,1);
});
