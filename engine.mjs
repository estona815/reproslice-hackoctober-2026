// Independent implementation of complement reduction + explicit deletion audit.
// Delta debugging: Zeller & Hildebrandt, TSE 28(2), 2002. See README.
export const MODELS = Object.freeze({
  conflict: {name:'Conflicting flags', signature:'E_CACHE_FRESH', description:'CACHE=on and FRESH=required cannot be enabled together in this synthetic model.', example:'CACHE=on\nFRESH=required\nLOG=info\nPORT=8080\nRETRIES=3\nTHEME=dark\nREGION=demo\nWORKERS=2\nFORMAT=json\nTRACE=off\nTIMEOUT=20\nMODE=demo'},
  dependency: {name:'Required dependency', signature:'E_PLUGIN_VERSION', description:'HEADER=v1 is required to evaluate this model. Missing it yields UNRESOLVED, not a passing test.', example:'HEADER=v1\nLOG=info\nUSE=legacy\nPLUGIN=v2\nREGION=demo\nTRACE=off'},
  sequence: {name:'Exact sequence', signature:'E_SEQUENCE', description:'OPEN, COMMIT, CLOSE must occur in that order (other lines may occur between them).', example:'LOG=info\nOPEN\nPING\nCOMMIT\nTRACE=off\nCLOSE\nDONE'}
});
export function parseInput(text) {
  if(typeof text!=='string'||text.length>20000) throw new Error('Use at most 20,000 characters.');
  for(let i=0;i<text.length;i++) {
    const c=text.charCodeAt(i);
    if(c>=0xd800&&c<=0xdbff) {const next=text.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))throw new Error('Input contains an unpaired Unicode surrogate.');}
    else if(c>=0xdc00&&c<=0xdfff) throw new Error('Input contains an unpaired Unicode surrogate.');
  }
  if(!text.trim()) throw new Error('Enter a synthetic example or configuration lines.');
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  if(lines.length>128) throw new Error('Use at most 128 lines.');
  return lines.map((text,i)=>({id:i+1,text}));
}
export function evaluateModel(model,atoms) {
  if(!Object.hasOwn(MODELS,model)) throw new Error('Unknown failure model.');
  const lines=atoms.map(a=>a.text.trim()), has=x=>lines.includes(x);
  if(model==='dependency'&&!has('HEADER=v1'))return {status:'UNRESOLVED',signature:null};
  let fails=false;
  if(model==='conflict')fails=has('CACHE=on')&&has('FRESH=required');
  if(model==='dependency')fails=has('USE=legacy')&&has('PLUGIN=v2');
  if(model==='sequence'){let i=0;for(const s of lines)if(s===['OPEN','COMMIT','CLOSE'][i])i++;fails=i===3;}
  if(fails)return {status:'FAIL',signature:MODELS[model].signature};
  // An unrelated failure must never be accepted as the target reproducer.
  if(has('OTHER_ERROR'))return {status:'FAIL',signature:'E_UNRELATED'};
  return {status:'PASS',signature:null};
}
export function reduceAtoms(atoms,oracle,target,{maxQueries=20000}={}) {
  if(!Array.isArray(atoms)||atoms.length>128||!atoms.length)throw new Error('Expected 1–128 source lines.');
  if(new Set(atoms.map(a=>a.id)).size!==atoms.length)throw new Error('Source line IDs must be unique.');
  const trace=[], cache=new Map();let executed=0;
  const query=(xs,stage)=>{
    const key=JSON.stringify(xs.map(a=>a.id));let out=cache.get(key),cached=Boolean(out);
    if(!out){if(++executed>maxQueries)throw new Error('Query budget reached; no minimality claim produced.');out=oracle(xs);if(!out||!['PASS','FAIL','UNRESOLVED'].includes(out.status)||out.status==='FAIL'&&typeof out.signature!=='string')throw new Error('Invalid oracle response.');out={status:out.status,signature:out.signature??null};cache.set(key,out);}
    const preserves=out.status==='FAIL'&&out.signature===target;
    trace.push({query:trace.length+1,stage,line_ids:xs.map(a=>a.id),...out,preserves_target:preserves,cached});return {...out,preserves};
  };
  const initial=query(atoms,'baseline');
  if(!initial.preserves)throw new Error('Input does not reproduce the selected target failure. Load its example or keep the required lines.');
  let current=atoms.slice(), n=2;
  while(current.length>=2){
    const size=Math.ceil(current.length/n);let changed=false;
    for(let start=0;start<current.length;start+=size){
      const complement=current.filter((_,i)=>i<start||i>=start+size);
      if(query(complement,'partition').preserves){current=complement;n=Math.max(2,n-1);changed=true;break;}
    }
    if(!changed){if(n>=current.length)break;n=Math.min(current.length,n*2);}
  }
  // Explicit sweep guarantees no single removable atom remains, even for nonmonotone predicates.
  let changed=true;
  while(changed){changed=false;for(let i=0;i<current.length;i++){const xs=current.filter((_,j)=>i!==j);if(query(xs,'sweep').preserves){current=xs;changed=true;break;}}}
  const retained=query(current,'retained');
  const checks=current.map((removed,i)=>({removed:{...removed},...query(current.filter((_,j)=>i!==j),'deletion-audit')}));
  return {retained:current.map(a=>({...a})),target_signature:target,preserves_target:retained.preserves,one_minimal_verified:checks.every(x=>x.status==='PASS'),deletion_checks:checks,trace,oracle_executions:executed,global_minimum_claimed:false};
}
export function runReduction(text,model) {
  const atoms=parseInput(text);if(!Object.hasOwn(MODELS,model))throw new Error('Unknown failure model.');
  const result=reduceAtoms(atoms,x=>evaluateModel(model,x),MODELS[model].signature);
  return {schema:'reproslice-report/v1',engine:'reproslice-1.0.0',model,synthetic_only:true,normalization:'CRLF and CR converted to LF; spaces, blank lines and original line IDs preserved.',input:atoms,...result};
}
