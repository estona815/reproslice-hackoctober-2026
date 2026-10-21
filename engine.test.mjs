import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELS,parseInput,evaluateModel,reduceAtoms,runReduction} from './engine.mjs';
test('conflict sample retains original identity and proves both deletions pass',()=>{
  const r=runReduction(MODELS.conflict.example,'conflict');
  assert.deepEqual(r.retained,[{id:1,text:'CACHE=on'},{id:2,text:'FRESH=required'}]);
  assert.equal(r.one_minimal_verified,true);assert.equal(r.global_minimum_claimed,false);
  assert(r.deletion_checks.every(x=>x.status==='PASS'));
  assert.equal(r.oracle_executions,r.trace.filter(x=>!x.cached).length);
});
test('dependency failure is retained but unresolved deletion forbids certification',()=>{
  const r=runReduction(MODELS.dependency.example,'dependency');
  assert.deepEqual(r.retained.map(x=>x.text),['HEADER=v1','USE=legacy','PLUGIN=v2']);
  assert.equal(r.preserves_target,true);assert.equal(r.one_minimal_verified,false);
  assert.equal(r.deletion_checks.find(x=>x.removed.text==='HEADER=v1').status,'UNRESOLVED');
});
test('ordered sequence retains order and duplicate lines have distinct IDs',()=>{
  const r=runReduction('OPEN\nOPEN\nnoise\nCOMMIT\nCLOSE','sequence');
  assert.deepEqual(r.retained.map(x=>x.text),['OPEN','COMMIT','CLOSE']);
  assert(r.retained[0].id===1||r.retained[0].id===2);assert.equal(r.retained[1].id,4);assert.equal(r.one_minimal_verified,true);
  assert.throws(()=>runReduction('CLOSE\nCOMMIT\nOPEN','sequence'),/does not reproduce/);
});
test('unrelated failure cannot replace selected target',()=>{
  const r=runReduction('OTHER_ERROR\nCACHE=on\nFRESH=required','conflict');
  assert.deepEqual(r.retained.map(x=>x.text),['CACHE=on','FRESH=required']);
  assert(r.trace.some(q=>q.signature==='E_UNRELATED'&&!q.preserves_target));
  assert.throws(()=>runReduction('OTHER_ERROR','conflict'),/does not reproduce/);
});
test('normalizes line endings, preserves spaces/blank identities and supplementary Unicode',()=>{
  assert.deepEqual(parseInput(' A\r\n\r😀'),[{id:1,text:' A'},{id:2,text:''},{id:3,text:'😀'}]);
  assert.deepEqual(runReduction('  CACHE=on  \r\nFRESH=required\r\n','conflict').retained,[{id:1,text:'  CACHE=on  '},{id:2,text:'FRESH=required'}]);
});
test('invalid bounds and malformed Unicode fail before a report',()=>{
  for(const x of ['', '  ', 'x'.repeat(20001), Array(129).fill('x').join('\n'),'\ud800','\udc00','\ud800x'])assert.throws(()=>parseInput(x));
  assert.throws(()=>runReduction('a','constructor'),/Unknown/);assert.throws(()=>evaluateModel('__proto__',[]),/Unknown/);
});
test('input atoms remain unchanged and IDs must be unique',()=>{
  const a=Object.freeze(parseInput('CACHE=on\nFRESH=required').map(x=>Object.freeze(x)));
  const original=JSON.stringify(a);reduceAtoms(a,x=>evaluateModel('conflict',x),'E_CACHE_FRESH');assert.equal(JSON.stringify(a),original);
  assert.throws(()=>reduceAtoms([{id:1,text:'a'},{id:1,text:'b'}],()=>({status:'FAIL',signature:'x'}),'x'),/unique/);
});
test('1-minimal result need not be globally smallest for a nonmonotone failure',()=>{
  const atoms=parseInput('a\nb\nc'),fails=xs=>xs.length===3||xs.length===1&&xs[0].text==='a';
  const r=reduceAtoms(atoms,x=>({status:fails(x)?'FAIL':'PASS',signature:fails(x)?'x':null}),'x');
  assert.equal(r.retained.length,3);assert.equal(r.one_minimal_verified,true);
  assert.equal(fails([atoms[0]]),true);assert.equal(r.global_minimum_claimed,false);
});
test('query budget and invalid oracle prevent a success result',()=>{
  assert.throws(()=>reduceAtoms(parseInput('a\nb'),()=>({status:'FAIL',signature:'x'}),'x',{maxQueries:0}),/budget/);
  assert.throws(()=>reduceAtoms(parseInput('a'),()=>({status:'UNKNOWN'}),'x'),/Invalid oracle/);
});
test('independent truth-table oracle verifies 512 deterministic nonmonotone cases',()=>{
  // Generate independent PASS/FAIL/UNRESOLVED/OTHER classifications for all proper
  // subsets of four atoms. Enumerate every subset separately to audit the result.
  // This does not mirror partition/sweep implementation.
  const atoms=parseInput('a\nb\nc\nd');let state=0x815,checked=0;
  const mask=xs=>xs.reduce((m,x)=>m|1<<(x.id-1),0);
  for(let iteration=0;iteration<512;iteration++){
    const table=Array.from({length:16},()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state>>>24)%4;});table[15]=1;
    const oracle=xs=>{const v=table[mask(xs)];return v===0?{status:'PASS',signature:null}:v===1?{status:'FAIL',signature:'target'}:v===2?{status:'UNRESOLVED',signature:null}:{status:'FAIL',signature:'other'};};
    const r=reduceAtoms(atoms,oracle,'target'),retainedMask=mask(r.retained);
    const subsets=[];for(let m=0;m<16;m++)if((m&retainedMask)===m)subsets.push({mask:m,outcome:table[m]});
    assert.equal(table[retainedMask],1);
    const deletions=subsets.filter(x=>r.retained.length-x.mask.toString(2).replace(/0/g,'').length===1);
    assert.equal(deletions.length,r.retained.length);assert(deletions.every(x=>x.outcome!==1));
    assert.equal(r.one_minimal_verified,deletions.every(x=>x.outcome===0));
    assert(r.trace.filter(x=>x.preserves_target).every(x=>table[x.line_ids.reduce((m,id)=>m|1<<(id-1),0)]===1));checked++;
  }
  assert.equal(checked,512);
});
test('sample reports are reproducible byte for byte with no timestamps',()=>{
  for(const [id,m]of Object.entries(MODELS))assert.equal(JSON.stringify(runReduction(m.example,id)),JSON.stringify(runReduction(m.example,id)));
});
