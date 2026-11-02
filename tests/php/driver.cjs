// All destructive fixture operations are restricted to this disposable Compose project.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'../..');
const localDocker=path.join(process.env.LOCALAPPDATA || '', 'Programs/DockerDesktop/resources/bin/docker.exe');
const executable=process.env.DOCKER || (fs.existsSync(localDocker)?localDocker:'docker');
function docker(args,options={}) {
  return (execFileSync(executable,['compose','-p','closetcue-php-qa','-f',path.join(__dirname,'compose.yaml'),...args],
    {cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024,...options}) || '').trim();
}
function sql(query) {
  return docker(['exec','-T','db','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --default-character-set=utf8mb4 -uroot -NB closetcue_retro_db'],{input:query});
}
function reset() {
  sql('DROP DATABASE closetcue_retro_db;\n'+fs.readFileSync(path.join(root,'sql/closetcue_db.sql'),'utf8'));
}
const webRoot='/var/www/html/project_2nd_try';
function photos() {docker(['exec','-T','web','sh','-c',`cp /sample-photos/*.jpg ${webRoot}/uploads/ && chown -R www-data:www-data ${webRoot}/uploads`]);}
function photoExists(filename) {
  if(!/^[-a-zA-Z0-9_.]+$/.test(filename))throw Error('Unsafe test photo name');
  return docker(['exec','-T','web','php','-r',`echo is_file('${webRoot}/uploads/${filename}') ? 'yes' : 'no';`])==='yes';
}
module.exports={docker,sql,reset,photos,photoExists,webRoot,root,base:'http://127.0.0.1:18083/project_2nd_try'};
