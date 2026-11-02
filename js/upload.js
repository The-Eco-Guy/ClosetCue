'use strict';
(() => {
  const {api,escape,showError} = ClosetCue;
  const form=document.getElementById('add-garment-form');
  const fileInput=document.getElementById('garment_photo');
  const error=document.getElementById('error-container');
  const success=document.getElementById('success-container');
  const preview=document.getElementById('image-preview');
  const image=document.getElementById('preview-img');
  const placeholder=document.getElementById('photo-placeholder');
  let previewUrl;
  const fileError = file => !file ? 'Garment photo is required.' : !['image/jpeg','image/png','image/webp'].includes(file.type) ? 'Photo must be JPG, PNG, or WebP format.' : file.size>5*1024*1024 ? 'Photo must be no larger than 5 MB.' : '';
  fileInput.addEventListener('change',()=>{
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    preview.hidden=true;placeholder.hidden=false;image.removeAttribute('src');
    const file=fileInput.files[0];
    document.getElementById('file-name').textContent=file?.name || 'No photo selected';
    error.hidden=true;
    if (!file) return;
    const issue=fileError(file);
    if(issue){showError(error,issue);fileInput.setAttribute('aria-invalid','true');return;}
    fileInput.removeAttribute('aria-invalid');
    previewUrl=URL.createObjectURL(file);image.src=previewUrl;preview.hidden=false;placeholder.hidden=true;
  });
  form.addEventListener('input',event=>event.target.removeAttribute('aria-invalid'));
  form.addEventListener('submit',async event=>{
    event.preventDefault();error.hidden=true;success.hidden=true;
    const errors=[];
    const labels={garment_name:'Garment name',category:'Category',fabric:'Fabric',color_name:'Color name',color_family:'Color family',occasion:'Occasion',shelf_location:'Physical shelf location'};
    for(const [id,label] of Object.entries(labels)){
      const field=document.getElementById(id);
      if(!field.value.trim()){errors.push(`${label} is required.`);field.setAttribute('aria-invalid','true');}
      else field.removeAttribute('aria-invalid');
    }
    const issue=fileError(fileInput.files[0]);
    if(issue){errors.push(issue);fileInput.setAttribute('aria-invalid','true');}
    if(errors.length){error.innerHTML=`<strong>Please check these details:</strong><ul>${errors.map(msg=>`<li>${escape(msg)}</li>`).join('')}</ul>`;error.hidden=false;error.focus();return;}
    const button=form.querySelector('button[type="submit"]');const original=button.innerHTML;
    button.disabled=true;button.textContent='Adding your garment…';
    try{
      const data=await api('php/upload_garment.php',{method:'POST',body:new FormData(form)});
      success.textContent=`${data.message} Opening your closet…`;success.hidden=false;
      form.reset();if(previewUrl)URL.revokeObjectURL(previewUrl);
      window.location.assign('closet.html');
    }catch(err){showError(error,err.message);error.focus();button.disabled=false;button.innerHTML=original;}
  });
})();
