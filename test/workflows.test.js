import test from 'node:test';
import assert from 'node:assert/strict';
import { due, seed, shift, today } from '../dist/seed.js';
import { applyChecklist, commitImport, csv, get, overdue, previewImport, restore, runJobs, sampleImport, saveFixture, saveRequest, saveTask, taskBuckets, visible } from '../dist/model.js';
import { dashboard, e, studentPage } from '../dist/view.js';

const taskForm = (task, changes) => ({...task,inherit:task.inherit?'on':'',...changes});
const fixtureForm = (fixture, changes) => ({...fixture,reviewed:fixture.reviewed?'on':'',...changes});

test('task visibility follows ownership, supporting responsibility and project membership', () => {
  const db = seed();
  const alex = visible(db,'tasks','alex');
  assert(alex.some(row=>row.id==='t-kit'));
  assert(!alex.some(row=>row.id==='t-private'));
  assert(!visible(db,'documents','jordan').some(row=>row.id==='d-camp'));
  assert.deepEqual(visible(db,'tasks','unauthorised'),[]);
  get(db,'users','alex').active=false;
  assert.deepEqual(visible(db,'fixtures','alex'),[]);
});

test('validates task transitions and preserves recorded completion when reopened', () => {
  const db=seed();
  let task=get(db,'tasks','t-venue');
  assert.throws(()=>saveTask(db,'alex',taskForm(task,{status:'Waiting'}),task.id,task.version),/waiting party/i);
  assert.throws(()=>saveTask(db,'alex',taskForm(task,{status:'Done'}),task.id,task.version),/completion/i);
  task=saveTask(db,'alex',taskForm(task,{status:'Waiting',waiting:'Venue coordinator',chase:due(1)}),task.id,task.version);
  assert.equal(task.waiting,'Venue coordinator');
  task=saveTask(db,'alex',taskForm(task,{status:'Done',completion:'Confirmed in the source.'}),task.id,task.version);
  assert(!overdue(task));
  assert(task.completed);
  assert(taskBuckets([task]).Completed.length===1);
  const stale=task.version;
  task=saveTask(db,'alex',taskForm(task,{status:'To do'}),task.id,task.version);
  assert(db.activity.some(item=>item.record===task.id&&item.description==='Confirmed in the source.'));
  assert.throws(()=>saveTask(db,'alex',taskForm(task,{next:'New plan'}),task.id,stale),/changed in another view/);
});

test('distinguishes Malaysia date buckets and avoids duplicate assignments', () => {
  const db=seed();
  const roster=get(db,'tasks','t-roster');
  assert.equal(roster.due,due(-2));
  assert(overdue(roster));
  assert(taskBuckets(db.tasks).Waiting.some(item=>overdue(item)));
  assert(taskBuckets(db.tasks)['Needs a date'].some(item=>item.id==='t-drills'));
  const task=saveTask(db,'mark',{title:'Fixture follow-up',next:'Check timings.',owner:'alex',area:'Operations',priority:'Normal',status:'To do',due:today()});
  saveTask(db,'alex',taskForm(task,{next:'Check the updated timings.'}),task.id,task.version);
  assert.equal(db.notifications.filter(item=>item.user==='alex'&&item.record===task.id).length,1);
});

test('fixture checklist is idempotent and material updates preserve fixed and completed tasks', () => {
  const db=seed();
  const fixture=get(db,'fixtures','f-athletics');
  const generated=applyChecklist(db,'mark',fixture.id);
  assert.equal(generated.length,5);
  assert.equal(applyChecklist(db,'mark',fixture.id).length,0);
  const completed=generated[0];
  completed.status='Done';
  const oldDeadline=completed.due;
  const fixed=get(db,'tasks','t-venue');
  const fixedDeadline=fixed.due;
  const date=shift(fixture.date,5);
  saveFixture(db,'mark',fixtureForm(fixture,{lead:'sam',date}),fixture.id);
  assert.equal(completed.owner,'alex');
  assert.equal(completed.due,oldDeadline);
  assert.equal(fixed.due,fixedDeadline);
  assert.equal(generated[1].owner,'sam');
  assert.equal(generated[1].due,shift(date,-db.settings.prep));
  const current=get(db,'fixtures',fixture.id);
  assert.throws(()=>saveFixture(db,'mark',fixtureForm(current,{status:'Cancelled'}),current.id),/cancellation reason/);
  saveFixture(db,'mark',fixtureForm(current,{status:'Cancelled',cancelReason:'Venue closed.',linkedAction:'cancel'}),current.id);
  assert.equal(generated[1].status,'Cancelled');
  assert.equal(completed.status,'Done');
});

test('import flags mapping issues, rejects invalid rows and keeps app edits on replay', () => {
  const db=seed();
  const sample=sampleImport();
  const preview=previewImport(db,sample);
  assert.deepEqual(preview.map(row=>row.result),['Accepted','Review','Rejected','Review']);
  assert.equal(commitImport(db,'mark',sample),3);
  assert.equal(commitImport(db,'mark',sample),0);
  const edited=db.tasks.find(row=>row.sourceId==='sample-task-01');
  edited.title='Updated after import';
  const later={...sample,batch:'sample-v2'};
  assert.match(previewImport(db,later)[0].detail,/Updated after import/);
  assert.equal(commitImport(db,'mark',later),0);
  assert.equal(edited.title,'Updated after import');
});

test('retrying recurring jobs and reminders produces unique records', () => {
  const db=seed();
  db.templates.push({id:'rec-1',title:'Check the facility',next:'Review the booking.',start:today(),owner:'alex',cadence:'Weekly',active:true});
  runJobs(db,'mark',true);
  assert.match(db.settings.jobs.failed,/failure/);
  runJobs(db,'mark');
  runJobs(db,'mark');
  assert.equal(db.settings.jobs.failed,'');
  assert.equal(db.tasks.filter(row=>row.recurrenceKey?.startsWith('rec-1:')).length,1);
  const keys=db.notifications.map(item=>item.user+':'+item.key);
  assert.equal(keys.length,new Set(keys).size);
});

test('request decisions create audit entries and exports retain meaningful links', () => {
  const db=seed();
  const request=saveRequest(db,'alex',{title:'Bibs',description:'Order replacement bibs.',priority:'Normal',category:'Equipment'});
  assert.throws(()=>saveRequest(db,'alex',{status:'Approved',decision:'Approved.'},request.id),/administrator/);
  saveRequest(db,'mark',{status:'Approved',decision:'Approved in the demo.'},request.id);
  assert(db.activity.some(event=>event.record===request.id&&event.action==='Request approved'));
  assert.deepEqual(restore(JSON.parse(JSON.stringify(db))),db);
  assert.match(csv([{title:'=formula',link:'f-athletics'}]),/"'=formula","f-athletics"/);
});

test('student screens use the curated schedule and no department task names', () => {
  const db=seed();
  const html=studentPage('student');
  assert.match(html,/District Athletics Meet/);
  assert.doesNotMatch(html,/Allocate a football lead coach|Review a coaching session outline/);
  assert.match(studentPage('student-results','Basketball'),/42–35 win/);
  assert.doesNotMatch(studentPage('student-results','Basketball'),/2nd overall/);
  assert.match(dashboard(db,'alex',{}),/Confirm athletics team roster/);
  assert.doesNotMatch(dashboard(db,'alex',{}),/Review a coaching session outline/);
  assert.equal(e('<img src=x>'),'&lt;img src=x&gt;');
});
