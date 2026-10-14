// Production RPC definitions with local-only auth/hash stubs from the commons fixture.
const base=require('./commons-fixture.cjs'),fs=require('node:fs'),path=require('node:path');
module.exports=async()=>{const db=await base();await db.exec(`
create table rb_poll_state(id boolean primary key default true,closed boolean default false,closed_at timestamptz);insert into rb_poll_state(id) values(true);
create table rb_powerpoint_votes(voter_id uuid primary key,selected_dates date[] default '{}',updated_at timestamptz default now());
create table rb_poll_identities(voter_id uuid primary key references rb_powerpoint_votes,token_hash text,voter_name text,private_name boolean,public_id text default 'RB-'||substr(md5(gen_random_uuid()::text),1,8),updated_at timestamptz default now());
create table rb_contact_threads(id uuid primary key,access_hash text,client_id uuid,display_name text check(length(display_name)<=40),subject text check(length(subject) between 1 and 120),topic text,status text default 'open',admin_unread boolean default true,member_unread boolean default false,created_at timestamptz default now(),updated_at timestamptz default now());
create table rb_contact_messages(id uuid primary key default gen_random_uuid(),thread_id uuid references rb_contact_threads,sender text,body text,created_at timestamptz default now());
alter table rb_poll_identities enable row level security;alter table rb_contact_threads enable row level security;alter table rb_contact_messages enable row level security;
revoke all on rb_poll_identities,rb_contact_threads,rb_contact_messages from anon,authenticated;
`);await db.exec(fs.readFileSync(path.join(__dirname,'production-poll-chat.sql'),'utf8'));return db};
