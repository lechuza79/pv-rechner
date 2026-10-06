// Isolated PostgreSQL contract check. Every test object is rolled back.
import {Client} from 'pg';
import assert from 'node:assert/strict';
import {VIDEO_EXPORT_SQL} from '../lib/video-export-sql';
async function main(){
 const client=new Client({connectionString:process.env.VIDEO_EXPORT_DATABASE_URL});
 await client.connect();
 try {
  await client.query('begin');
  await client.query('create schema video_auto_delivery_check');
  await client.query('set local search_path to video_auto_delivery_check, public');
  await client.query(VIDEO_EXPORT_SQL);
  await client.query(VIDEO_EXPORT_SQL);
  const call=async(name:string,p:object)=>(await client.query(`select ${name}($1::jsonb) as result`,[JSON.stringify(p)])).rows[0].result;
  const params={cache_key:'test-video',widget:'regional-race',ags:'06440',period:'current',data_version:'test',design_version:'test',max_queue:2,renders_per_day:1,email:'owner@example.org',email_hash:'owner-hash',token_hash:'delivery-token'};
  const created=await call('video_operator_create',params);
  assert.equal(created.result,'queued');
  const repeated=await call('video_operator_create',{...params,token_hash:'different-token'});
  assert.equal(repeated.job_id,created.job_id);
  let rows=(await client.query('select status,subscribe,confirmed_at,job_id from video_requests')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].status,'confirmed');assert.equal(rows[0].subscribe,false);assert.ok(rows[0].confirmed_at);
  await client.query("update video_requests set created_at=now()-interval '1 hour'");
  await call('video_operator_create',{...params,token_hash:'retry-click-token'});
  assert.equal((await client.query('select count(*)::int as n from video_requests')).rows[0].n,1);
  await client.query('update video_requests set created_at=now()');
  assert.deepEqual(await call('video_worker_wakeup',{}),{dispatch:true});
  assert.deepEqual(await call('video_worker_wakeup',{}),{dispatch:false});
  await client.query("update video_render_jobs set status='done',expires_at=now()+interval '1 day',object_path='test.mp4'");
  const pending=await call('video_pending_notifications',{});
  assert.equal(pending.length,1);assert.equal(pending[0].email,'owner@example.org');
  assert.equal((await call('video_pending_notifications',{})).length,0);
  await call('video_request_notified',{request_id:pending[0].request_id,download_hash:'download-token'});
  assert.equal((await call('video_pending_notifications',{})).length,0);
  rows=(await client.query('select email,status from video_requests')).rows;assert.equal(rows[0].email,null);assert.equal(rows[0].status,'delivered');
  assert.equal((await call('video_operator_create',params)).result,'ready');
  assert.equal((await call('video_pending_notifications',{})).length,0);
  assert.equal((await client.query('select count(*)::int as n from video_requests')).rows[0].n,1);
  assert.deepEqual(await call('video_worker_wakeup',{}),{dispatch:false});
  await client.query("update video_requests set created_at=now()-interval '1 hour'");
  await client.query("update video_render_jobs set expires_at=now()-interval '1 day'");
  assert.equal((await call('video_operator_create',{...params,token_hash:'renewed-token'})).result,'queued');
  assert.equal((await client.query("select count(*)::int as n from video_requests where status='confirmed'")).rows[0].n,1);
  console.log('PASS: automatic confirmed delivery, no subscription, dedupe, completed cache reuse, address cleanup, dispatch throttle, rerender expiry');
 }finally {await client.query('rollback');await client.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
