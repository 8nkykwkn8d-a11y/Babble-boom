'use strict';
(function(root){
 function consumeLots(lots,qty){let left=qty,cost=0;for(const lot of lots){if(left<=1e-9)break;const take=Math.min(lot.qty,left);lot.qty-=take;left-=take;cost+=take*lot.unitCost;}return {cost,shortage:Math.max(0,left)}}
 function state(db,productId,excludedPurchaseId=''){
  const deliveryTotals=new Map();
  (db.deliveries||[]).forEach(d=>{const id=d.purchaseId||d.purchase;if(id)deliveryTotals.set(id,(deliveryTotals.get(id)||0)+(Number(d.amount)||0))});
  const events=[];
  (db.purchases||[]).filter(p=>p.product===productId&&p.id!==excludedPurchaseId).forEach(p=>{const qty=Number(p.qty)||0,total=(Number(p.baseTotal??p.total)||0)+(deliveryTotals.get(p.id)||0);events.push({date:p.date||'',order:0,type:'add',qty,unitCost:qty>0?total/qty:0,id:p.id})});
  (db.sales||[]).filter(s=>s.product===productId).forEach(s=>events.push({date:s.date||'',order:1,type:'sale',qty:Number(s.qty)||0,id:s.id}));
  (db.adjustments||[]).filter(a=>a.product===productId).forEach(a=>events.push({date:a.date||'',order:a.type==='return'||a.type==='increase'?2:3,type:a.type,qty:Number(a.qty)||0,unitCost:Number(a.unitCost)||0,id:a.id}));
  events.sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.order-b.order);
  const lots=[];let shortage=0;
  for(const e of events){
   if(e.type==='add'||e.type==='increase'){lots.push({qty:e.qty,unitCost:e.unitCost,source:e.id});continue;}
   if(e.type==='return'){const a=(db.adjustments||[]).find(x=>x.id===e.id);if(!a||a.restock!==false)lots.push({qty:e.qty,unitCost:e.unitCost,source:e.id});continue;}
   if(e.type==='sale'||e.type==='writeoff'||e.type==='decrease'){const used=consumeLots(lots,e.qty);shortage+=used.shortage;}
  }
  return {lots:lots.filter(x=>x.qty>1e-9),shortage};
 }
 function availableCost(db,productId,qty){const lots=state(db,productId).lots.map(x=>({...x}));return consumeLots(lots,qty)}
 const api={state,availableCost};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.BBInventory=api;
})(typeof globalThis!=='undefined'?globalThis:this);
