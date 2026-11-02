'use strict';
(async () => {
  const {api,card,date,showError,toast}=ClosetCue;
  const id=new URLSearchParams(location.search).get('id');
  const loading=document.getElementById('loading-state');
  const details=document.getElementById('detail-container');
  const error=document.getElementById('error-state');
  const set=(name,value)=>document.getElementById(name).textContent=value;
  try{
    if(!id || !/^\d+$/.test(id) || Number(id)<1)throw new Error('Select a garment from your closet to see its details.');
    const data=await api(`php/item_engine.php?id=${encodeURIComponent(id)}`);
    const item=data.item;
    document.title=`${item.garment_name} — ClosetCue`;
    set('breadcrumb-name',item.garment_name);set('detail-name',item.garment_name);set('detail-category',item.category);set('detail-color',`${item.color_name} (${item.color_family})`);set('detail-fabric',item.fabric);set('detail-occasion',item.occasion);set('detail-shelf',item.shelf_location);set('times-worn',item.times_worn);set('last-worn',date(item.last_worn));
    const image=document.getElementById('detail-img');image.src=item.image_path;image.alt=item.alt_text || item.garment_name;
    details.hidden=false;
    const recommendations=data.recommendations || [];
    document.getElementById('recommendations-section').hidden=false;
    document.getElementById('recommendations-grid').innerHTML=recommendations.map(rec=>card(rec,'recommendation')).join('');
    document.getElementById('no-recommendations').hidden=recommendations.length>0;
    const button=document.getElementById('btn-choose-today');
    const note=document.getElementById('event-note');
    const confirmation=document.getElementById('wear-confirmation');
    const deleteButton=document.getElementById('btn-delete-garment');
    const deleteDialog=document.getElementById('delete-dialog');
    const cancelDelete=document.getElementById('cancel-delete');
    const confirmDelete=document.getElementById('confirm-delete');
    const deleteError=document.getElementById('delete-error');
    let deleting=false;
    set('delete-garment-name',item.garment_name);
    deleteButton.addEventListener('click',()=>{
      deleteError.hidden=true;
      deleteDialog.showModal();
      cancelDelete.focus();
    });
    cancelDelete.addEventListener('click',()=>deleteDialog.close());
    deleteDialog.addEventListener('cancel',event=>{if(deleting)event.preventDefault();});
    deleteDialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      if(deleting){event.preventDefault();return;}
      if(event.shiftKey && document.activeElement===cancelDelete){event.preventDefault();confirmDelete.focus();}
      else if(!event.shiftKey && document.activeElement===confirmDelete){event.preventDefault();cancelDelete.focus();}
    });
    deleteDialog.addEventListener('close',()=>deleteButton.focus());
    confirmDelete.addEventListener('click',async()=>{
      if(deleting)return;
      deleting=true;confirmDelete.disabled=true;cancelDelete.disabled=true;
      confirmDelete.textContent='Deleting…';deleteError.hidden=true;
      try{
        await api('php/delete_garment.php',{method:'POST',body:new URLSearchParams({garment_id:String(item.id)})});
        window.location.replace('closet.html?deleted=1');
      }catch(err){
        showError(deleteError,err.message);
        deleting=false;confirmDelete.disabled=false;cancelDelete.disabled=false;
        confirmDelete.textContent='Delete garment';
        cancelDelete.focus();
      }
    });
    button.addEventListener('click',async()=>{
      const original=button.innerHTML;button.disabled=true;deleteButton.disabled=true;button.textContent='Logging your outfit…';confirmation.hidden=true;
      try{
        const body=new FormData();body.append('garment_id',item.id);body.append('event_note',note.value.trim() || 'Daily Wear');
        const result=await api('php/log_wear.php',{method:'POST',body});
        set('times-worn',result.total_wears);set('last-worn',date(result.last_worn));
        confirmation.className='feedback success';confirmation.textContent=result.message;confirmation.hidden=false;note.value='';
        toast('Outfit chosen. Your wear history is up to date.');
      }catch(err){confirmation.className='feedback error';showError(confirmation,err.message);}
      finally{button.disabled=false;deleteButton.disabled=false;button.innerHTML=original;}
    });
  }catch(err){error.hidden=false;error.querySelector('p').textContent=err.message;}
  finally{loading.hidden=true;}
})();
