import{a as d,f,p as m,o as C}from"./dao-CcZm2zTS.js";import{u as v}from"./novelBible-hbe0xikR.js";function x(t,r){var o;return[{role:"system",content:`你是一位专业的小说编辑，擅长提取章节的关键信息并生成结构化摘要。请仔细分析章节内容，提取以下信息：

1. 关键事件：本章发生的主要事件
2. 角色变化：角色的状态、关系、能力变化
3. 伏笔：埋设的新伏笔和回收的旧伏笔
4. 时间线：故事发生的时间、地点、持续时间
5. 世界观扩展：新出现的地点、概念、物品
6. 情感弧线：本章的情感走向
7. 下章暗示：为下章埋下的悬念或铺垫`},{role:"user",content:`【小说信息】
书名：${r.title}
风格：${(o=r.style)==null?void 0:o.join("、")}

【章节信息】
章节号：第${t.chapterNumber}章
标题：${t.title}

【章节内容】
${t.content}

请按以下JSON格式返回结构化摘要：
{
  "keyEvents": [
    "关键事件1",
    "关键事件2"
  ],
  "characterChanges": [
    {
      "character": "角色名",
      "change": "变化描述",
      "type": "status|relationship|ability"
    }
  ],
  "foreshadowing": {
    "planted": [
      {
        "content": "伏笔内容",
        "relatedTo": "相关角色或剧情",
        "importance": "high|medium|low"
      }
    ],
    "resolved": [
      {
        "content": "回收的伏笔内容",
        "plantedIn": "埋设章节"
      }
    ]
  },
  "timeline": {
    "time": "故事时间（如：修炼第3年春季）",
    "location": "主要地点",
    "duration": "持续时间"
  },
  "worldBuilding": {
    "newLocations": ["新地点1"],
    "newConcepts": ["新概念1"],
    "newItems": ["新物品1"]
  },
  "emotionalArc": "本章情感走向（如：紧张→希望→惊喜）",
  "nextChapterHints": ["下章暗示1"],
  "plainSummary": "简短摘要（50-100字）"
}

只返回JSON，不要其他文字。`}]}async function P(t){var g,w,y;const{novel:r,chapter:o,callAI:i}=t,{id:c,content:a,chapterNumber:u}=o,l=r.id,e={structuredSummary:{success:!1,error:null},foreshadowingExtract:{success:!1,error:null,count:0},characterAppearance:{success:!1,error:null,count:0},characterStatus:{success:!1,error:null},foreshadowingResolution:{success:!1,error:null,count:0},timeline:{success:!1,error:null,count:0},characterChanges:{success:!1,error:null,count:0},newForeshadowing:{success:!1,error:null,count:0},novelBible:{success:!1,error:null}};let s=null;try{const n=x({content:a,chapterNumber:u,title:o.title||""},r),h=await i(n);if(h){const p=h.match(/\{[\s\S]*\}/);p&&(s=N(JSON.parse(p[0])),e.structuredSummary.success=!0)}}catch(n){e.structuredSummary.error=n.message,console.warn("生成结构化摘要失败:",n)}try{const n=await S(a,c,l,i,o.title,u);n.length>0?(e.foreshadowingExtract.success=!0,e.foreshadowingExtract.count=n.length):e.foreshadowingExtract.success=!0}catch(n){e.foreshadowingExtract.error=n.message,console.warn("提取伏笔失败:",n)}try{const n=await I(a,c,l);n.length>0?(e.characterAppearance.success=!0,e.characterAppearance.count=n.length):e.characterAppearance.success=!0}catch(n){e.characterAppearance.error=n.message,console.warn("更新角色出场记录失败:",n)}try{await E(a,l),e.characterStatus.success=!0}catch(n){e.characterStatus.error=n.message,console.warn("更新角色状态失败:",n)}try{const n=await A(a,l,c,u);n.length>0?(e.foreshadowingResolution.success=!0,e.foreshadowingResolution.count=n.length):e.foreshadowingResolution.success=!0}catch(n){e.foreshadowingResolution.error=n.message,console.warn("检查伏笔回收失败:",n)}try{const n=await B(a,c,u,l);n>0?(e.timeline.success=!0,e.timeline.count=n):e.timeline.success=!0}catch(n){e.timeline.error=n.message,console.warn("记录时间线事件失败:",n)}if(((g=s==null?void 0:s.characterChanges)==null?void 0:g.length)>0){let n=0;for(const h of s.characterChanges)try{h.characterId&&(await d.update(h.characterId,{notes:h.change}),n++)}catch(p){console.warn("更新角色变化失败:",p)}e.characterChanges.success=!0,e.characterChanges.count=n}else e.characterChanges.success=!0;if(((y=(w=s==null?void 0:s.foreshadowing)==null?void 0:w.planted)==null?void 0:y.length)>0){let n=0;for(const h of s.foreshadowing.planted)try{h.content&&(await f.add({novelId:l,content:h.content,chapterId:c,importance:h.importance||"medium",relatedCharacters:h.relatedTo?[h.relatedTo]:[],status:"pending"}),n++)}catch(p){console.warn("创建伏笔记录失败:",p)}e.newForeshadowing.success=!0,e.newForeshadowing.count=n}else e.newForeshadowing.success=!0;try{await v(l,{id:c,chapterNumber:u,title:o.title||"",content:a},s),e.novelBible.success=!0}catch(n){e.novelBible.error=n.message,console.warn("更新小说圣经失败:",n)}return e}async function S(t,r,o,i,c,a){try{const u=await d.getByNovelId(o),l=R(t,c||"",a||0,u),e=await i(l);return F(e)}catch{return[]}}async function I(t,r,o){const i=await d.getByNovelId(o),c=[];for(const a of i){const u=a.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),l=new RegExp(u,"g"),e=t.match(l);if(e&&e.length>0){const s=b(t,a.name);await d.addAppearance(a.id,r,s),c.push({id:a.id,name:a.name,appearanceCount:e.length,events:s})}}return c}async function E(t,r){const o=await d.getByNovelId(r);for(const i of o){if(!t.includes(i.name))continue;const c=i.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),a={},u=[/来到[了]?([^，。！？]{2,10})/,/到达[了]?([^，。！？]{2,10})/,/出现在([^，。！？]{2,10})/,/身处([^，。！？]{2,10})/];for(const e of u){const s=t.match(new RegExp(c+e.source));if(s){a.location=s[1];break}}const l=[{regex:/受伤|负伤|重伤/,condition:"受伤"},{regex:/恢复|痊愈|康复/,condition:"正常"},{regex:/死亡|牺牲|陨落/,condition:"死亡"},{regex:/突破|晋升|进阶/,condition:"突破"}];for(const{regex:e,condition:s}of l)if(new RegExp(c+e.source).test(t)){a.condition=s;break}Object.keys(a).length>0&&await d.updateStatus(i.id,a)}}async function A(t,r,o,i){const c=await f.getPending(r),a=[];for(const u of c){if(u.chapterId===o)continue;const l=u.keywords||k(u.content);if(l.length===0)continue;l.filter(s=>t.includes(s)).length/l.length>=.5&&(await f.markResolved(u.id,o,i),a.push(u))}return a}async function B(t,r,o,i){let c=await m.getMainPlotLine(i);if(!c){const e=await m.add({novelId:i,name:"主线剧情",type:"main",description:"小说主线剧情",color:"#1890ff",order:0});c=await m.getById(e)}const a=await d.getByNovelId(i),u=t.split(/[。！？\n]+/).filter(e=>e.trim().length>10);let l=0;for(const e of u.slice(0,5))a.some(g=>e.includes(g.name))&&(await C.add({plotLineId:c.id,chapterId:r,title:e.trim().slice(0,30)+"...",content:e.trim(),order:l,chapterNumber:o}),l++);return l}function N(t){var r,o,i,c,a,u,l,e;return{keyEvents:t.keyEvents||[],characterChanges:(t.characterChanges||[]).map(s=>({character:s.character||s.name,change:s.change||s.changes,type:s.type||"status"})),foreshadowing:{planted:(((r=t.foreshadowing)==null?void 0:r.planted)||[]).map(s=>({content:s.content||s,relatedTo:s.relatedTo||"",importance:s.importance||"medium"})),resolved:(((o=t.foreshadowing)==null?void 0:o.resolved)||[]).map(s=>({content:s.content||s,plantedIn:s.plantedIn||""}))},timeline:{time:((i=t.timeline)==null?void 0:i.time)||"",location:((c=t.timeline)==null?void 0:c.location)||"",duration:((a=t.timeline)==null?void 0:a.duration)||""},worldBuilding:{newLocations:((u=t.worldBuilding)==null?void 0:u.newLocations)||[],newConcepts:((l=t.worldBuilding)==null?void 0:l.newConcepts)||[],newItems:((e=t.worldBuilding)==null?void 0:e.newItems)||[]},emotionalArc:t.emotionalArc||"",nextChapterHints:t.nextChapterHints||[],plainSummary:t.plainSummary||""}}function b(t,r){const o=[],i=t.split(/[。！？\n]/);for(const c of i)if(c.includes(r)){const a=c.trim();a.length>5&&a.length<100&&o.push(a)}return o.slice(0,5)}function k(t){if(!t||typeof t!="string")return[];const r=[],o=t.match(/[一-龥]{2,4}/g)||[],i=["这是","那是","他的","她的","我的","这个","那个","但是","因为","所以","如果","虽然"];for(const c of o)!i.includes(c)&&!r.includes(c)&&r.push(c);return r.slice(0,5)}function R(t,r,o,i){const c=i.map(a=>a.name).join("、");return[{role:"system",content:"你是一个专业的小说伏笔分析师。分析章节内容，找出作者埋设的伏笔。每个伏笔需要包含：内容、类型、重要性、相关角色、关键词。"},{role:"user",content:JSON.stringify({content:t,title:r,chapterNumber:o,characters:c,format:{foreshadowings:[{content:"伏笔描述",type:"mystery|hint|promise|fate|identity|revenge|treasure|plot",importance:"high|medium|low",description:"详细说明",relatedCharacters:["角色名"],keywords:["关键词1","关键词2"]}]}})}]}function F(t){try{let r=t.trim();r.startsWith("```json")?r=r.slice(7):r.startsWith("```")&&(r=r.slice(3)),r.endsWith("```")&&(r=r.slice(0,-3));const o=JSON.parse(r.trim());return o.foreshadowings&&Array.isArray(o.foreshadowings)?o.foreshadowings:[]}catch{return[]}}export{P as p};
