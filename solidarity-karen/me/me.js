(()=> {
const C=window.KAREN_SUPABASE,L=window.SOLIDARITY_LOCALES,$=id=>document.getElementById(id);
const RTL=new Set(L.rtl||[]);
let lang=localStorage.getItem("solidarity_lang")||((navigator.language||"en").split("-")[0]);
const TEXT={
en:{intro:"This private link lets you control how your supporter identity appears publicly.",history:"Your contribution record",privacy:"How should you appear?",anon:"Remain anonymous",anonHelp:"Your stable supporter ID stays public, but your name does not.",pub:"Show a name or alias",pubHelp:"You choose exactly what becomes public.",alias:"Public name or alias",save:"Save privacy choice",saving:"Saving…",saved:"Privacy preference saved.",needAlias:"Enter a public name or alias.",error:"Could not save.",invalid:"This private link is invalid or has expired."},
fr:{intro:"Ce lien privé vous permet de contrôler la manière dont votre identité de soutien apparaît publiquement.",history:"Votre historique de contribution",privacy:"Comment souhaitez-vous apparaître ?",anon:"Rester anonyme",anonHelp:"Votre identifiant de soutien reste public, mais pas votre nom.",pub:"Afficher un nom ou alias",pubHelp:"Vous choisissez exactement ce qui devient public.",alias:"Nom public ou alias",save:"Enregistrer la confidentialité",saving:"Enregistrement…",saved:"Préférence enregistrée.",needAlias:"Entrez un nom public ou alias.",error:"Impossible d’enregistrer.",invalid:"Ce lien privé est invalide ou expiré."},
de:{intro:"Über diesen privaten Link steuerst du, wie deine Unterstützeridentität öffentlich erscheint.",history:"Deine Beitragsübersicht",privacy:"Wie möchtest du erscheinen?",anon:"Anonym bleiben",anonHelp:"Deine stabile Unterstützer-ID bleibt öffentlich, dein Name nicht.",pub:"Name oder Alias anzeigen",pubHelp:"Du entscheidest genau, was öffentlich wird.",alias:"Öffentlicher Name oder Alias",save:"Privatsphäre speichern",saving:"Speichern…",saved:"Privatsphäre gespeichert.",needAlias:"Bitte einen öffentlichen Namen oder Alias eingeben.",error:"Speichern nicht möglich.",invalid:"Dieser private Link ist ungültig oder abgelaufen."},
es:{intro:"Este enlace privado te permite controlar cómo aparece públicamente tu identidad de apoyo.",history:"Tu historial de contribuciones",privacy:"¿Cómo quieres aparecer?",anon:"Permanecer anónimo",anonHelp:"Tu ID estable sigue siendo pública, pero tu nombre no.",pub:"Mostrar un nombre o alias",pubHelp:"Tú decides exactamente qué se hace público.",alias:"Nombre público o alias",save:"Guardar privacidad",saving:"Guardando…",saved:"Preferencia guardada.",needAlias:"Introduce un nombre público o alias.",error:"No se pudo guardar.",invalid:"Este enlace privado no es válido o ha caducado."},
it:{intro:"Questo link privato ti permette di controllare come appare pubblicamente la tua identità di sostenitore.",history:"Il tuo storico dei contributi",privacy:"Come vuoi apparire?",anon:"Rimanere anonimo",anonHelp:"Il tuo ID stabile resta pubblico, ma non il tuo nome.",pub:"Mostra un nome o alias",pubHelp:"Decidi esattamente cosa diventa pubblico.",alias:"Nome pubblico o alias",save:"Salva privacy",saving:"Salvataggio…",saved:"Preferenza salvata.",needAlias:"Inserisci un nome pubblico o alias.",error:"Impossibile salvare.",invalid:"Questo link privato non è valido o è scaduto."},
pt:{intro:"Este link privado permite controlar como a sua identidade de apoiador aparece publicamente.",history:"O seu histórico de contribuições",privacy:"Como pretende aparecer?",anon:"Permanecer anónimo",anonHelp:"O seu ID estável continua público, mas o seu nome não.",pub:"Mostrar nome ou alias",pubHelp:"Escolhe exatamente o que fica público.",alias:"Nome público ou alias",save:"Guardar privacidade",saving:"A guardar…",saved:"Preferência guardada.",needAlias:"Introduza um nome público ou alias.",error:"Não foi possível guardar.",invalid:"Este link privado é inválido ou expirou."},
nl:{intro:"Met deze privélink bepaal je hoe je supporteridentiteit openbaar verschijnt.",history:"Jouw bijdragegeschiedenis",privacy:"Hoe wil je verschijnen?",anon:"Anoniem blijven",anonHelp:"Je stabiele supporter-ID blijft openbaar, je naam niet.",pub:"Naam of alias tonen",pubHelp:"Jij kiest precies wat openbaar wordt.",alias:"Publieke naam of alias",save:"Privacy opslaan",saving:"Opslaan…",saved:"Voorkeur opgeslagen.",needAlias:"Voer een publieke naam of alias in.",error:"Opslaan mislukt.",invalid:"Deze privélink is ongeldig of verlopen."},
ar:{intro:"يتيح لك هذا الرابط الخاص التحكم في كيفية ظهور هوية دعمك علنًا.",history:"سجل مساهماتك",privacy:"كيف تريد أن تظهر؟",anon:"البقاء مجهولًا",anonHelp:"يبقى معرّف الداعم ثابتًا وعلنيًا، لكن اسمك لا يظهر.",pub:"إظهار اسم أو اسم مستعار",pubHelp:"أنت تختار بدقة ما يصبح علنيًا.",alias:"اسم علني أو اسم مستعار",save:"حفظ خيار الخصوصية",saving:"جارٍ الحفظ…",saved:"تم حفظ تفضيل الخصوصية.",needAlias:"أدخل اسمًا علنيًا أو اسمًا مستعارًا.",error:"تعذر الحفظ.",invalid:"هذا الرابط الخاص غير صالح أو انتهت صلاحيته."}
};
function tr(k){return (TEXT[lang]||TEXT.en)[k]||TEXT.en[k]||k}
function euro(v){try{return new Intl.NumberFormat(lang,{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v||0))}catch{return "€"+Math.round(Number(v||0))}}
function dateFmt(v){if(!v)return"—";try{return new Intl.DateTimeFormat(lang,{day:"numeric",month:"short",year:"numeric"}).format(new Date(String(v).slice(0,10)+"T12:00:00"))}catch{return String(v)}}
async function rpc(name,body={}){const r=await fetch(C.url+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:C.key},body:JSON.stringify(body)}),x=await r.text();if(!r.ok)throw Error(x||"request_failed");return x?JSON.parse(x):null}
function applyLanguage(){
 document.documentElement.lang=lang;document.documentElement.dir=RTL.has(lang)?"rtl":"ltr";
 $("portalIntro").textContent=tr("intro");
 document.querySelector(".history-card .section-head h2").textContent=tr("history");
 document.querySelector(".privacy-card .section-head h2").textContent=tr("privacy");
 const choices=document.querySelectorAll(".choice");choices[0].querySelector("strong").textContent=tr("anon");choices[0].querySelector("span").textContent=tr("anonHelp");choices[1].querySelector("strong").textContent=tr("pub");choices[1].querySelector("span").textContent=tr("pubHelp");
 $("alias").placeholder=tr("alias");$("saveBtn").textContent=tr("save")
}
function fillLanguages(){
 const sel=$("languageSelect");sel.replaceChildren();Object.entries(L.names||{}).forEach(([code,name])=>{const o=document.createElement("option");o.value=code;o.textContent=name;o.selected=code===lang;sel.append(o)})
}
function renderState(s){
 $("supporterId").textContent=s.supporterId||"S-????????";
 const h=$("history");h.replaceChildren();
 (s.history||[]).forEach(x=>{const row=document.createElement("div");row.className="history-row";const left=document.createElement("span"),amt=document.createElement("b");left.textContent=dateFmt(x.date)+" · "+x.status+" · "+(x.source||"manual");amt.textContent=(x.status==="refunded"?"−":"")+euro(Number(x.amountCents||0)/100);row.append(left,amt);h.append(row)});
 $("anonymousChoice").checked=!s.publicName;$("publicChoice").checked=!!s.publicName;$("alias").value=s.publicAlias||"";syncAlias()
}
function syncAlias(){$("alias").style.display=$("publicChoice").checked?"block":"none"}
async function load(){
 const token=new URLSearchParams(location.search).get("token");
 if(!token){$("status").textContent=tr("invalid");$("saveBtn").disabled=true;return}
 try{const s=await rpc("solidarity_consent_state",{p_token:token});renderState(s)}
 catch{$("status").textContent=tr("invalid");$("saveBtn").disabled=true}
}
$("anonymousChoice").onchange=syncAlias;$("publicChoice").onchange=syncAlias;
$("saveBtn").onclick=async()=>{
 const token=new URLSearchParams(location.search).get("token");if(!token)return;
 if($("publicChoice").checked&&!$("alias").value.trim()){$("status").textContent=tr("needAlias");return}
 $("status").textContent=tr("saving");
 try{await rpc("solidarity_consent_set",{p_token:token,p_public_name:$("publicChoice").checked,p_alias:$("publicChoice").checked?$("alias").value.trim():null});$("status").textContent=tr("saved");await load()}
 catch{$("status").textContent=tr("error")}
};
$("languageSelect").onchange=e=>{lang=e.target.value;localStorage.setItem("solidarity_lang",lang);applyLanguage();load()};
fillLanguages();applyLanguage();load();
})();