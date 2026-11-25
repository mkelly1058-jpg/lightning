import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const users = {
  admin:'10000000-0000-4000-8000-000000000001',
  alex:'10000000-0000-4000-8000-000000000002',
  jordan:'10000000-0000-4000-8000-000000000003',
  stranger:'10000000-0000-4000-8000-000000000004'
};

test('pilot migration enforces staff visibility, versioned updates and durable audit on PostgreSQL', async t => {
  const db = await PGlite.create();
  t.after(()=>db.close());

  // The stub supplies Supabase's roles and the identity normally set by its API after JWT validation.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to authenticated, anon;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261125000100_pilot_tasks.sql',import.meta.url),'utf8'));
  for (const [name,id] of Object.entries(users)) {
    await db.query('insert into auth.users values ($1)',[id]);
    if(name!=='stranger') await db.query('insert into public.staff_profiles (id,display_name,role) values ($1,$2,$3)',[id,name,name==='admin'?'admin':'staff']);
  }
  const assume = async (name, role = 'authenticated') => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[name] || '']);
    await db.exec('set role '+role);
  };
  const rows = async (sql,args) => (await db.query(sql,args)).rows;
  const create = (title,owner=null,deadline='2026-11-26',reason=null) =>
    rows('select * from public.create_staff_task($1,$2,$3,$4,$5,$6)',[title,'Confirm with the coach','Normal',deadline,reason,owner]);
  const status = (id,version,value,{party=null,chase=null,note=null}={}) =>
    rows('select * from public.update_staff_task_status($1,$2,$3,$4,$5,$6)',[id,version,value,party,chase,note]);

  await assume(null,'anon');
  await assert.rejects(create('Unauthenticated task'),{code:'42501'});
  await assert.rejects(rows('select * from public.staff_tasks'),{code:'42501'});
  await assume('stranger');
  assert.deepEqual(await rows('select * from public.staff_profiles'),[]);
  await assert.rejects(create('Uninvited task'),{code:'42501'});

  await assume('admin');
  const [assigned] = await create('Department booking',users.alex);
  await assume('jordan');
  const [privateTask] = await create('Private coaching note');
  assert.equal(privateTask.owner_id,users.jordan);
  assert.equal(privateTask.scope,'personal');
  assert.deepEqual(await rows('select * from public.staff_tasks where id = $1',[assigned.id]),[]);
  await assert.rejects(status(assigned.id,1,'In progress'),{code:'42501'});
  await assert.rejects(create('Falsely assigned',users.alex),{code:'42501'});

  await assume('alex');
  assert.deepEqual((await rows('select id from public.staff_tasks')).map(task=>task.id),[assigned.id]);
  await assert.rejects(rows("update public.staff_tasks set status = 'Done'"),{code:'42501'});
  await assert.rejects(rows("update public.staff_profiles set role = 'admin'"),{code:'42501'});
  await assert.rejects(create('Missing due date',null,null),{code:'23514'});
  await assert.rejects(status(assigned.id,1,'Waiting'),{code:'23514'});
  await assert.rejects(status(assigned.id,1,'Cancelled',{note:'Cancelled'}),{code:'42501'});
  const [waiting] = await status(assigned.id,1,'Waiting',{party:'Facilities',chase:'2026-11-26'});
  assert.equal(waiting.version,2);
  await assert.rejects(status(assigned.id,1,'In progress'),{code:'40001'});
  const [done] = await status(assigned.id,2,'Done',{note:'Booking confirmed'});
  assert.equal(done.version,3);
  const [reopened] = await status(assigned.id,3,'To do');
  assert.equal(reopened.outcome_note,null);
  assert.deepEqual(await rows('select * from public.staff_task_events'),[]);

  await assume('admin');
  const audit = await rows('select version,new_status,outcome_note from public.staff_task_events where task_id = $1 order by version',[assigned.id]);
  assert.deepEqual(audit.map(item=>item.new_status),['To do','Waiting','Done','To do']);
  assert.equal(audit[2].outcome_note,'Booking confirmed');
  assert.equal((await rows('select id from public.staff_tasks')).length,2);

  await db.exec('reset role');
  await db.query('update public.staff_profiles set active = false where id = $1',[users.alex]);
  await assume('alex');
  assert.deepEqual(await rows('select id from public.staff_tasks'),[]);
  await assert.rejects(status(assigned.id,4,'In progress'),{code:'42501'});
});
