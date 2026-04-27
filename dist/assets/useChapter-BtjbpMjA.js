import{k as b,N as x,v as o,i as $,s as d}from"./index-CJxqModz.js";import{c as p}from"./dao-CcZm2zTS.js";import{m as w}from"./prompts-MY42pIHf.js";function L(){const m=b(),v=d(null),l=d([]),r=d(!1),n=d(null),h=async(t,e)=>{r.value=!0,n.value=null;try{const a=await p.getByNovelIdAndChapterNumber(t,e);return a?(v.value=a,a):(o.error("章节不存在"),null)}catch(a){return n.value=a.message,o.error("加载章节失败"),null}finally{r.value=!1}},u=async t=>{r.value=!0,n.value=null;try{const e=await p.getByNovelId(t);return l.value=e.sort((a,s)=>a.chapterNumber-s.chapterNumber),l.value}catch(e){return n.value=e.message,o.error("加载章节失败"),[]}finally{r.value=!1}},c=async(t,e=3)=>{try{return await p.getRecentChapters(t,e)}catch(a){return console.error("获取最近章节失败:",a),[]}},i=async(t,e=100)=>{try{return await p.getChapterSummaries(t,e)}catch(a){return console.error("获取章节摘要失败:",a),[]}},g=async(t,e=null)=>{var a;r.value=!0,n.value=null;try{const s={...t,volumeName:t.volumeName||e&&((a=w(t.chapterNumber,e))==null?void 0:a.name)||"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},N=await p.add(s);return o.success("章节保存成功！"),N}catch(s){return n.value=s.message,o.error("保存章节失败："+s.message),null}finally{r.value=!1}},f=async(t,e)=>{r.value=!0,n.value=null;try{return await p.update(t,{...e,updatedAt:new Date().toISOString()}),o.success("保存成功"),!0}catch(a){return n.value=a.message,o.error("保存失败："+a.message),!1}finally{r.value=!1}},y=(t,e)=>{x.confirm({title:"确认删除",content:"确定要删除这一章吗？删除后将无法恢复。",okText:"确定",cancelText:"取消",onOk:async()=>{try{await p.deleteCascade(t),o.success("删除成功"),e==null||e()}catch{o.error("删除失败")}}})},C=$(()=>{var t;return(t=l.value)!=null&&t.length?Math.max(...l.value.map(e=>Number(e.chapterNumber)||0))+1:1});return{chapter:v,chapters:l,loading:r,error:n,nextChapterNumber:C,loadChapter:h,loadChapters:u,getRecentChapters:c,getChapterSummaries:i,createChapter:g,updateChapter:f,deleteChapter:y,getPrevNextChapter:t=>{var a;if(!((a=l.value)!=null&&a.length))return{prev:null,next:null};const e=l.value.findIndex(s=>s.chapterNumber===t);return{prev:e>0?l.value[e-1].chapterNumber:null,next:e>=0&&e<l.value.length-1?l.value[e+1].chapterNumber:null}},goToChapter:(t,e)=>{m.push(`/novel/${t}/chapter/${e}`)},goToCreate:t=>{m.push(`/novel/${t}/chapter/create`)}}}function S(){const m=r=>{const n=`第${r.chapterNumber}章 ${r.title}

${r.content}`;l(n,`第${r.chapterNumber}章_${r.title}.txt`),o.success("导出成功")},v=(r,n,h="txt")=>{var c;let u=`${r.title}

`;u+=`${r.description}

`,u+=`风格：${((c=r.style)==null?void 0:c.join("、"))||""}

`,u+=`---

`,n.forEach(i=>{u+=`第${i.chapterNumber}章 ${i.title}

`,u+=`${i.content}

`,u+=`---

`}),l(u,`${r.title}.${h}`),o.success("导出成功")},l=(r,n)=>{const h=new Blob([r],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(h),c=document.createElement("a");c.href=u,c.download=n,c.click(),URL.revokeObjectURL(u)};return{exportChapter:m,exportNovel:v,downloadFile:l}}export{S as a,L as u};
