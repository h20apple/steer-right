import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.10';
const db=createClient('https://kpxhkhdbfwiypiwwuati.supabase.co','sb_publishable_PWs1oRQWVz-5vBrJUqJacQ_QrB0IySW');
const $=id=>document.getElementById(id);
let staff=null;
const notice=s=>{$('adminNotice').textContent=s};
async function loadAdmin(){
 const {data:{user}}=await db.auth.getUser();
 staff=null;
 if(user){const {data,error}=await db.from('admin_profiles').select('role,display_name').eq('user_id',user.id).maybeSingle();if(!error&&data)staff={...data,email:user.email};}
 $('adminLogin').style.display=staff?'none':'block';$('adminDashboard').style.display=staff?'block':'none';
 if(!staff){notice(user?'This account is not authorised. Ask the Supabase project owner to add your user ID to admin_profiles.':'Sign in with an authorised Supabase account.');return;}
 $('adminIdentity').textContent=(staff.display_name||staff.email)+' · '+staff.role;
 notice('Signed in securely. All test orders remain unpaid.');
 await Promise.all([loadOrders(),loadProducts(),loadSettings()]);
}
$('adminLogin').addEventListener('submit',async e=>{e.preventDefault();notice('Signing in…');const {error}=await db.auth.signInWithPassword({email:$('adminEmail').value,password:$('adminPassword').value});if(error){notice(error.message);return;}$('adminPassword').value='';await loadAdmin();});
window.adminLogout=async()=>{await db.auth.signOut();await loadAdmin()};
window.saveDemoOrder=async order=>{
 if(!staff)return false;
 const {error}=await db.from('orders').insert(order);
 if(error){console.error('Test order save failed',error.message);return false;}
 await loadOrders();return true;
};
async function loadOrders(){
 const {data,error}=await db.from('orders').select('id,reference,customer_name,customer_email,specification,total_pence,status,payment_status,created_at').order('created_at',{ascending:false}).limit(100);
 const root=$('adminOrders');root.replaceChildren();
 if(error){root.textContent='Unable to load orders: '+error.message;return;}
 if(!data.length){root.textContent='No saved orders yet. Sign in as admin and place a test order.';return;}
 for(const o of data){
 const box=document.createElement('div');box.className='panel';box.style.margin='10px 0';
 const title=document.createElement('strong');title.textContent=o.reference+' · '+o.customer_name+' · £'+(o.total_pence/100).toFixed(2);box.append(title);
 const desc=document.createElement('p');desc.className='note';desc.textContent=o.customer_email+' | '+Object.values(o.specification||{}).join(' · ')+' | Payment: '+o.payment_status;box.append(desc);
 const select=document.createElement('select');
 for(const status of ['pending','confirmed','in_production','shipped','cancelled']){const opt=document.createElement('option');opt.value=status;opt.textContent=status.replaceAll('_',' ');opt.selected=status===o.status;select.append(opt);}
 select.addEventListener('change',async()=>{const {error}=await db.from('orders').update({status:select.value}).eq('id',o.id);if(error)alert(error.message);else await loadOrders()});box.append(select);root.append(box);
 }
}
async function loadProducts(){
 const {data,error}=await db.from('products').select('id,name,base_price_pence,active').order('name');
 const root=$('adminProducts');root.replaceChildren();if(error){root.textContent=error.message;return;}
 for(const p of data){
 const box=document.createElement('div');box.className='panel';box.style.margin='10px 0';
 const title=document.createElement('strong');title.textContent=p.name;box.append(title);
 const label=document.createElement('label');label.textContent='Price in GBP (demo display only)';box.append(label);
 const input=document.createElement('input');input.type='number';input.min='0';input.step='0.01';input.value=(p.base_price_pence/100).toFixed(2);box.append(input);
 const button=document.createElement('button');button.className='button';button.textContent='Save price';button.style.marginTop='10px';button.onclick=async()=>{const pounds=Number(input.value);if(!Number.isFinite(pounds)||pounds<0)return alert('Enter a valid price');const {error}=await db.from('products').update({base_price_pence:Math.round(pounds*100)}).eq('id',p.id);alert(error?error.message:'Price saved in Supabase. Live checkout pricing is not yet connected.')};box.append(button);root.append(box);
 }
}
async function loadSettings(){const {data}=await db.from('site_settings').select('value').eq('key','store_name').maybeSingle();if(data)$('storeName').value=data.value;}
window.saveStoreName=async()=>{if(!staff)return;const name=$('storeName').value.trim();if(!name)return alert('Enter a store name');const {error}=await db.from('site_settings').update({value:name,updated_at:new Date().toISOString()}).eq('key','store_name');alert(error?error.message:'Store name saved')};
db.auth.onAuthStateChange(()=>{setTimeout(loadAdmin,0)});
loadAdmin();
