import {MODELS,runReduction} from './engine.mjs';
const $=id=>document.getElementById(id), input=$('input');
let result=null,downloadUrl=null;
const model=()=>document.querySelector('input[name="model"]:checked').value;
const numbers=()=>{$('line-numbers').textContent=input.value.split('\n').map((_,i)=>i+1).join('\n');};
const clearDownload=()=>{if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}$('download').removeAttribute('href');$('report').value='';$('report-section').hidden=true;};
function invalidate(message='Input changed. Run the reduction again.'){
  result=null;clearDownload();$('export').disabled=true;$('retained').textContent='Run a reduction to see retained source lines.';$('verdict-title').textContent='Awaiting reduction';$('verdict').textContent='The result and deletion checks will refer to the current input and selected model.';$('verdict').className='';$('counts').textContent='';$('checks').replaceChildren();const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent='No checks yet.';row.append(cell);$('checks').append(row);$('trace').replaceChildren();$('trace-count').textContent='';$('status').className='';$('status').textContent=message;numbers();
}
function row(table,values,classes=[]){const r=document.createElement('tr');for(let i=0;i<values.length;i++){const cell=document.createElement('td');cell.textContent=String(values[i]);cell.className=classes[i]??'';r.append(cell);}table.append(r);}
const label=o=>o.preserves_target?'TARGET_FAIL':o.status==='FAIL'?'OTHER_FAILURE':o.status;
function render(r){$('retained').textContent=r.retained.map(a=>`${String(a.id).padStart(3)}   ${a.text}`).join('\n')||'(empty input)';$('verdict-title').textContent='Preserves the target failure';$('verdict').textContent=r.one_minimal_verified?'1-minimal: every single-line deletion passed the model. This does not prove a globally smallest reproducer.':'Minimality unconfirmed: at least one deletion is unresolved or triggers another failure. These checks are not passes.';$('verdict').className=r.one_minimal_verified?'':'warning';$('counts').textContent=`${r.input.length} input lines → ${r.retained.length} retained · ${r.oracle_executions} oracle executions · ${r.target_signature}`;$('checks').replaceChildren();for(const c of r.deletion_checks)row($('checks'),[c.removed.id,c.removed.text,label(c)],['','code',c.status==='PASS'?'good':'other']);$('trace').replaceChildren();for(const q of r.trace)row($('trace'),[q.query,q.stage,q.line_ids.join(', ')||'∅',label(q),q.cached?'reused':'executed'],['','','code',q.preserves_target?'good':'','']);$('trace-count').textContent=`(${r.trace.length} observations)`;$('export').disabled=false;$('status').className='';$('status').textContent='Reduction complete. Deletion checks apply to this input and model.';}
$('load').addEventListener('click',()=>{input.value=MODELS[model()].example;invalidate('Example loaded. Run the reduction to compute its result.');});
input.addEventListener('input',()=>invalidate());input.addEventListener('scroll',()=>{$('line-numbers').scrollTop=input.scrollTop;});
for(const radio of document.querySelectorAll('input[name="model"]'))radio.addEventListener('change',()=>invalidate('Model changed. Load its example or reduce the current input.'));
$('reduce').addEventListener('click',()=>{invalidate('Reducing…');try{result=runReduction(input.value,model());render(result);}catch(e){$('status').className='error';$('status').textContent=e.message;}});
$('export').addEventListener('click',async()=>{
  if(!result)return;const snapshot=result;const payload=JSON.stringify(snapshot,null,2)+'\n';
  const bytes=new TextEncoder().encode(payload);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  if(result!==snapshot)return;clearDownload();downloadUrl=URL.createObjectURL(new Blob([payload],{type:'application/json;charset=utf-8'}));$('download').href=downloadUrl;$('download').download='reproslice-report.json';$('report').value=payload;$('report-hash').textContent=`SHA-256 of exact JSON bytes: ${hash}`;$('report-section').hidden=false;$('report-section').scrollIntoView({behavior:'auto',block:'start'});
});
input.value=MODELS.conflict.example;invalidate('Load an example, then reduce it. No result has been computed.');
