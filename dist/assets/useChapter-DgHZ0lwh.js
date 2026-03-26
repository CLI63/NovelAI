import{k as x,M as $,v as c,i as b,s as d}from"./index-qamwu5Lu.js";import{c as s}from"./dao-BSgh3Cze.js";function T(){const i=x(),v=d(null),l=d([]),t=d(!1),n=d(null),p=async(r,e)=>{t.value=!0,n.value=null;try{const a=await s.getByNovelIdAndChapterNumber(r,e);return a?(v.value=a,a):(c.error("章节不存在"),null)}catch(a){return n.value=a.message,c.error("加载章节失败"),null}finally{t.value=!1}},u=async r=>{t.value=!0,n.value=null;try{const e=await s.getByNovelId(r);return l.value=e.sort((a,m)=>a.chapterNumber-m.chapterNumber),l.value}catch(e){return n.value=e.message,c.error("加载章节失败"),[]}finally{t.value=!1}},o=async(r,e=3)=>{try{return await s.getRecentChapters(r,e)}catch(a){return console.error("获取最近章节失败:",a),[]}},h=async(r,e=100)=>{try{return await s.getChapterSummaries(r,e)}catch(a){return console.error("获取章节摘要失败:",a),[]}},g=async r=>{t.value=!0,n.value=null;try{const e={...r,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},a=await s.add(e);return c.success("章节保存成功！"),a}catch(e){return n.value=e.message,c.error("保存章节失败："+e.message),null}finally{t.value=!1}},f=async(r,e)=>{t.value=!0,n.value=null;try{return await s.update(r,{...e,updatedAt:new Date().toISOString()}),c.success("保存成功"),!0}catch(a){return n.value=a.message,c.error("保存失败："+a.message),!1}finally{t.value=!1}},y=(r,e)=>{$.confirm({title:"确认删除",content:"确定要删除这一章吗？删除后将无法恢复。",okText:"确定",cancelText:"取消",onOk:async()=>{try{await s.delete(r),c.success("删除成功"),e==null||e()}catch{c.error("删除失败")}}})},C=b(()=>{var r;return(r=l.value)!=null&&r.length?l.value.length+1:1});return{chapter:v,chapters:l,loading:t,error:n,nextChapterNumber:C,loadChapter:p,loadChapters:u,getRecentChapters:o,getChapterSummaries:h,createChapter:g,updateChapter:f,deleteChapter:y,getPrevNextChapter:r=>{var a;if(!((a=l.value)!=null&&a.length))return{prev:null,next:null};const e=l.value.findIndex(m=>m.chapterNumber===r);return{prev:e>0?l.value[e-1].chapterNumber:null,next:e>=0&&e<l.value.length-1?l.value[e+1].chapterNumber:null}},goToChapter:(r,e)=>{i.push(`/novel/${r}/chapter/${e}`)},goToCreate:r=>{i.push(`/novel/${r}/chapter/create`)}}}function k(){const i=t=>{const n=`第${t.chapterNumber}章 ${t.title}

${t.content}`;l(n,`第${t.chapterNumber}章_${t.title}.txt`),c.success("导出成功")},v=(t,n,p="txt")=>{var o;let u=`${t.title}

`;u+=`${t.description}

`,u+=`风格：${((o=t.style)==null?void 0:o.join("、"))||""}

`,u+=`---

`,n.forEach(h=>{u+=`第${h.chapterNumber}章 ${h.title}

`,u+=`${h.content}

`,u+=`---

`}),l(u,`${t.title}.${p}`),c.success("导出成功")},l=(t,n)=>{const p=new Blob([t],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(p),o=document.createElement("a");o.href=u,o.download=n,o.click(),URL.revokeObjectURL(u)};return{exportChapter:i,exportNovel:v,downloadFile:l}}export{k as a,T as u};
